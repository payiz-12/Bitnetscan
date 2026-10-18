/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bitnet: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        // Brand colors. petrol (#016976) is the primary color, terracotta (#D68142) the accent.
        petrol: {
          DEFAULT: '#016976',
          50: '#EBF6F7',
          100: '#D3ECEF',
          200: '#A7D9DF',
          300: '#74BFC8',
          400: '#3A98A4',
          500: '#016976',
          600: '#015661',
          700: '#01424B',
          800: '#023239',
          900: '#02242A',
        },
        terracotta: {
          DEFAULT: '#D68142',
          50: '#FDF8F4',
          100: '#FBF0E6',
          200: '#F6DCC4',
          300: '#EEBD92',
          400: '#E29E66',
          500: '#D68142',
          600: '#BD6E32',
          700: '#9C5622',
          800: '#7A431B',
          900: '#5C3215',
        },
        navy: {
          DEFAULT: '#1A2B3F',
          50: '#F4F6F9',
          100: '#E5EAF1',
          200: '#C7D4E3',
          700: '#2A3F58',
          800: '#1A2B3F',
          900: '#111E2D',
          950: '#0B131D',
        },
        linen: {
          50: '#FAF8F4',
          100: '#F4F0E8',
          200: '#EBE5D9',
          300: '#DFD8C7',
          400: '#CEC4AF',
        },
        sand: {
          50: '#FAF8F4',
          100: '#F4F0E8',
          200: '#EBE5D9',
          300: '#DFD8C7',
          400: '#CEC4AF',
        },
        brand: {
          gold: '#f59e0b',
          cyan: '#06b6d4',
          blue: '#3b82f6',
          dark: '#0a0e17',
          darker: '#06090e',
          card: '#111827',
          cardBorder: '#1f2937',
          muted: '#9ca3af',
        }
      },
      // Soft, slightly cool shadows; xs and 2xs are used across the app (not built into Tailwind 3).
      boxShadow: {
        '2xs': '0 1px 1px rgba(15, 23, 42, 0.04)',
        xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
        sm: '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.04)',
        md: '0 2px 4px rgba(15, 23, 42, 0.05), 0 8px 20px rgba(15, 23, 42, 0.06)',
        lg: '0 4px 8px rgba(15, 23, 42, 0.05), 0 16px 36px rgba(15, 23, 42, 0.10)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.2))' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
