export interface ClockSettings {
  is24Hour?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
  clockStyle?: 'digital' | 'minimal' | 'serif' | 'flip' | 'mono';
  showGreeting?: boolean;
  userName?: string;
  timezone?: string;
  blinkColon?: boolean;
  glowEffect?: boolean;
  dateFormat?: 'full' | 'short' | 'numeric';
}
