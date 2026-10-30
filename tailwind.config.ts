import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F172A',
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        cobalt: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        coral: {
          DEFAULT: '#EA580C',
          50: '#FFF7ED',
          100: '#FFEDD5',
          600: '#EA580C',
          700: '#C2410C',
        },
        emerald: {
          DEFAULT: '#059669',
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#059669',
          700: '#047857',
        },
        crimson: {
          DEFAULT: '#E11D48',
          50: '#FFF1F2',
          100: '#FFE4E6',
          600: '#E11D48',
          700: '#BE123C',
        },
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        pixel: ['var(--font-pixelify)', 'monospace'],
        editorial: ['var(--font-instrument-serif)', 'serif'],
      },
      boxShadow: {
        'glass-card': '0 24px 60px -15px rgba(15, 23, 42, 0.07), 0 4px 16px -2px rgba(15, 23, 42, 0.03)',
        'glass-hover': '0 32px 70px -12px rgba(15, 23, 42, 0.12), 0 8px 24px -4px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
