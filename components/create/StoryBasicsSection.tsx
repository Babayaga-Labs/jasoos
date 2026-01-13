'use client';

import { TIME_PERIODS } from '@/packages/ai/types/ugc-types';

interface StoryBasicsSectionProps {
  title: string;
  settingLocation: string;
  timePeriod: string;
  customTimePeriod: string;
  premise: string;
  onTitleChange: (value: string) => void;
  onSettingLocationChange: (value: string) => void;
  onTimePeriodChange: (value: string) => void;
  onCustomTimePeriodChange: (value: string) => void;
  onPremiseChange: (value: string) => void;
  disabled?: boolean;
}

export function StoryBasicsSection({
  title,
  settingLocation,
  timePeriod,
  customTimePeriod,
  premise,
  onTitleChange,
  onSettingLocationChange,
  onTimePeriodChange,
  onCustomTimePeriodChange,
  onPremiseChange,
  disabled = false,
}: StoryBasicsSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
        Story Details
      </h2>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">
          Mystery Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Death at the Grand Hotel"
          disabled={disabled}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Setting Location */}
      <div>
        <label htmlFor="settingLocation" className="block text-sm font-medium text-slate-300 mb-1">
          Setting Location <span className="text-red-400">*</span>
        </label>
        <input
          id="settingLocation"
          type="text"
          value={settingLocation}
          onChange={(e) => onSettingLocationChange(e.target.value)}
          placeholder="e.g., A luxury hotel in Paris, A remote mansion in the countryside"
          disabled={disabled}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Time Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timePeriod" className="block text-sm font-medium text-slate-300 mb-1">
            Time Period <span className="text-red-400">*</span>
          </label>
          <select
            id="timePeriod"
            value={timePeriod}
            onChange={(e) => onTimePeriodChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="">Select time period...</option>
            {TIME_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        {timePeriod === 'other' && (
          <div>
            <label htmlFor="customTimePeriod" className="block text-sm font-medium text-slate-300 mb-1">
              Specify Period <span className="text-red-400">*</span>
            </label>
            <input
              id="customTimePeriod"
              type="text"
              value={customTimePeriod}
              onChange={(e) => onCustomTimePeriodChange(e.target.value)}
              placeholder="e.g., Ancient Rome, 1950s America"
              disabled={disabled}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {/* Premise */}
      <div>
        <label htmlFor="premise" className="block text-sm font-medium text-slate-300 mb-1">
          Premise <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          The opening hook shown to players. What crime occurred? What makes it intriguing?
        </p>
        <textarea
          id="premise"
          value={premise}
          onChange={(e) => onPremiseChange(e.target.value)}
          placeholder="e.g., During the annual charity gala at the Grand Hotel, billionaire philanthropist Marcus Webb is found dead in his penthouse suite. The door was locked from inside, and everyone has an alibi—or so they claim..."
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50"
        />
        <div className="text-xs text-slate-500 mt-1 text-right">
          {premise.length} characters (minimum 20)
        </div>
      </div>
    </div>
  );
}
