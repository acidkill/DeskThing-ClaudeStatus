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
    },
  },
  plugins: [],
};
