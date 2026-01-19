'use client';

import { WizardLayout } from '@/components/create/wizard/WizardLayout';
import { useWizard } from '@/components/create/wizard/WizardContext';
import { PromptStage } from '@/components/create/stages/PromptStage';
import { FoundationStage } from '@/components/create/stages/FoundationStage';
import { CharactersStage } from '@/components/create/stages/CharactersStage';
import { CluesStage } from '@/components/create/stages/CluesStage';

function WizardContent() {
  const { state } = useWizard();

  switch (state.currentStage) {
    case 'prompt':
      return <PromptStage />;
    case 'foundation':
      return <FoundationStage />;
    case 'characters':
      return <CharactersStage />;
    case 'clues':
      return <CluesStage />;
    default:
      return <PromptStage />;
  }
}

export default function CreatePage() {
  return (
    <WizardLayout>
      <WizardContent />
    </WizardLayout>
  );
}
