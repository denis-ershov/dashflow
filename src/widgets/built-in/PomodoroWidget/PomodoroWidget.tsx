import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Button, Badge } from '@/ui/primitives';
import { playPomodoroBell } from '@/core/audio';
import { cn } from '@/ui/lib/cn';
import type { PomodoroSettings } from './types';

export const PomodoroWidget: React.FC<WidgetProps<PomodoroSettings>> = ({ settings }) => {
  const workDuration = (settings?.workTime || 25) * 60;
  const breakDuration = (settings?.breakTime || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [soundActive, setSoundActive] = useState(false);

  const totalDuration = mode === 'work' ? workDuration : breakDuration;
  const progress = Math.max(0, Math.min(1, timeLeft / totalDuration));

  // SVG Circle параметры (R = 40, C = 2 * PI * 40 ≈ 251.32)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setTimeLeft(mode === 'work' ? workDuration : breakDuration);
  }, [workDuration, breakDuration, mode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playPomodoroBell();
      if (mode === 'work') {
        setMode('break');
        setTimeLeft(breakDuration);
      } else {
        setMode('work');
        setTimeLeft(workDuration);
      }
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, workDuration, breakDuration]);

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

        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = ctx.createGain();
        gain.gain.value = 0.05;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        setSoundActive(true);
      } catch {
        // Игнорируем в окружениях без звуковой карты
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workDuration : breakDuration);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full p-2 select-none">
      {/* Бейдж фазы */}
      <div className="flex items-center gap-2">
        <Badge variant={mode === 'work' ? 'warning' : 'success'}>
          {mode === 'work' ? '🔥 Фокус' : '☕ Отдых'}
        </Badge>
      </div>

      {/* Круговой SVG Таймер */}
      <div className="relative flex items-center justify-center my-1">
        <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 100 100">
          {/* Фоновый круг */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-surface-hover"
            strokeWidth="6"
            fill="transparent"
          />
          {/* Прогресс круг */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={cn(
              'transition-all duration-1000 ease-linear',
              mode === 'work' ? 'stroke-warning' : 'stroke-success',
            )}
            strokeWidth="6"
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
            {mode === 'work' ? 'Работа' : 'Отдых'}
          </span>
        </div>
      </div>

      {/* Панель управления */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isRunning ? 'secondary' : 'primary'}
          aria-label={isRunning ? 'Пауза' : 'Запустить таймер'}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          aria-label="Сброс таймера"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4 text-fg-muted" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          aria-label={soundActive ? 'Выключить звук фокуса' : 'Включить звук фокуса'}
          onClick={toggleSound}
        >
          {soundActive ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-fg-muted" />
          )}
        </Button>
      </div>
    </div>
  );
};
