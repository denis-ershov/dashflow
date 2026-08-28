export interface PomodoroSettings {
  workTime?: number; // в минутах
  breakTime?: number; // в минутах
  longBreakTime?: number; // в минутах
  autoStartBreaks?: boolean;
  soundEnabled?: boolean;
  focusNoiseEnabled?: boolean;
  timerStyle?: 'ring' | 'digital';
}
