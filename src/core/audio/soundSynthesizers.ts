import { getAudioContext } from './audioContext';

export interface SoundInstance {
  setVolume: (volume: number) => void;
  stop: () => void;
}

/** Создаёт буфер белого шума */
function createWhiteNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Создаёт буфер розового шума */
function createPinkNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
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
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

/** 1. Синтезатор Дождя (Rain) */
export function playRainSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createPinkNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume * 0.8;

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseSource.start();

  return {
    setVolume: (v: number) => {
      gainNode.gain.setTargetAtTime(v * 0.8, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 2. Синтезатор Костра (Campfire) */
export function playCampfireSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createPinkNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const lowFilter = ctx.createBiquadFilter();
  lowFilter.type = 'lowpass';
  lowFilter.frequency.value = 400;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume * 0.7;

  noiseSource.connect(lowFilter);
  lowFilter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseSource.start();

  return {
    setVolume: (v: number) => {
      gainNode.gain.setTargetAtTime(v * 0.7, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        lowFilter.disconnect();
        gainNode.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 3. Синтезатор Волн Океана (Ocean Waves) */
export function playWavesSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createPinkNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  // LFO модулятор амплитуды (период волны ~6 секунд)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;

  const masterGain = ctx.createGain();
  masterGain.gain.value = volume * 0.6;

  lfo.connect(filter.frequency);
  noiseSource.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start();
  noiseSource.start();

  return {
    setVolume: (v: number) => {
      masterGain.gain.setTargetAtTime(v * 0.6, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        lfo.stop();
        lfo.disconnect();
        noiseSource.stop();
        noiseSource.disconnect();
        filter.disconnect();
        masterGain.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 4. Синтезатор Леса и Ветра (Forest) */
export function playForestSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createPinkNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 800;
  bandpass.Q.value = 1.2;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume * 0.5;

  noiseSource.connect(bandpass);
  bandpass.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseSource.start();

  return {
    setVolume: (v: number) => {
      gainNode.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        bandpass.disconnect();
        gainNode.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 5. Синтезатор Кафе (Cafe) */
export function playCafeSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createPinkNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume * 0.5;

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseSource.start();

  return {
    setVolume: (v: number) => {
      gainNode.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 6. Синтезатор Белого / Розового шума (White Noise) */
export function playWhiteNoiseSound(volume = 0.5): SoundInstance {
  const ctx = getAudioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const noiseBuffer = createWhiteNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3000;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume * 0.3;

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseSource.start();

  return {
    setVolume: (v: number) => {
      gainNode.gain.setTargetAtTime(v * 0.3, ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (err) {
        void err;
      }
    },
  };
}

/** 7. Аудио-сигнал Помодоро (чистый колокольный звон) */
export function playPomodoroBell(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime); // нота Ля 5-й октавы
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // noop
    }
  };

  osc.start();
  osc.stop(ctx.currentTime + 1.5);
}
