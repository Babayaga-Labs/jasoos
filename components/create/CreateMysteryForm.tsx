'use client';

import { useState } from 'react';

interface CreateMysteryFormProps {
  onSubmit: (synopsis: string) => void;
  isDisabled: boolean;
}

const PLACEHOLDER_SYNOPSIS = `A renowned art collector is found dead in their private gallery during an exclusive exhibition. The victim was known for acquiring rare paintings through questionable means, making enemies among fellow collectors, dealers, and even family members fighting over the inheritance.

The murder weapon—a antique letter opener—was found at the scene, but the killer left no fingerprints. Four people were present that night: the victim's estranged daughter, a rival collector, the gallery curator, and a mysterious art dealer with a shady past.`;

export function CreateMysteryForm({ onSubmit, isDisabled }: CreateMysteryFormProps) {
  const [synopsis, setSynopsis] = useState('');
  const charCount = synopsis.length;
  const minChars = 100;
  const maxChars = 5000;
  const isValidLength = charCount >= minChars && charCount <= maxChars;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidLength && !isDisabled) {
      onSubmit(synopsis);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Synopsis textarea */}
      <div>
        <label htmlFor="synopsis" className="block text-sm font-medium text-slate-300 mb-2">
          Your Mystery Synopsis
        </label>
        <textarea
          id="synopsis"
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          placeholder={PLACEHOLDER_SYNOPSIS}
          disabled={isDisabled}
          className="w-full h-64 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Character count */}
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-slate-500">
            Describe your mystery: the setting, crime, suspects, and any key details.
          </p>
          <span className={`text-sm ${
            charCount < minChars
              ? 'text-slate-500'
              : charCount > maxChars
                ? 'text-red-400'
                : 'text-green-400'
          }`}>
            {charCount} / {minChars}-{maxChars}
          </span>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-amber-400 mb-2">Tips for a great mystery:</h4>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Include a clear crime or mystery to solve</li>
          <li>• Describe 3-5 potential suspects with different motives</li>
          <li>• Add interesting setting details (time period, location)</li>
          <li>• Hint at secrets and relationships between characters</li>
        </ul>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!isValidLength || isDisabled}
        className="w-full btn btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Mystery
      </button>

      {!isValidLength && charCount > 0 && (
        <p className="text-sm text-center text-amber-400">
          {charCount < minChars
            ? `Add ${minChars - charCount} more characters to continue`
            : `Synopsis is too long. Remove ${charCount - maxChars} characters`}
        </p>
      )}
    </form>
  );
}
