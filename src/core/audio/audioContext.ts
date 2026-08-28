let audioCtxInstance: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtxInstance) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxInstance = new AudioContextClass();
    }
  }

  if (audioCtxInstance && audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume().catch(() => {});
  }

  return audioCtxInstance;
}
