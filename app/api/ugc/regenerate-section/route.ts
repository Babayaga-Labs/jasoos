import { NextRequest, NextResponse } from 'next/server';
import {
  UGCEngine,
  loadAIConfig,
  UGCFormInput,
  UGCDraftState,
  EditableSection,
  RegenerateSectionResponse,
} from '@/packages/ai';

export const maxDuration = 60; // 1 minute for section regeneration

const VALID_SECTIONS: EditableSection[] = [
  'timeline',
  'characterKnowledge',
  'characterAlibis',
  'relationships',
  'clues',
  'solution',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, formInput, currentDraft } = body as {
      section: EditableSection;
      formInput: UGCFormInput;
      currentDraft: UGCDraftState;
    };

    // Validate section
    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate formInput
    if (!formInput) {
      return NextResponse.json(
        { error: 'formInput is required' },
        { status: 400 }
      );
    }

    // Validate currentDraft
    if (!currentDraft || !currentDraft.story || !currentDraft.characters) {
      return NextResponse.json(
        { error: 'currentDraft with story and characters is required' },
        { status: 400 }
      );
    }

    // Load AI config
    const config = loadAIConfig();
    if (!config.llm.apiKey) {
      return NextResponse.json(
        { error: 'LLM API key not configured' },
        { status: 500 }
      );
    }

    // Regenerate the section
    const ugcEngine = new UGCEngine(config);
    const regeneratedData = await ugcEngine.regenerateSection(
      section,
      formInput,
      currentDraft
    );

    const response: RegenerateSectionResponse = {
      section,
      data: regeneratedData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in regenerate-section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Regeneration failed' },
      { status: 500 }
    );
  }
}
