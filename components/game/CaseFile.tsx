'use client';

import type { CaseFile as CaseFileType } from '@/packages/ai/types/ugc-types';

interface CaseFileProps {
  caseFile: CaseFileType;
  setting: {
    location: string;
    timePeriod?: string;
  };
}

/**
 * Typewriter-style case file component
 * Displays victim information and initial evidence in a noir detective report aesthetic
 */
export function CaseFile({ caseFile, setting }: CaseFileProps) {
  return (
    <div className="mb-6 p-5 bg-slate-800/50 rounded-lg border border-slate-700 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-600 pb-3 mb-4">
        <h2 className="text-rose-400 font-bold tracking-widest text-sm">
          CASE FILE
        </h2>
        <span className="text-slate-500 text-xs tracking-wider">
          CLASSIFIED
        </span>
      </div>

      {/* Case details */}
      <div className="space-y-3 text-sm">
        <CaseField
          label="VICTIM"
          value={`${caseFile.victimName} — ${caseFile.victimDescription}`}
        />
        <CaseField
          label="CAUSE OF DEATH"
          value={caseFile.causeOfDeath}
        />
        <CaseField
          label="LAST SEEN"
          value={caseFile.lastSeen}
        />
        <CaseField
          label="LOCATION FOUND"
          value={caseFile.locationFound}
        />
        <CaseField
          label="DISCOVERED BY"
          value={`${caseFile.discoveredBy}, at ${caseFile.timeOfDiscovery}`}
        />
        <CaseField
          label="TIME OF DEATH"
          value={`${caseFile.timeOfDeath} (estimated)`}
        />
      </div>

      {/* Initial observations section */}
      {caseFile.initialEvidence && caseFile.initialEvidence.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-600">
          <h3 className="text-rose-400/80 text-xs font-bold tracking-widest mb-3">
            INITIAL OBSERVATIONS
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {caseFile.initialEvidence.map((evidence, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-rose-500/60 shrink-0">&gt;</span>
                <span>{evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Individual case field row with typewriter styling
 */
function CaseField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <span className="text-rose-400/80 text-xs tracking-wider shrink-0 sm:min-w-[140px]">
        {label}
      </span>
      <span className="text-slate-300 mt-0.5 sm:mt-0">{value}</span>
    </div>
  );
}
