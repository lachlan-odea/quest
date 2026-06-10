/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark tavern palette
        tavern: {
          900: '#120c07',
          800: '#1a120b',
          700: '#241810',
          600: '#33241733',
          500: '#3a291b',
        },
        // Gold accents
        gold: {
          300: '#f3d99b',
          400: '#e8c469',
          500: '#d4a531',
          600: '#b3851d',
        },
        parchment: {
          100: '#f4e9d0',
          200: '#e8d8b0',
          300: '#d9c089',
        },
        ember: '#d9531e',
        mana: '#5b8fd6',
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 18px rgba(212, 165, 49, 0.35)',
      },
      keyframes: {
        'dice-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(360deg) scale(1.15)' },
          '100%': { transform: 'rotate(720deg) scale(1)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'dice-spin': 'dice-spin 0.7s ease-in-out',
        'pop-in': 'pop-in 0.3s ease-out',
        'float-up': 'float-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
