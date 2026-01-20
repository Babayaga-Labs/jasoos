import { ScenarioCard } from '@/components/home/ScenarioCard';
import { CreateMysteryCard } from '@/components/home/CreateMysteryCard';
import { getPublishedStories } from '@/lib/supabase/queries';

interface Story {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  premise: string;
  sceneImage?: string;
}

async function getStories(): Promise<Story[]> {
  const storyRows = await getPublishedStories();

  return storyRows.map((row) => ({
    id: row.id,
    title: row.title,
    difficulty: 'medium', // Default difficulty
    estimatedMinutes: 30, // Default estimate
    premise: row.synopsis,
    sceneImage: row.scene_image_url || undefined,
  }));
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
          <CreateMysteryCard />
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
