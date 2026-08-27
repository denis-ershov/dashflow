import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Button, Badge } from '@/ui/primitives';
import type { PomodoroSettings } from './types';

export const PomodoroWidget: React.FC<WidgetProps<PomodoroSettings>> = ({ settings }) => {
  const workDuration = (settings?.workTime || 25) * 60;
  const breakDuration = (settings?.breakTime || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [soundActive, setSoundActive] = useState(false);

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

  // Фоновый звук фокуса через Web Audio API
  const toggleSound = () => {
    if (soundActive) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setSoundActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    <div className="flex flex-col items-center justify-around h-full p-2 select-none">
      <Badge variant={mode === 'work' ? 'warning' : 'success'}>
        {mode === 'work' ? '🔥 Фокус' : '☕ Отдых'}
      </Badge>

      <div
        aria-live="polite"
        className="text-4xl font-bold font-mono text-fg tracking-tight"
      >
        {formatTime(timeLeft)}
      </div>

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
