import type { Config } from 'tailwindcss'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nativewindPreset = require('nativewind/preset')
import { theme as tokens } from './lib/theme'

/**
 * Nested to match apps/web/tailwind.config.ts exactly, so a class name means
 * the same thing in both apps: `bg-bg-base`, `text-text-secondary`,
 * `bg-brand-primary`, `text-brand-text`.
 *
 * TypeScript rather than JS so the values can be imported from lib/theme.ts
 * — the one place the palette is written down — instead of being copied here
 * and left to drift. Tailwind 3.4 loads a .ts config natively, and NativeWind
 * resolves `tailwind.config` without an extension.
 */
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: {
        bg: tokens.bg,
        accent: tokens.accent,
        brand: tokens.brand,
        text: tokens.text,
        border: tokens.border,
      },
    },
  },
  plugins: [],
}

export default config
