# UGC Pipeline Redesign - Implementation Plan (v2)

## Overview

Redesign the UGC pipeline to create **two distinct "magic moments"**:
1. **Prompt → Mystery Foundation** - The plot materializes from a simple premise
2. **Character Sketches → Living Characters** - Characters come to life with images, personalities, and secrets

Key changes:
- Remove "Crime Details" page (motive/method captured when marking culprit)
- Remove "World" stage (merged into Clue Review with "Generate Scene & Publish")
- Remove clue categories and color coding
- Clues are primary, timeline supports them (both editable)

---

## New User Flow (3 stages after prompt)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PROMPT PAGE                                                 │
│     User enters mystery premise                                 │
│     [Generate Foundation] button                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. MYSTERY FOUNDATION PAGE                                     │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Editable: Title & Synopsis                              │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Editable: Setting Tags (location, time period, crime)  │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Editable: Victim Paragraph                              │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Character Cards (minimal):                              │ │
│     │   - Name (editable)                                     │ │
│     │   - Role (editable)                                     │ │
│     │   - Connection hint (read-only, from AI)                │ │
│     │   - [Mark as Culprit] → expands: Motive & Method fields │ │
│     │   - Add/Remove characters                               │ │
│     └─────────────────────────────────────────────────────────┘ │
│     [Give Life to Your Characters] button                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. CHARACTER STAGE (Magic Reveal)                              │
│     Loading with progress → Characters appear with images       │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Character Card:                                         │ │
│     │   [IMAGE] - regenerate/upload buttons on hover          │ │
│     │   Name (editable)                                       │ │
│     │   Role (editable)                                       │ │
│     │   Appearance description (editable)                     │ │
│     │   Personality tags (editable)                           │ │
│     │   Secret (editable)                                     │ │
│     │   [CULPRIT] badge if applicable                         │ │
│     └─────────────────────────────────────────────────────────┘ │
│     [Continue to Review] button                                 │
│     [← Back] returns to Foundation (keeps characters, warns)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. CLUE REVIEW STAGE (includes publish)                        │
│  ┌──────────────────────┬──────────────────────────────────────┐│
│  │                      │  Character Reference Tabs            ││
│  │      CLUES           │  (compact cards, culprit marked)     ││
│  │    (editable)        ├──────────────────────────────────────┤│
│  │                      │        TIMELINE                      ││
│  │  - Edit text         │      (editable)                      ││
│  │  - Edit revealers    │  [Regenerate Timeline] button        ││
│  │  - Edit points       │                                      ││
│  │  - Add/Delete clues  │                                      ││
│  │  - NO categories     │                                      ││
│  │  - NO color coding   │                                      ││
│  └──────────────────────┴──────────────────────────────────────┘│
│  [Generate Scene & Publish] button → validation modal first     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Navigation Behavior

| From | To | Behavior |
|------|-----|----------|
| Prompt | Foundation | Normal forward |
| Foundation | Prompt | Reset (start over) |
| Foundation | Characters | Triggers generation |
| Characters | Foundation | **Keep characters**, show warning: "Going back will require regenerating characters if you make changes" |
| Characters | Clue Review | Normal forward |
| Clue Review | Characters | Normal back |

---

## Part 1: Backend Changes

### 1.1 Type Changes

**File: `packages/ai/types/ugc-types.ts`**

```typescript
// Modify existing UGCStoryScaffold (not V2)
export interface UGCStoryScaffold {
  title: string;
  synopsis: string;           // renamed from 'hook'
  crimeType: 'murder' | 'theft' | 'kidnapping' | 'fraud' | 'sabotage' | 'other';
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  victimParagraph: string;    // enhanced from 'victimContext'
  suggestedCharacters: UGCCharacterSuggestion[];
}

// New: Minimal character for foundation stage
export interface UGCFoundationCharacter {
  id: string;
  name: string;
  role: string;
  connectionHint: string;     // from scaffold, read-only for user
}

// New: Request for flesh-out generation
export interface FleshOutRequest {
  foundation: {
    title: string;
    synopsis: string;
    crimeType: string;
    setting: { location: string; timePeriod: string; atmosphere: string };
    victimParagraph: string;
  };
  characters: UGCFoundationCharacter[];
  culprit: {
    characterId: string;
    motive: string;
    method: string;
  };
}

// New: Response from flesh-out generation
export interface FleshOutResponse {
  storyId: string;
  characters: UGCGeneratedCharacter[];
  clues: UGCGeneratedClue[];      // simplified, no category
  timeline: string[];
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
}

// New: Simplified clue (no category)
export interface UGCGeneratedClue {
  id: string;
  description: string;
  points: number;
  revealedBy: string[];           // character IDs
  detectionHints: string[];
}

// New: Regenerate timeline request
export interface RegenerateTimelineRequest {
  clues: UGCGeneratedClue[];
  characters: UGCGeneratedCharacter[];
  solution: {
    culprit: string;
    method: string;
    motive: string;
  };
}
```

### 1.2 Engine Methods

**File: `packages/ai/ugc-engine.ts`**

```typescript
// Modify existing generateStoryScaffold to output new format
async generateStoryScaffold(premise: string): Promise<UGCStoryScaffold>
// Changes:
// - Output 'synopsis' instead of 'hook'
// - Output 'victimParagraph' instead of 'victimContext'
// - Keep suggestedCharacters minimal (name, role, connectionToCrime only)

// NEW: Main generation for new flow
async fleshOutAndGenerate(
  request: FleshOutRequest,
  onProgress: (progress: GenerationProgress) => void
): Promise<FleshOutResponse>
// Steps:
// 1. Generate full character details (appearance, personality, secrets) - 20%
// 2. Generate timeline from character secrets + culprit info - 40%
// 3. Generate clues from timeline - 60%
// 4. Generate character knowledge from timeline - 75%
// 5. Generate character images (parallel) - 100%

// NEW: Regenerate timeline from clues
async regenerateTimeline(request: RegenerateTimelineRequest): Promise<string[]>
// Takes edited clues and generates a coherent timeline that supports them
```

### 1.3 API Endpoints

**New/Modified endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ugc/generate-scaffold` | POST | Modify to return new format |
| `/api/ugc/flesh-out` | POST | New - main generation |
| `/api/ugc/regenerate-timeline` | POST | New - timeline from clues |
| `/api/ugc/regenerate-image` | POST | New - single character image |
| `/api/ugc/upload-image` | POST | New - upload character image |

---

## Part 2: State Management

**File: `components/create/wizard/WizardContext.tsx`**

### 2.1 New State Shape

```typescript
export type WizardStage = 'prompt' | 'foundation' | 'characters' | 'clues';

export interface WizardState {
  currentStage: WizardStage;
  storyId: string | null;

  // Prompt stage
  premise: string;
  scaffoldGenerating: boolean;

  // Foundation stage
  foundation: {
    title: string;
    synopsis: string;
    crimeType: string;
    setting: { location: string; timePeriod: string; atmosphere: string };
    victimParagraph: string;
  } | null;
  foundationCharacters: Array<{
    id: string;
    name: string;
    role: string;
    connectionHint: string;
  }>;
  culpritId: string | null;
  culpritMotive: string;
  culpritMethod: string;

  // Character stage
  generatedCharacters: UGCGeneratedCharacter[];
  charactersGenerating: boolean;
  generationProgress: { step: string; progress: number } | null;
  hasGeneratedOnce: boolean;  // tracks if characters were generated (for back nav warning)

  // Clue review stage
  clues: UGCGeneratedClue[];
  timeline: string[];
  solution: { culprit: string; method: string; motive: string; explanation: string };
  timelineRegenerating: boolean;

  // Scoring
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;

  // Scene/Publish
  sceneImageUrl: string | null;
  sceneGenerating: boolean;
  isPublishing: boolean;

  // Error handling
  error: string | null;
}
```

### 2.2 Key Actions

```typescript
type WizardAction =
  // Navigation
  | { type: 'GO_TO_STAGE'; stage: WizardStage }
  | { type: 'RESET_WIZARD' }

  // Prompt stage
  | { type: 'SET_PREMISE'; premise: string }
  | { type: 'START_SCAFFOLD'; }
  | { type: 'COMPLETE_SCAFFOLD'; scaffold: UGCStoryScaffold }

  // Foundation stage
  | { type: 'UPDATE_FOUNDATION_FIELD'; field: string; value: string }
  | { type: 'UPDATE_FOUNDATION_SETTING'; field: string; value: string }
  | { type: 'UPDATE_CHARACTER'; id: string; field: 'name' | 'role'; value: string }
  | { type: 'ADD_CHARACTER' }
  | { type: 'DELETE_CHARACTER'; id: string }
  | { type: 'SET_CULPRIT'; id: string | null }
  | { type: 'SET_CULPRIT_MOTIVE'; motive: string }
  | { type: 'SET_CULPRIT_METHOD'; method: string }

  // Character generation
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_PROGRESS'; step: string; progress: number }
  | { type: 'COMPLETE_GENERATION'; result: FleshOutResponse }

  // Character stage edits
  | { type: 'UPDATE_GENERATED_CHARACTER'; id: string; updates: Partial<UGCGeneratedCharacter> }
  | { type: 'START_IMAGE_REGEN'; characterId: string }
  | { type: 'COMPLETE_IMAGE_REGEN'; characterId: string; imageUrl: string }
  | { type: 'SET_CHARACTER_IMAGE'; characterId: string; imageUrl: string }

  // Clue review stage
  | { type: 'UPDATE_CLUE'; id: string; updates: Partial<UGCGeneratedClue> }
  | { type: 'ADD_CLUE' }
  | { type: 'DELETE_CLUE'; id: string }
  | { type: 'UPDATE_TIMELINE_EVENT'; index: number; value: string }
  | { type: 'ADD_TIMELINE_EVENT'; afterIndex: number }
  | { type: 'DELETE_TIMELINE_EVENT'; index: number }
  | { type: 'START_TIMELINE_REGEN' }
  | { type: 'COMPLETE_TIMELINE_REGEN'; timeline: string[] }

  // Publish
  | { type: 'START_SCENE_GEN' }
  | { type: 'COMPLETE_SCENE_GEN'; imageUrl: string }
  | { type: 'START_PUBLISH' }
  | { type: 'COMPLETE_PUBLISH' }

  // Error
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
```

### 2.3 Computed Helpers

```typescript
// Can proceed from Foundation?
const canProceedFromFoundation =
  foundation !== null &&
  foundationCharacters.length >= 3 &&
  foundationCharacters.every(c => c.name.trim()) &&
  culpritId !== null &&
  culpritMotive.trim().length > 0 &&
  culpritMethod.trim().length > 0;

// Can publish?
const canPublish =
  clues.length >= 5 &&
  timeline.length >= 3 &&
  generatedCharacters.length >= 3;
```

---

## Part 3: Frontend Components

### 3.1 PromptStage

**File: `components/create/stages/PromptStage.tsx`**

```tsx
// Simple page:
// - Heading: "What's Your Mystery About?"
// - Large textarea for premise
// - "Generate Foundation" button
// - Loading spinner when generating
```

### 3.2 FoundationStage

**File: `components/create/stages/FoundationStage.tsx`**

```tsx
// Layout:
// ┌─────────────────────────────────────────┐
// │ Title (editable inline)                 │
// │ Synopsis (editable textarea)            │
// ├─────────────────────────────────────────┤
// │ Setting: [Location] [Time Period] [Crime Type] (editable tags/dropdowns)
// ├─────────────────────────────────────────┤
// │ The Victim: (editable textarea)         │
// ├─────────────────────────────────────────┤
// │ Characters:                             │
// │   [Card 1] [Card 2] [Card 3] ...       │
// │   [+ Add Character]                     │
// ├─────────────────────────────────────────┤
// │ [Give Life to Your Characters] button   │
// └─────────────────────────────────────────┘
```

### 3.3 FoundationCharacterCard

**File: `components/create/cards/FoundationCharacterCard.tsx`**

```tsx
// Collapsed state:
// ┌─────────────────────────────────────────┐
// │ [#] Name - Role              [▼] [🗑️]  │
// │     "Connection hint..."                │
// └─────────────────────────────────────────┘

// Expanded state (when editing or is culprit):
// ┌─────────────────────────────────────────┐
// │ [#] [Name input] - [Role input] [▲][🗑️]│
// │     "Connection hint..."                │
// │     [Mark as Culprit] toggle            │
// │     ─────────────────────────────────── │
// │     (if culprit):                       │
// │     Motive: [textarea]                  │
// │     Method: [textarea]                  │
// └─────────────────────────────────────────┘
```

### 3.4 CharactersStage (redesigned)

**File: `components/create/stages/CharactersStage.tsx`**

```tsx
// Loading state (during generation):
// - Progress bar with step labels
// - Skeleton cards that fill in as characters complete

// Completed state:
// - Grid of GeneratedCharacterCard components
// - "Continue to Review" button
// - "← Back" button (shows warning if hasGeneratedOnce)
```

### 3.5 GeneratedCharacterCard

**File: `components/create/cards/GeneratedCharacterCard.tsx`**

```tsx
// ┌─────────────────────────────────────────┐
// │  ┌─────────┐                            │
// │  │  IMAGE  │  [🔄] [📷]  (hover buttons)│
// │  │         │                            │
// │  └─────────┘                            │
// │  Name: [editable input]      [CULPRIT]  │
// │  Role: [editable input]                 │
// │  ──────────────────────────────────────│
// │  Appearance: [editable textarea]        │
// │  ──────────────────────────────────────│
// │  Personality: [tag1] [tag2] [+]         │
// │  ──────────────────────────────────────│
// │  Secret: [editable textarea]            │
// └─────────────────────────────────────────┘
```

### 3.6 CluesStage (redesigned)

**File: `components/create/stages/CluesStage.tsx`**

```tsx
// Grid layout (responsive: stacked on mobile)
// ┌────────────────────────┬────────────────────────┐
// │                        │  Character Tabs        │
// │       CLUES            │  [Char1][Char2][...]   │
// │  (scrollable list)     ├────────────────────────┤
// │                        │      TIMELINE          │
// │  [+ Add Clue]          │  (scrollable list)     │
// │                        │  [Regenerate] button   │
// └────────────────────────┴────────────────────────┘
//
// [Generate Scene & Publish] button at bottom
```

### 3.7 EditableClueCard

**File: `components/create/cards/EditableClueCard.tsx`**

```tsx
// ┌─────────────────────────────────────────┐
// │ Clue text: [textarea]                   │
// │ Points: [number input]                  │
// │ Revealed by: [multi-select dropdown]    │
// │                              [🗑️ Delete]│
// └─────────────────────────────────────────┘
//
// No categories, no color coding, uniform styling
```

### 3.8 CharacterReferenceTabs

**File: `components/create/cards/CharacterReferenceTabs.tsx`**

```tsx
// Compact horizontal tabs showing all characters
// ┌──────┬──────┬──────┬──────┐
// │ Char │ Char │ Char │ Char │
// │  1   │  2*  │  3   │  4   │  (* = culprit badge)
// └──────┴──────┴──────┴──────┘
//
// Each tab shows: small avatar, name, role
// Culprit has red badge
// Non-editable, reference only
```

### 3.9 TimelinePanel

**File: `components/create/cards/TimelinePanel.tsx`**

```tsx
// ┌─────────────────────────────────────────┐
// │ Timeline                  [🔄 Regenerate]│
// ├─────────────────────────────────────────┤
// │ • Event 1 [edit] [delete]               │
// │ • Event 2 [edit] [delete]               │
// │ • Event 3 [edit] [delete]               │
// │ [+ Add Event]                           │
// └─────────────────────────────────────────┘
```

---

## Part 4: LLM Generation Sequence

### `fleshOutAndGenerate` detailed flow:

```
Input: FleshOutRequest (foundation + minimal characters + culprit info)

Step 1: Generate Character Details (20%)
  - For each character, generate:
    - Appearance description
    - Personality traits (3-5)
    - Speech style
    - Secret (informed by culprit motive/method for the culprit)
    - Age
  - Culprit's secret ties to the crime

Step 2: Generate Timeline (40%)
  - Input: Full character details + culprit motive/method
  - Output: 8-12 timestamped events
  - Rules:
    - Every character's secret manifests in at least one event
    - Culprit has opportunity window
    - Witnesses see things they can later reveal

Step 3: Generate Clues (60%)
  - Input: Timeline + characters + solution
  - Output: 8-12 clues (no categories)
  - Each clue:
    - Description of what player learns
    - Point value (10-30)
    - Which characters can reveal it (based on timeline)
    - Detection hints for interrogation

Step 4: Generate Character Knowledge (75%)
  - For each character, derive from timeline:
    - knowsAboutCrime
    - knowsAboutOthers
    - alibi (false for culprit)
    - statement (for player display)
    - behaviorUnderPressure

Step 5: Generate Images (100%)
  - Parallel generation for all characters
  - Use appearance description as prompt
  - Skip if user uploaded image

Output: FleshOutResponse
```

---

## Part 5: Implementation Phases

### Phase 1: Backend (3-4 days)
1. Update types in `ugc-types.ts`
2. Modify `generateStoryScaffold` prompt for new output format
3. Implement `fleshOutAndGenerate` method
4. Implement `regenerateTimeline` method
5. Create API endpoints
6. Test with curl/Postman

### Phase 2: State Management (1-2 days)
1. Create new WizardContext with new state shape
2. Implement all reducer actions
3. Add computed helpers
4. Wire up to existing wizard shell

### Phase 3: Prompt & Foundation UI (2-3 days)
1. Create PromptStage component
2. Create FoundationStage component
3. Create FoundationCharacterCard component
4. Test prompt → foundation flow

### Phase 4: Character Stage (2-3 days)
1. Create GeneratedCharacterCard component
2. Implement generation progress UI
3. Implement image regeneration
4. Implement image upload
5. Handle back navigation with warning

### Phase 5: Clue Review Stage (2-3 days)
1. Create EditableClueCard component
2. Create CharacterReferenceTabs component
3. Create TimelinePanel component
4. Implement grid layout
5. Implement timeline regeneration

### Phase 6: Publish & Polish (1-2 days)
1. Implement validation modal on publish
2. Implement scene generation
3. Wire up save/publish flow
4. End-to-end testing
5. Remove old flow code

---

## Files Summary

### New Files (8)
```
app/api/ugc/flesh-out/route.ts
app/api/ugc/regenerate-timeline/route.ts
app/api/ugc/regenerate-image/route.ts
components/create/stages/PromptStage.tsx
components/create/stages/FoundationStage.tsx
components/create/cards/FoundationCharacterCard.tsx
components/create/cards/GeneratedCharacterCard.tsx
components/create/cards/EditableClueCard.tsx
components/create/cards/CharacterReferenceTabs.tsx
components/create/cards/TimelinePanel.tsx
```

### Modified Files (6)
```
packages/ai/types/ugc-types.ts      - New types, modify existing
packages/ai/ugc-engine.ts           - New methods
packages/ai/index.ts                - Export new types
components/create/wizard/WizardContext.tsx - New state shape
components/create/stages/CharactersStage.tsx - Redesign
components/create/stages/CluesStage.tsx - Redesign with grid
```

### Deprecated (remove after migration)
```
components/create/stages/StoryStage.tsx (replaced by Prompt + Foundation)
components/create/stages/WorldStage.tsx (merged into CluesStage)
components/create/cards/ClueCard.tsx (replaced by EditableClueCard)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM generation takes too long | Parallel image generation, SSE progress updates |
| Timeline regeneration produces inconsistent results | Good prompting, include clue context in prompt |
| Users lose work going back | Keep generated data, show warning before destructive actions |
| Mobile layout issues with grid | Responsive design: stack on mobile |
| Image upload storage | Use existing upload mechanism or add S3 integration |

---

## Success Criteria

1. User can go from prompt → published story in 4 stages
2. "Magic moments" feel impactful (loading → reveal)
3. All fields are editable where specified
4. Timeline regeneration produces coherent results
5. Validation catches issues before publish
6. No data loss on back navigation (with warning)
