/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './public/**/*.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sofia Sans', 'system-ui', 'sans-serif']
      },
      colors: {
        // Темная тема
        dark: {
          bg: '#12232E',
          accent: '#007CC7',
          'accent-secondary': '#4DA8DA',
          shadow: '#203647',
          light: '#EEFBFB'
        },
        // Светлая тема
        light: {
          bg: '#F5FAFD',
          text: '#1A3A4A',
          accent: '#007CC7',
          'accent-secondary': '#4DA8DA',
          shadow: '#9BBECF'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      gridTemplateColumns: {
        'dashboard': 'repeat(auto-fit, minmax(300px, 1fr))',
        '12': 'repeat(12, 1fr)',
        '16': 'repeat(16, 1fr)',
        '24': 'repeat(24, 1fr)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};