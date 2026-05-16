/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        carthing: { raw: '(width: 800px) and (height: 480px)' },
      },
      colors: {
        clawd: {
          bg: '#0b0d10',
          panel: '#15181d',
          muted: '#5b6470',
          fg: '#e6e8eb',
          ok: '#3fb950',
          warn: '#d29922',
          err: '#f85149',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        breath: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translate(0,0) rotate(0deg)' },
          '20%': { transform: 'translate(-1.5%, -1%) rotate(-1deg)' },
          '40%': { transform: 'translate(1.5%, 1%) rotate(1deg)' },
          '60%': { transform: 'translate(-1%, 1%) rotate(-0.5deg)' },
          '80%': { transform: 'translate(1%, -1%) rotate(0.5deg)' },
        },
        blink: {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '96%': { transform: 'scaleY(0.1)' },
        },
        gauge: {
          '0%, 100%': { transform: 'rotate(-50deg)' },
          '50%': { transform: 'rotate(50deg)' },
        },
      },
      animation: {
        'mood-idle': 'breath 4s ease-in-out infinite',
        'mood-active': 'breath 2.2s ease-in-out infinite',
        'mood-busy': 'bob 0.9s ease-in-out infinite',
        'mood-frantic': 'shake 0.18s linear infinite',
        'blink-slow': 'blink 6s linear infinite',
        'blink-fast': 'blink 2.5s linear infinite',
        'gauge-slow': 'gauge 6s ease-in-out infinite',
        'gauge-active': 'gauge 3s ease-in-out infinite',
        'gauge-busy': 'gauge 1.2s ease-in-out infinite',
        'gauge-frantic': 'gauge 0.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
