/**
 * The palette, mirrored from apps/web/app/globals.css.
 *
 * The web defines these as CSS custom properties that switch per theme.
 * React Native has no cascade to hang that on, so mobile pins the dark
 * values — the app has always been dark-only — and keeps the NAMES
 * identical. `bg.base` here and `--bg-base` there are the same colour by
 * construction, and `bg-bg-base` is the same class in both apps.
 *
 * Everything that needs a colour reads it from this object. The web shipped
 * a retired palette for a while because a second literal outlived the token
 * that replaced it; on mobile, where inline hex is the norm, the same mistake
 * would be invisible for far longer.
 *
 * Any change here must be made in globals.css too. There is no build step
 * that can enforce that across a CSS file and a TS module, so the rule is
 * social: change both, in the same commit.
 */

/** The signature turquoise, as an eleven-step hue-shifted ramp. */
export const brandRamp = {
  50: '#E8FDF7',
  100: '#C7F9EC',
  200: '#96F3DD',
  300: '#5DEAD0',
  400: '#2AE5C9',
  500: '#19CCB4', // the signature value
  600: '#11ACA1',
  700: '#0C8886',
  800: '#09696C',
  900: '#08494F',
  950: '#062D32',
} as const

export const theme = {
  bg: {
    base: '#08080A',
    surface: '#0F0F12',
    elevated: '#16161B',
    subtle: '#1F1F25',
  },
  /** Neutral emphasis — most of the UI. Not the brand. */
  accent: {
    primary: '#FAFAFA',
    hover: '#E0E0E4',
    fg: '#0A0A0C',
    green: '#4ADE80',
    amber: '#FBBF24',
    red: '#FB7185',
  },
  brand: {
    ...brandRamp,
    /** A FILL. Pair with `brand.fg`, never with brand as text. */
    primary: brandRamp[500],
    hover: brandRamp[400],
    /** 9.7:1 on the 500 fill. */
    fg: '#0A0A0C',
    /** The readable-as-text variant: 12.5:1 on near-black. */
    text: brandRamp[400],
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#A9A9B2',
    tertiary: '#787882',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.10)',
    strong: 'rgba(255, 255, 255, 0.18)',
  },
} as const
