import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Button } from '@/ui/primitives';
import { playPomodoroBell } from '@/core/audio';
import { cn } from '@/ui/lib/cn';
import type { PomodoroSettings } from './types';

export const PomodoroWidget: React.FC<WidgetProps<PomodoroSettings>> = ({ settings }) => {
  const workDuration = (settings?.workTime || 25) * 60;
  const breakDuration = (settings?.breakTime || 5) * 60;
  const longBreakDuration = (settings?.longBreakTime || 15) * 60;
  const autoStartBreaks = Boolean(settings?.autoStartBreaks);
  const timerStyle = settings?.timerStyle || 'ring';
  const soundEnabled = settings?.soundEnabled !== false;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [cycle, setCycle] = useState(0); // 0-4
  const [soundActive, setSoundActive] = useState(false);

  const totalDuration =
    mode === 'work' ? workDuration : mode === 'longBreak' ? longBreakDuration : breakDuration;
  const progress = Math.max(0, Math.min(1, timeLeft / totalDuration));

  // SVG Circle параметры (R = 40, C = 2 * PI * 40 ≈ 251.32)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setTimeLeft(
      mode === 'work' ? workDuration : mode === 'longBreak' ? longBreakDuration : breakDuration,
    );
  }, [workDuration, breakDuration, longBreakDuration, mode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (soundEnabled) {
        playPomodoroBell();
      }

      if (mode === 'work') {
        const nextCycle = (cycle + 1) % 4;
        setCycle(nextCycle);
        if (nextCycle === 0) {
          setMode('longBreak');
          setTimeLeft(longBreakDuration);
        } else {
          setMode('break');
          setTimeLeft(breakDuration);
        }
        setIsRunning(autoStartBreaks);
      } else {
        setMode('work');
        setTimeLeft(workDuration);
        setIsRunning(false);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isRunning,
    timeLeft,
    mode,
    cycle,
    workDuration,
    breakDuration,
    longBreakDuration,
    soundEnabled,
    autoStartBreaks,
  ]);

  // Фоновый шум фокуса через Web Audio API
  const toggleSound = () => {
    if (soundActive) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setSoundActive(false);
    } else {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.05;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

        whiteNoise.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start(0);

        setSoundActive(true);
      } catch (e) {
        console.error('AudioContext error:', e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(
      mode === 'work' ? workDuration : mode === 'longBreak' ? longBreakDuration : breakDuration,
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeTitle = () => {
    if (mode === 'work') return 'Спринт фокуса';
    if (mode === 'longBreak') return 'Длинный отдых';
    return 'Короткий отдых';
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full p-2 select-none">
      {/* Шапка: режим и точки сессий */}
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-fg-muted">
          {mode === 'work' ? (
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          ) : mode === 'longBreak' ? (
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-success" />
          )}
          <span>{getModeTitle()}</span>
        </div>

        {/* Индикатор сессий цикла 1..4 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < (cycle === 0 && mode !== 'work' ? 4 : cycle);
            return (
              <span
                key={idx}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                  isFilled
                    ? 'bg-primary shadow-[0_0_6px_rgba(56,189,248,0.6)] scale-110'
                    : 'bg-surface-elevated border border-line',
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Таймер */}
      {timerStyle === 'digital' ? (
        <div className="flex flex-col items-center justify-center my-auto">
          <span className="text-4xl sm:text-5xl font-mono font-extrabold text-fg tracking-tighter drop-shadow-sm">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[11px] text-fg-muted mt-1 font-medium">
            Сессия {cycle + 1} из 4
          </span>
        </div>
      ) : (
        <div className="relative flex items-center justify-center my-auto">
          <svg className="w-28 h-28 sm:w-32 sm:h-32 -rotate-90 transform" viewBox="0 0 100 100">
            {/* Фоновый круг */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-surface-hover"
              strokeWidth="5"
              fill="transparent"
            />
            {/* Прогресс круг */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={cn(
                'transition-all duration-1000 ease-linear',
                mode === 'work'
                  ? 'stroke-warning shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : mode === 'longBreak'
                    ? 'stroke-accent'
                    : 'stroke-success',
              )}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Цифровое время в центре */}
          <div
            aria-live="polite"
            className="absolute flex flex-col items-center justify-center text-center"
          >
            <span className="text-xl sm:text-2xl font-bold font-mono text-fg tracking-tight">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-fg-muted font-medium uppercase tracking-wider">
              {cycle + 1}/4
            </span>
          </div>
        </div>
      )}

      {/* Панель управления */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isRunning ? 'secondary' : 'primary'}
          aria-label={isRunning ? 'Пауза' : 'Запустить таймер'}
          onClick={() => setIsRunning(!isRunning)}
          className="min-h-[36px] min-w-[36px]"
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          aria-label="Сброс таймера"
          onClick={reset}
          className="min-h-[36px] min-w-[36px]"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={soundActive ? 'secondary' : 'ghost'}
          aria-label={soundActive ? 'Выключить белый шум' : 'Включить белый шум'}
          onClick={toggleSound}
          className={cn('min-h-[36px] min-w-[36px]', soundActive && 'text-primary')}
        >
          {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
