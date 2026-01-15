'use client';

import { WizardLayout } from '@/components/create/wizard/WizardLayout';
import { useWizard } from '@/components/create/wizard/WizardContext';
import { StoryStage } from '@/components/create/stages/StoryStage';
import { CharactersStage } from '@/components/create/stages/CharactersStage';
import { CluesStage } from '@/components/create/stages/CluesStage';
import { WorldStage } from '@/components/create/stages/WorldStage';

function WizardContent() {
  const { state } = useWizard();

  switch (state.currentStage) {
    case 'story':
      return <StoryStage />;
    case 'characters':
      return <CharactersStage />;
    case 'clues':
      return <CluesStage />;
    case 'world':
      return <WorldStage />;
    default:
      return <StoryStage />;
  }
}

export default function CreatePage() {
  return (
    <WizardLayout>
      <WizardContent />
    </WizardLayout>
  );
}
