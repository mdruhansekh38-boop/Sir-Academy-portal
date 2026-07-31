/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF4ED',
          100: '#FFE6D4',
          200: '#FFC9A3',
          300: '#FFA866',
          400: '#F58220',
          500: '#E85A2A',
          600: '#CC4A1E',
          700: '#A33A18',
          800: '#7A2D12',
          900: '#4A1B09',
        },
        navy: {
          950: '#080B14',
          900: '#0B0F19',
          800: '#111827',
          700: '#1B2435',
          600: '#283246',
        },
        offwhite: '#F9FAFB',
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 24px 70px -18px rgba(0,0,0,0.55), 0 10px 28px -14px rgba(0,0,0,0.4)',
        glow: '0 0 40px -8px rgba(232,90,42,0.45)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(26px)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.45' },
          '50%': { opacity: '0.8' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        fadeIn: 'fadeIn .6s ease-out both',
        fadeInUp: 'fadeInUp .7s cubic-bezier(.16,.84,.44,1) both',
        fadeInDown: 'fadeInDown .6s ease-out both',
        float: 'float 9s ease-in-out infinite',
        floatSlow: 'floatSlow 12s ease-in-out infinite',
        glowPulse: 'glowPulse 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
