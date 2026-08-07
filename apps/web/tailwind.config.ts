import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          subtle: 'rgb(var(--bg-subtle) / <alpha-value>)',
        },
        // Neutral emphasis, white on dark, near-black on light.
        // Most of the UI. Not the brand.
        accent: {
          primary: 'rgb(var(--accent-primary) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          amber: 'rgb(var(--accent-amber) / <alpha-value>)',
          red: 'rgb(var(--accent-red) / <alpha-value>)',
        },
        // The signature colour, as an eleven-step hue-shifted ramp.
        // Reach for a numbered step when you need a specific tone
        // (borders, tints, gradient stops) and for the named roles
        // otherwise: `primary` is a FILL (pair with `brand-fg`),
        // `text` is the readable-as-text variant and resolves to a
        // different step per theme, see globals.css.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover) / <alpha-value>)',
          fg: 'rgb(var(--brand-fg) / <alpha-value>)',
          text: 'rgb(var(--brand-text) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },
      backgroundImage: {
        royal: 'var(--gradient-royal)',
        'royal-soft': 'var(--gradient-royal-soft)',
        brand: 'var(--gradient-brand)',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Outfit', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        // Neutral, single-direction elevation; tint adapts per theme.
        soft: '0 1px 2px rgba(0,0,0,0.12), 0 8px 24px -12px var(--shadow-tint)',
        lift: '0 2px 4px rgba(0,0,0,0.14), 0 24px 56px -16px var(--shadow-tint)',
        glass: '0 8px 40px -12px rgba(0,0,0,0.5)',
        // Tinted, not black, see the note on --brand-glow.
        glow: '0 8px 28px -8px var(--brand-glow), 0 2px 10px -3px var(--brand-glow-soft)',
        'glow-sm': '0 0 16px -4px var(--brand-glow-soft)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      // Durations and easings mirror the motion tokens in globals.css;
      // reach for `duration-fast`/`ease-out` rather than an ad-hoc ms value,
      // so a new component inherits the system instead of inventing a number.
      transitionDuration: {
        fast: 'var(--dur-1)',
        DEFAULT: 'var(--dur-2)',
        medium: 'var(--dur-3)',
        slow: 'var(--dur-4)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
        move: 'var(--ease-move)',
        in: 'var(--ease-in)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn var(--dur-3) var(--ease-out) forwards',
        'slide-up': 'slideUp var(--dur-3) var(--ease-out) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
