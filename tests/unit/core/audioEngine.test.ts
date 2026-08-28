import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore, AMBIENT_SOUNDS } from '@/core/audio';

describe('Ambient Audio Engine & Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAudioStore.getState().stopAll();
  });

  it('contains 6 defined ambient soundscapes', () => {
    expect(AMBIENT_SOUNDS).toHaveLength(6);
    expect(AMBIENT_SOUNDS.map((s) => s.id)).toEqual([
      'rain',
      'campfire',
      'waves',
      'forest',
      'cafe',
      'whitenoise',
    ]);
  });

  it('toggles sound tracks on and off', () => {
    const store = useAudioStore.getState();
    expect(store.activeTracks.rain).toBe(false);

    store.toggleTrack('rain');
    expect(useAudioStore.getState().activeTracks.rain).toBe(true);

    store.toggleTrack('rain');
    expect(useAudioStore.getState().activeTracks.rain).toBe(false);
  });

  it('updates track volume and master volume', () => {
    const store = useAudioStore.getState();

    store.setTrackVolume('campfire', 0.8);
    expect(useAudioStore.getState().trackVolumes.campfire).toBe(0.8);

    store.setMasterVolume(0.5);
    expect(useAudioStore.getState().masterVolume).toBe(0.5);
  });

  it('mutes and unmutes all audio', () => {
    const store = useAudioStore.getState();
    expect(store.isMuted).toBe(false);

    store.toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(true);

    store.toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(false);
  });

  it('stops all playing tracks', () => {
    const store = useAudioStore.getState();
    store.toggleTrack('rain');
    store.toggleTrack('waves');
    expect(useAudioStore.getState().activeTracks.rain).toBe(true);
    expect(useAudioStore.getState().activeTracks.waves).toBe(true);

    store.stopAll();
    const updated = useAudioStore.getState();
    expect(updated.activeTracks.rain).toBe(false);
    expect(updated.activeTracks.waves).toBe(false);
  });
});
