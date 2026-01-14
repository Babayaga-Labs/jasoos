'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

export function Timer() {
  const { timeRemaining, timerStarted, startTimer, tickTimer, gameStatus } = useGameStore();

  // Start timer on mount
  useEffect(() => {
    if (gameStatus === 'playing' && !timerStarted) {
      startTimer();
    }
  }, [gameStatus, timerStarted, startTimer]);

  // Tick every second
  useEffect(() => {
    if (!timerStarted || gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, gameStatus, tickTimer]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isWarning = timeRemaining <= 120; // 2 minutes warning
  const isCritical = timeRemaining <= 60;  // 1 minute critical

  return (
    <div
      className={`
        font-mono text-2xl font-bold px-4 py-2 rounded-lg
        ${isCritical
          ? 'bg-red-900/80 text-red-300 animate-pulse'
          : isWarning
            ? 'bg-amber-900/80 text-amber-300'
            : 'bg-slate-800/80 text-white'
        }
      `}
    >
      {timeString}
    </div>
  );
}
