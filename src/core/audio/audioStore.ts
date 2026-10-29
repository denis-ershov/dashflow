import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  playRainSound,
  playCampfireSound,
  playWavesSound,
  playForestSound,
  playCafeSound,
  playWhiteNoiseSound,
  type SoundInstance,
} from './soundSynthesizers';

export type AmbientSoundKey = 'rain' | 'campfire' | 'waves' | 'forest' | 'cafe' | 'whitenoise';

export interface AmbientSoundMeta {
  /** Название и описание — ключи audio.sounds.<id>.name|description в словаре */
  id: AmbientSoundKey;
  icon: string;
}

export const AMBIENT_SOUNDS: AmbientSoundMeta[] = [
  {
    id: 'rain',
    icon: '🌧️',
  },
  {
    id: 'campfire',
    icon: '🔥',
  },
  {
    id: 'waves',
    icon: '🌊',
  },
  {
    id: 'forest',
    icon: '🌲',
  },
  {
    id: 'cafe',
    icon: '☕',
  },
  {
    id: 'whitenoise',
    icon: '🎧',
  },
];

interface AudioStoreState {
  activeTracks: Record<AmbientSoundKey, boolean>;
  trackVolumes: Record<AmbientSoundKey, number>;
  masterVolume: number;
  isMuted: boolean;

  toggleTrack: (id: AmbientSoundKey) => void;
  setTrackVolume: (id: AmbientSoundKey, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleMute: () => void;
  stopAll: () => void;
}

// Активные запущенные инстансы синтезаторов
const activeInstances = new Map<AmbientSoundKey, SoundInstance>();

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => ({
      activeTracks: {
        rain: false,
        campfire: false,
        waves: false,
        forest: false,
        cafe: false,
        whitenoise: false,
      },
      trackVolumes: {
        rain: 0.5,
        campfire: 0.5,
        waves: 0.5,
        forest: 0.5,
        cafe: 0.5,
        whitenoise: 0.4,
      },
      masterVolume: 0.8,
      isMuted: false,

      toggleTrack: (id) => {
        const state = get();
        const nextActive = !state.activeTracks[id];

        if (nextActive) {
          const effectiveVolume = state.isMuted
            ? 0
            : (state.trackVolumes[id] ?? 0.5) * state.masterVolume;

          const playerMap: Record<AmbientSoundKey, (v: number) => SoundInstance> = {
            rain: playRainSound,
            campfire: playCampfireSound,
            waves: playWavesSound,
            forest: playForestSound,
            cafe: playCafeSound,
            whitenoise: playWhiteNoiseSound,
          };

          const instance = playerMap[id]?.(effectiveVolume);
          if (instance) {
            activeInstances.set(id, instance);
          }
        } else {
          const instance = activeInstances.get(id);
          if (instance) {
            instance.stop();
            activeInstances.delete(id);
          }
        }

        set({
          activeTracks: {
            ...state.activeTracks,
            [id]: nextActive,
          },
        });
      },

      setTrackVolume: (id, volume) => {
        const state = get();
        const effective = state.isMuted ? 0 : volume * state.masterVolume;
        activeInstances.get(id)?.setVolume(effective);

        set({
          trackVolumes: {
            ...state.trackVolumes,
            [id]: volume,
          },
        });
      },

      setMasterVolume: (volume) => {
        const state = get();
        for (const [id, instance] of activeInstances.entries()) {
          const trackVol = state.trackVolumes[id] ?? 0.5;
          const effective = state.isMuted ? 0 : trackVol * volume;
          instance.setVolume(effective);
        }

        set({ masterVolume: volume });
      },

      toggleMute: () => {
        const state = get();
        const nextMuted = !state.isMuted;

        for (const [id, instance] of activeInstances.entries()) {
          const trackVol = state.trackVolumes[id] ?? 0.5;
          const effective = nextMuted ? 0 : trackVol * state.masterVolume;
          instance.setVolume(effective);
        }

        set({ isMuted: nextMuted });
      },

      stopAll: () => {
        for (const instance of activeInstances.values()) {
          instance.stop();
        }
        activeInstances.clear();

        set({
          activeTracks: {
            rain: false,
            campfire: false,
            waves: false,
            forest: false,
            cafe: false,
            whitenoise: false,
          },
        });
      },
    }),
    {
      name: 'dashflow_ambient_audio_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trackVolumes: state.trackVolumes,
        masterVolume: state.masterVolume,
      }),
    },
  ),
);
