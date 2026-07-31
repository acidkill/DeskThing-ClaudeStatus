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
        walk: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2.5deg)' },
          '25%': { transform: 'translateY(-2%) rotate(0deg)' },
          '50%': { transform: 'translateY(0) rotate(2.5deg)' },
          '75%': { transform: 'translateY(-2%) rotate(0deg)' },
        },
        jump: {
          '0%, 100%': { transform: 'translateY(0) scale(1, 1)' },
          '18%': { transform: 'translateY(0) scale(1.06, 0.92)' },
          '50%': { transform: 'translateY(-14%) scale(0.97, 1.05)' },
          '82%': { transform: 'translateY(0) scale(1.04, 0.95)' },
        },
        sway: {
          '0%, 100%': { transform: 'translateX(-2%) rotate(-4deg)' },
          '50%': { transform: 'translateX(2%) rotate(4deg)' },
        },
        bounceSquash: {
          '0%, 100%': { transform: 'translateY(0) scale(1.04, 0.94)' },
          '45%': { transform: 'translateY(-9%) scale(0.98, 1.04)' },
        },
        lean: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '50%': { transform: 'translateX(-2.5%) rotate(-6deg)' },
        },
        nod: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(2%) rotate(3.5deg)' },
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
        // Mascot rig motions — one utility per Motion member in animations.ts.
        // 'still' has no utility on purpose; the renderer applies no class.
        'motion-breathe': 'breath 4s ease-in-out infinite',
        'motion-bob': 'bob 1.6s ease-in-out infinite',
        'motion-walk': 'walk 0.8s ease-in-out infinite',
        'motion-jump': 'jump 1.1s ease-in-out infinite',
        'motion-sway': 'sway 2s ease-in-out infinite',
        'motion-bounce': 'bounceSquash 0.6s ease-in-out infinite',
        'motion-shake': 'shake 0.18s linear infinite',
        'motion-lean': 'lean 3s ease-in-out infinite',
        'motion-nod': 'nod 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
