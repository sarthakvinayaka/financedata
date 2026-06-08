import type { Config } from 'tailwindcss'

// ─── JoinSafe Tailwind Design System ─────────────────────────────────────────
// Colors defined here as raw values match the CSS channel triplets in globals.css.
// Semantic tokens (bg-base, text-primary, etc.) are pure CSS utilities in globals.css.
// Use the Tailwind palette for structural/primitive styling.

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    // Override Tailwind's default stone with our warm stone — avoid the clashing name
    extend: {
      colors: {
        // ── Brand: Smoked Aubergine / Deep Plum ─────────────────────────────
        plum: {
          50:  '#F5EEFA',
          100: '#E5D4F0',
          200: '#CBA9E1',
          300: '#AE7ED0',
          400: '#8F57BC',
          500: '#7136A2',
          600: '#582880',
          700: '#421C60',  // ← PRIMARY (smoked aubergine)
          800: '#2C1242',
          900: '#18092A',
          950: '#0E0516',
        },
        // ── Warm Stone Neutrals ──────────────────────────────────────────────
        warm: {
          50:  '#FAFAF7',  // ivory
          100: '#F4F1EC',  // parchment
          200: '#E8E4DC',
          300: '#D6D1C7',
          400: '#B7B0A4',
          500: '#938B7E',
          600: '#6E6659',
          700: '#504840',
          800: '#322C24',
          900: '#1C1711',
          950: '#100E09',
        },
        // ── Mist (cool neutral) ──────────────────────────────────────────────
        mist: {
          100: '#EAEBEf',
          200: '#D5D8E0',
          300: '#BCC0CC',
          400: '#9CA1B2',
        },
        // ── Risk Tiers (muted, sophisticated) ────────────────────────────────
        sage: {
          50:  '#EEF5EF',
          100: '#D1E8D4',
          200: '#A4D1A9',
          300: '#6CB576',
          400: '#44944F',
          500: '#2E7638',  // STABLE
          600: '#235C2C',
          700: '#194421',
          800: '#102C16',
        },
        harvest: {
          50:  '#FBF6E3',
          100: '#F5E9BF',
          200: '#EDCE7E',
          300: '#E0B13C',
          400: '#C89416',
          500: '#A27610',  // WATCH
          600: '#7E5C09',
          700: '#5A4206',
          800: '#382904',
        },
        oxblood: {
          50:  '#F6EBEE',
          100: '#E9C9D0',
          200: '#D298A6',
          300: '#B8677E',
          400: '#9C425C',  // HIGH
          500: '#7E2840',  // CRITICAL
          600: '#622031',
          700: '#481624',
          800: '#2E0E17',
        },
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', '"Times New Roman"', 'serif'],
        sans:    ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', '"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        'xxs':   ['0.6875rem', { lineHeight: '1.3',  letterSpacing: '0.04em' }],
        'xs':    ['0.75rem',   { lineHeight: '1.4' }],
        'sm':    ['0.875rem',  { lineHeight: '1.55' }],
        'base':  ['1rem',      { lineHeight: '1.65' }],
        'md':    ['1.0625rem', { lineHeight: '1.6' }],
        'lg':    ['1.125rem',  { lineHeight: '1.55' }],
        'xl':    ['1.25rem',   { lineHeight: '1.45' }],
        '2xl':   ['1.5rem',    { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        '3xl':   ['1.875rem',  { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        '4xl':   ['2.25rem',   { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '5xl':   ['3rem',      { lineHeight: '1.10', letterSpacing: '-0.02em' }],
        '6xl':   ['3.75rem',   { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '7xl':   ['4.5rem',    { lineHeight: '1.0',  letterSpacing: '-0.03em' }],
        '8xl':   ['6rem',      { lineHeight: '0.95', letterSpacing: '-0.03em' }],
      },

      // ── Spacing ─────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '17':  '4.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        '34':  '8.5rem',
      },

      // ── Border radius ────────────────────────────────────────────────────────
      borderRadius: {
        'xs':   'var(--radius-xs)',
        'sm':   'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        'md':   'var(--radius-md)',
        'lg':   'var(--radius-lg)',
        'xl':   'var(--radius-xl)',
        '2xl':  'var(--radius-2xl)',
        'pill': 'var(--radius-pill)',
      },

      // ── Shadows ──────────────────────────────────────────────────────────────
      boxShadow: {
        'xs':      'var(--shadow-xs)',
        'sm':      'var(--shadow-sm)',
        'surface': 'var(--shadow-sm)',
        'card':    'var(--shadow-md)',
        'overlay': 'var(--shadow-lg)',
        'modal':   'var(--shadow-xl)',
        // Inner glow for active states
        'inner-plum': 'inset 0 0 0 2px rgb(var(--plum-200) / 0.5)',
      },

      // ── Animations ───────────────────────────────────────────────────────────
      animation: {
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-up':       'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'skeleton':       'skeleton-shimmer 1.6s ease-in-out infinite',
        'pulse-subtle':   'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in':        { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up':       { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'skeleton-shimmer': { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'pulse-subtle':   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
      },

      // ── Max widths ───────────────────────────────────────────────────────────
      maxWidth: {
        'prose':  '68ch',
        'narrow': '40rem',
        'site':   '72rem',
        'wide':   '88rem',
      },

      // ── Transition ───────────────────────────────────────────────────────────
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
}

export default config
