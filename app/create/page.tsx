'use client';

import { useEffect, useRef } from 'react';
import { WizardLayout } from '@/components/create/wizard/WizardLayout';
import { useWizard } from '@/components/create/wizard/WizardContext';
import { PromptStage } from '@/components/create/stages/PromptStage';
import { FoundationStage } from '@/components/create/stages/FoundationStage';
import { CharactersStage } from '@/components/create/stages/CharactersStage';
import { CluesStage } from '@/components/create/stages/CluesStage';
import { analytics } from '@/lib/analytics';

function WizardContent() {
  const { state } = useWizard();
  const hasTrackedRef = useRef(false);

  // Track create mystery started on first render
  useEffect(() => {
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      analytics.createMysteryStarted();
    }
  }, []);

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
