import { ScenarioCard } from '@/components/home/ScenarioCard';
import { CreateMysteryCard } from '@/components/create/CreateMysteryCard';
import fs from 'fs';
import path from 'path';

interface StoryConfig {
  id: string;
  enabled: boolean;
}

interface Story {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  premise: string;
}

async function getStories(): Promise<(Story & { sceneImage?: string })[]> {
  const storiesConfigPath = path.join(process.cwd(), 'stories.config.json');
  const storiesConfig = JSON.parse(fs.readFileSync(storiesConfigPath, 'utf-8'));

  const stories: (Story & { sceneImage?: string })[] = [];

  for (const config of storiesConfig.stories as StoryConfig[]) {
    if (!config.enabled) continue;

    const storyPath = path.join(process.cwd(), 'stories', config.id, 'story.json');

    if (fs.existsSync(storyPath)) {
      const story = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));

      // Check if scene image exists
      const sceneImagePath = path.join(process.cwd(), 'stories', config.id, 'assets', 'scene.png');
      const hasSceneImage = fs.existsSync(sceneImagePath);

      stories.push({
        ...story,
        // Use folder name (config.id) as the ID for routing, not story.id
        id: config.id,
        sceneImage: hasSceneImage ? `/stories/${config.id}/assets/scene.png` : undefined,
      });
    }
  }

  return stories;
}

export default async function HomePage() {
  const stories = await getStories();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-amber-400">Jhakaas</span> Jasoos
          </h1>
          <p className="text-xl text-slate-400 mb-2">
            AI-Powered Detective Game
          </p>
          <p className="text-slate-500">
            Interrogate suspects. Uncover evidence. Solve the mystery.
          </p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold mb-6 text-slate-200">
          Choose Your Case
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Your Own Mystery Card - always first */}
          <CreateMysteryCard />

          {/* Existing story cards */}
          {stories.map((story) => (
            <ScenarioCard
              key={story.id}
              id={story.id}
              title={story.title}
              difficulty={story.difficulty}
              estimatedMinutes={story.estimatedMinutes}
              premise={story.premise}
              sceneImage={story.sceneImage}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
