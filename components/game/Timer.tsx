'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

export function Timer() {
  const { timeElapsed, timerStarted, startTimer, tickTimer, gameStatus } = useGameStore();

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

  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="font-mono text-2xl font-bold px-4 py-2 rounded-lg bg-slate-800/80 text-white">
      {timeString}
    </div>
  );
}
