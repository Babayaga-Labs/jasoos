/**
 * Migration script to move all existing stories from filesystem to Supabase
 *
 * Usage: npx tsx scripts/migrate-stories.ts
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key (not SSR client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

const BUCKET_NAME = 'story-assets';

interface StoryData {
  id: string;
  title: string;
  premise?: string;
  synopsis?: string;
  crimeType: string;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  victimParagraph?: string;
  timeline?: string[];
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
  scoring: {
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
  sceneImageUrl?: string;
  createdAt?: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
  age?: number;
  isGuilty?: boolean;
  isVictim?: boolean;
  personality?: {
    traits: string[];
    speechStyle: string;
    quirks: string[];
  };
  appearance?: {
    description: string;
    imagePrompt: string;
  };
  knowledge?: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  };
  statement?: string;
  secrets?: Array<{
    content: string;
    willingnessToReveal: string;
    revealCondition: string;
  }>;
  behaviorUnderPressure?: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  };
  relationships?: Record<string, string>;
  imageUrl?: string;
}

interface PlotPoint {
  id: string;
  description: string;
  points: number;
  revealedBy: string[];
  detectionHints: string[];
  category?: string;
  importance?: string;
}

async function uploadFile(
  localPath: string,
  storagePath: string
): Promise<string | null> {
  try {
    if (!fs.existsSync(localPath)) {
      console.log(`  File not found: ${localPath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(localPath);
    // Convert Buffer to Uint8Array for proper handling
    const uint8Array = new Uint8Array(fileBuffer);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, uint8Array, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error(`  Failed to upload ${storagePath}:`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    console.log(`  Uploaded: ${storagePath}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`  Error uploading ${localPath}:`, error);
    return null;
  }
}

async function migrateStory(storyId: string, storyDir: string): Promise<boolean> {
  console.log(`\nMigrating story: ${storyId}`);

  try {
    // Read story data
    const storyPath = path.join(storyDir, 'story.json');
    if (!fs.existsSync(storyPath)) {
      console.log(`  Skipping: story.json not found`);
      return false;
    }

    const storyData: StoryData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));

    // Read characters
    const charactersPath = path.join(storyDir, 'characters.json');
    let characters: Character[] = [];
    if (fs.existsSync(charactersPath)) {
      const charactersData = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
      characters = Array.isArray(charactersData) ? charactersData : charactersData.characters || [];
    }

    // Read plot points (clues)
    const plotPointsPath = path.join(storyDir, 'plot-points.json');
    let plotPoints: PlotPoint[] = [];
    let scoring = storyData.scoring || { minimumPointsToAccuse: 30, perfectScoreThreshold: 80 };
    if (fs.existsSync(plotPointsPath)) {
      const ppData = JSON.parse(fs.readFileSync(plotPointsPath, 'utf-8'));
      plotPoints = ppData.plotPoints || [];
      scoring = {
        minimumPointsToAccuse: ppData.minimumPointsToAccuse || 30,
        perfectScoreThreshold: ppData.perfectScoreThreshold || 80,
      };
    }

    // Upload scene image
    const sceneImagePath = path.join(storyDir, 'assets', 'scene.png');
    let sceneImageUrl: string | null = null;
    if (fs.existsSync(sceneImagePath)) {
      sceneImageUrl = await uploadFile(sceneImagePath, `${storyId}/scene.png`);
    }

    // Upload character images and collect updated URLs
    const charactersWithUrls = await Promise.all(
      characters.map(async (char) => {
        const charImagePath = path.join(storyDir, 'assets', 'characters', `${char.id}.png`);
        let imageUrl = char.imageUrl;
        if (fs.existsSync(charImagePath)) {
          const uploadedUrl = await uploadFile(charImagePath, `${storyId}/characters/${char.id}.png`);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        }
        return { ...char, imageUrl };
      })
    );

    // Insert story
    console.log(`  Inserting story into database...`);
    const { error: storyError } = await supabase.from('stories').upsert({
      id: storyId,
      user_id: null,
      title: storyData.title,
      synopsis: storyData.synopsis || storyData.premise || '',
      crime_type: storyData.crimeType || 'murder',
      setting: storyData.setting || { location: 'Unknown', timePeriod: 'Modern', atmosphere: 'Mysterious' },
      victim_paragraph: storyData.victimParagraph || null,
      timeline: storyData.timeline || [],
      solution: storyData.solution,
      scoring,
      scene_image_url: sceneImageUrl,
      is_published: true,
      created_at: storyData.createdAt || new Date().toISOString(),
    });

    if (storyError) {
      console.error(`  Failed to insert story:`, storyError.message);
      return false;
    }

    // Delete existing characters and clues (for idempotent migration)
    await supabase.from('characters').delete().eq('story_id', storyId);
    await supabase.from('clues').delete().eq('story_id', storyId);

    // Insert characters
    if (charactersWithUrls.length > 0) {
      console.log(`  Inserting ${charactersWithUrls.length} characters...`);
      const characterRows = charactersWithUrls.map((char) => ({
        id: char.id,
        story_id: storyId,
        name: char.name,
        role: char.role,
        age: char.age || null,
        is_guilty: char.isGuilty || false,
        is_victim: char.isVictim || false,
        personality: char.personality || null,
        appearance: char.appearance || null,
        knowledge: char.knowledge || null,
        statement: char.statement || null,
        secrets: char.secrets || null,
        behavior_under_pressure: char.behaviorUnderPressure || null,
        relationships: char.relationships || null,
        image_url: char.imageUrl || null,
      }));

      const { error: charError } = await supabase.from('characters').insert(characterRows);
      if (charError) {
        console.error(`  Failed to insert characters:`, charError.message);
        return false;
      }
    }

    // Insert clues
    if (plotPoints.length > 0) {
      console.log(`  Inserting ${plotPoints.length} clues...`);
      const clueRows = plotPoints.map((pp) => ({
        id: pp.id,
        story_id: storyId,
        description: pp.description,
        points: pp.points || 10,
        revealed_by: pp.revealedBy || [],
        detection_hints: pp.detectionHints || [],
      }));

      const { error: clueError } = await supabase.from('clues').insert(clueRows);
      if (clueError) {
        console.error(`  Failed to insert clues:`, clueError.message);
        return false;
      }
    }

    console.log(`  Successfully migrated: ${storyData.title}`);
    return true;
  } catch (error) {
    console.error(`  Error migrating ${storyId}:`, error);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Story Migration to Supabase');
  console.log('='.repeat(60));

  // Verify environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL not set');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  console.log(`\nSupabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Read stories config
  const configPath = path.join(process.cwd(), 'stories.config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: stories.config.json not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const stories = config.stories.filter((s: any) => s.enabled && s.id !== '_template');

  console.log(`\nFound ${stories.length} enabled stories to migrate`);

  let successCount = 0;
  let failCount = 0;

  for (const story of stories) {
    const storyDir = path.join(process.cwd(), 'stories', story.id);
    if (fs.existsSync(storyDir)) {
      const success = await migrateStory(story.id, storyDir);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.log(`\nSkipping ${story.id}: directory not found`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${stories.length}`);
}

main().catch(console.error);
