import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame } from 'lucide-react';
import { Button } from '@/ui/primitives';

export interface PomodoroWidgetProps {
  instanceId: string;
  settings?: {
    workTime?: number; // минуты
    breakTime?: number;
  };
}

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({ settings }) => {
  const workDuration = (settings?.workTime || 25) * 60;
  const breakDuration = (settings?.breakTime || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [soundActive, setSoundActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    let interval: any = null;
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
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, workDuration, breakDuration]);

  // Генерация синтеза фонового шума через Web Audio API
  const toggleSound = () => {
    if (soundActive) {
      if (audioCtxRef.current) audioCtxRef.current.close();
      setSoundActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
        filter.frequency.value = 400; // Мягкий шум фокуса

        const gain = ctx.createGain();
        gain.gain.value = 0.05; // Легкая фоновая громкость

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        noiseNodeRef.current = noise;
        setSoundActive(true);
      } catch (err) {
        console.warn('Web Audio Context не поддерживается');
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
    <div className="flex flex-col items-center justify-around h-full select-none">
      <div className="flex items-center space-x-2">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
            mode === 'work'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {mode === 'work' ? '🔥 Фокус' : '☕ Отдых'}
        </span>
      </div>

      <div className="text-4xl font-bold font-mono text-[var(--color-text)]">
        {formatTime(timeLeft)}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant={isRunning ? 'secondary' : 'primary'}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="w-4 h-4 text-[var(--color-text-muted)]" />
        </Button>

        <Button size="sm" variant="ghost" onClick={toggleSound}>
          {soundActive ? (
            <Volume2 className="w-4 h-4 text-[var(--color-primary)]" />
          ) : (
            <VolumeX className="w-4 h-4 text-[var(--color-text-muted)]" />
          )}
        </Button>
      </div>
    </div>
  );
};
