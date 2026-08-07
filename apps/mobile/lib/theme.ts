/**
 * The typed way in to the palette. The values live in ./palette.js, see the
 * note there for why that file is CommonJS JavaScript rather than TypeScript.
 *
 * App code imports from here, never from palette.js directly, so that a typo
 * in a token path is a compile error rather than `undefined` painted onto a
 * screen.
 */

type Ramp = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>

export type Theme = {
  bg: { base: string; surface: string; elevated: string; subtle: string }
  accent: {
    primary: string
    hover: string
    fg: string
    green: string
    amber: string
    red: string
  }
  brand: Ramp & {
    primary: string
    hover: string
    fg: string
    text: string
    tint: string
  }
  text: { primary: string; secondary: string; tertiary: string }
  border: { subtle: string; default: string; strong: string }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const palette = require('./palette.js') as { theme: Theme; brandRamp: Ramp }

export const theme: Theme = palette.theme
export const brandRamp: Ramp = palette.brandRamp
