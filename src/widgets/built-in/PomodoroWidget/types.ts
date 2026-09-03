export interface PomodoroSettings {
  workTime?: number; // в минутах
  breakTime?: number; // в минутах
  longBreakTime?: number; // в минутах
  sessionsBeforeLongBreak?: number;
  autoStartBreaks?: boolean;
  soundEnabled?: boolean;
  soundType?: 'bell' | 'chime' | 'beep';
  focusNoiseEnabled?: boolean;
  timerStyle?: 'ring' | 'digital';
}
