/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Education-focused teal/mint palette
        primary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Study mode - vibrant green
        study: {
          light: '#DCFCE7',
          DEFAULT: '#22C55E',
          dark: '#16A34A',
        },
        // Quiz mode - warm amber
        quiz: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        // Challenge mode - energetic orange-red
        challenge: {
          light: '#FFEDD5',
          DEFAULT: '#EA580C',
          dark: '#C2410C',
        },
        // Feedback colors
        correct: '#22C55E',
        incorrect: '#EF4444',
        // Background tints
        surface: {
          light: '#F0FDFA',
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'card-word': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'card-definition': ['1.125rem', { lineHeight: '1.6' }],
      },
      borderRadius: {
        'clay': '20px',
        'clay-sm': '14px',
        'clay-lg': '28px',
      },
      boxShadow: {
        // Claymorphism shadows - soft, layered 3D effect
        'clay': '6px 6px 12px rgba(0, 0, 0, 0.08), -4px -4px 10px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.5)',
        'clay-sm': '4px 4px 8px rgba(0, 0, 0, 0.06), -2px -2px 6px rgba(255, 255, 255, 0.8)',
        'clay-lg': '10px 10px 20px rgba(0, 0, 0, 0.1), -6px -6px 14px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.6)',
        'clay-inset': 'inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -2px -2px 6px rgba(255, 255, 255, 0.8)',
        'clay-pressed': 'inset 3px 3px 6px rgba(0, 0, 0, 0.08), inset -1px -1px 4px rgba(255, 255, 255, 0.6)',
        // Legacy shadows
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'mode-card': '8px 8px 16px rgba(0, 0, 0, 0.08), -4px -4px 10px rgba(255, 255, 255, 0.9)',
        'mode-card-hover': '12px 12px 24px rgba(0, 0, 0, 0.1), -6px -6px 14px rgba(255, 255, 255, 0.95)',
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'flip': 'flip 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce-soft 0.4s ease-out',
        'pop': 'pop 0.3s ease-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'bounce-soft': {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
