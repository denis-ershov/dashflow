import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  currentTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  setSystemTheme: (theme: 'light' | 'dark') => void;
  initializeTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    body.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'auto',
      systemTheme: getSystemTheme(),
      currentTheme: getSystemTheme(),
      
      setTheme: (theme: Theme) => {
        set({ theme });
        
        const { systemTheme } = get();
        const actualTheme = theme === 'auto' ? systemTheme : theme;
        
        set({ currentTheme: actualTheme });
        applyTheme(actualTheme);
      },
      
      setSystemTheme: (systemTheme: 'light' | 'dark') => {
        set({ systemTheme });
        
        const { theme } = get();
        if (theme === 'auto') {
          set({ currentTheme: systemTheme });
          applyTheme(systemTheme);
        }
      },
      
      initializeTheme: () => {
        const { theme, systemTheme } = get();
        const actualTheme = theme === 'auto' ? systemTheme : theme;
        
        set({ currentTheme: actualTheme });
        applyTheme(actualTheme);
        
        // Слушаем изменения системной темы
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            get().setSystemTheme(newSystemTheme);
          });
        }
      }
    }),
    {
      name: 'dashboard-theme',
      partialize: (state) => ({ theme: state.theme })
    }
  )
);