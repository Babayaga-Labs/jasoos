'use client';

import { CRIME_TYPES } from '@/packages/ai/types/ugc-types';
import type { UGCCharacterInput, UGCCrimeInput } from '@/packages/ai/types/ugc-types';

interface CrimeSectionProps {
  crime: UGCCrimeInput;
  characters: UGCCharacterInput[];
  onCrimeChange: (crime: UGCCrimeInput) => void;
  disabled?: boolean;
}

export function CrimeSection({
  crime,
  characters,
  onCrimeChange,
  disabled = false,
}: CrimeSectionProps) {
  // Filter out victims from culprit options
  const culpritOptions = characters.filter(c => !c.isVictim && c.name.trim());

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
        The Crime
      </h2>

      {/* Crime Type */}
      <div>
        <label htmlFor="crimeType" className="block text-sm font-medium text-slate-300 mb-1">
          Crime Type <span className="text-red-400">*</span>
        </label>
        <select
          id="crimeType"
          value={crime.crimeType}
          onChange={(e) => onCrimeChange({ ...crime, crimeType: e.target.value as UGCCrimeInput['crimeType'] })}
          disabled={disabled}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">Select crime type...</option>
          {CRIME_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Culprit Selection */}
      <div>
        <label htmlFor="culprit" className="block text-sm font-medium text-slate-300 mb-1">
          Who is Guilty? <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Select which character committed the crime.
        </p>
        {culpritOptions.length === 0 ? (
          <p className="text-sm text-amber-400 py-2">
            Add characters with names above to select a culprit.
          </p>
        ) : (
          <select
            id="culprit"
            value={crime.culpritId}
            onChange={(e) => onCrimeChange({ ...crime, culpritId: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="">Select the culprit...</option>
            {culpritOptions.map((char) => (
              <option key={char.tempId} value={char.tempId}>
                {char.name} ({char.role || 'No role'})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Motive */}
      <div>
        <label htmlFor="motive" className="block text-sm font-medium text-slate-300 mb-1">
          Motive <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Why did the culprit commit this crime? What drove them to it?
        </p>
        <textarea
          id="motive"
          value={crime.motive}
          onChange={(e) => onCrimeChange({ ...crime, motive: e.target.value })}
          placeholder="e.g., Years of resentment over being passed over for a promotion, combined with the discovery that the victim was about to expose their embezzlement..."
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50"
        />
      </div>

      {/* Method */}
      <div>
        <label htmlFor="method" className="block text-sm font-medium text-slate-300 mb-1">
          Method <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          How did they do it? What&apos;s the clever twist that makes this mystery interesting?
        </p>
        <textarea
          id="method"
          value={crime.method}
          onChange={(e) => onCrimeChange({ ...crime, method: e.target.value })}
          placeholder="e.g., Used their access to the hotel's master key system to enter the victim's room while everyone thought they were at the gala. The locked door was a misdirection—they exited through the connecting suite..."
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}
