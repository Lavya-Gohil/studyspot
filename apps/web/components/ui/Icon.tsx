/**
 * The icon layer.
 *
 * Before this existed there were 45 hand-rolled inline <svg> elements across
 * 25 files, each picking its own viewBox, stroke width and size, app/page.tsx
 * alone declared seven local icon components. Nothing enforced consistency, so
 * there wasn't any. Emoji filled the remaining gaps, which is worse: emoji
 * render differently on every OS, can't inherit currentColor, and are the
 * single loudest "generated" signal a UI can send.
 *
 * USAGE, import the lucide glyph directly and wrap it:
 *
 *   import { Search } from 'lucide-react'
 *   import { Icon } from '@/components/ui/Icon'
 *
 *   <Icon as={Search} size="sm" />
 *
 * Importing from 'lucide-react' at the call site is deliberate. Next 14 lists
 * lucide-react in its default `optimizePackageImports`, so each named import is
 * rewritten to a direct path and only the glyphs actually used are bundled. A
 * central `{ name: Component }` map would defeat that entirely; it would make
 * every icon reachable from every importer, which is the same class of mistake
 * as the components/ui barrel documented in ./index.ts.
 *
 * This module is server-safe: pure SVG, no state, no 'use client'.
 */
import type { LucideIcon } from 'lucide-react'

export const ICON_SIZES = { xs: 14, sm: 16, md: 18, lg: 22, xl: 28 } as const

export type IconSize = keyof typeof ICON_SIZES

/**
 * Stroke thins as the glyph grows so optical weight stays constant. A 1.75
 * stroke that looks right at 16px reads as a crayon at 28px.
 */
const STROKE: Record<IconSize, number> = {
  xs: 2,
  sm: 1.9,
  md: 1.75,
  lg: 1.65,
  xl: 1.5,
}

export interface IconProps {
  /**
   * Typed as lucide's own `LucideIcon` rather than a hand-rolled
   * `ComponentType<SVGProps>`. Lucide glyphs are forwardRef components whose
   * `propTypes` are contravariant with a plain SVG prop bag, so a
   * structurally-similar local type fails to accept them. The brand glyphs
   * below are standalone components and take their own props.
   */
  as: LucideIcon
  size?: IconSize
  className?: string
  /** Override only when a specific glyph reads too light or too heavy. */
  strokeWidth?: number
  /**
   * Icons are decorative by default and hidden from assistive tech, the
   * adjacent label carries the meaning. Pass a label only when the icon is
   * genuinely the sole content of a control, and prefer labelling the control.
   */
  label?: string
}

export function Icon({ as: Glyph, size = 'md', className, strokeWidth, label }: IconProps) {
  return (
    <Glyph
      width={ICON_SIZES[size]}
      height={ICON_SIZES[size]}
      strokeWidth={strokeWidth ?? STROKE[size]}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  )
}

/* ============================================================
   Brand glyphs.

   Hand-drawn, because these four carry the identity and a stock
   set would make the product look like every other product using
   the same stock set. Everything else is lucide.
   ============================================================ */

type BrandIconProps = {
  size?: IconSize
  className?: string
}

const brandFrame = (size: IconSize) => ({
  width: ICON_SIZES[size],
  height: ICON_SIZES[size],
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  focusable: 'false' as const,
  'aria-hidden': true,
})

/**
 * The mark: a point held between two brackets, "the spot".
 * Deliberately not a map pin. Every local-discovery product is a map pin.
 */
export function LogoMark({ size = 'md', className }: BrandIconProps) {
  return (
    <svg {...brandFrame(size)} className={className}>
      <path
        d="M9.25 3.5H6.5A2.5 2.5 0 0 0 4 6v12a2.5 2.5 0 0 0 2.5 2.5h2.75M14.75 3.5h2.75A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2.5h-2.75"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.75" fill="currentColor" />
    </svg>
  )
}

/** Streak. Distinct silhouette from lucide's Flame, taller, with a core. */
export function FlameIcon({ size = 'md', className }: BrandIconProps) {
  return (
    <svg {...brandFrame(size)} className={className}>
      <path
        d="M13 2.5c.4 2.9-.8 4.6-2.4 6.2C9 10.3 7.5 11.8 7.5 14.2a5.5 5.5 0 0 0 11 0c0-2.6-1.3-4.3-2.6-5.9.2 1.6-.4 2.7-1.3 3.2.6-3.3-.4-6.7-1.6-9z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M13 2.5c.4 2.9-.8 4.6-2.4 6.2C9 10.3 7.5 11.8 7.5 14.2a5.5 5.5 0 0 0 11 0c0-2.6-1.3-4.3-2.6-5.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 21.4a2.9 2.9 0 0 1-2.9-2.9c0-1.6 1.1-2.4 1.8-3.5.8 1.3 1.9 1.9 2.5 3.1.5 1-.3 3.3-1.4 3.3z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Focus timer: a ring with a deliberate gap, and a fixed centre. */
export function FocusIcon({ size = 'md', className }: BrandIconProps) {
  return (
    <svg {...brandFrame(size)} className={className}>
      <path
        d="M12 3a9 9 0 0 1 9 9M21 12a9 9 0 0 1-9 9M12 21a9 9 0 0 1-9-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

/** Live activity. Pairs with the .live-dot gesture in globals.css. */
export function PulseIcon({ size = 'md', className }: BrandIconProps) {
  return (
    <svg {...brandFrame(size)} className={className}>
      <path
        d="M2.75 12.5h3.4l1.9-5.6a.6.6 0 0 1 1.14.03l3 10.4a.6.6 0 0 0 1.15.02l2.1-6.5a.6.6 0 0 1 1.1-.08l1.1 2.2a.6.6 0 0 0 .54.33h3.07"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
