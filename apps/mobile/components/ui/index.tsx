import { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '@/lib/theme'

/**
 * The mobile primitive set.
 *
 * Every screen written before this one carried its own inline style objects,
 * which is how the app ended up with four different card corner radii and a
 * button that was a slightly different height on every screen. These are the
 * same roles the web primitives cover, named the same way, so a change of
 * mind about elevation or spacing happens once.
 *
 * A single file rather than one per component: the whole set is smaller than
 * one web primitive, and Metro has no barrel-import cost to avoid.
 */

const RADIUS = { sm: 8, md: 12, lg: 16, pill: 999 } as const

/* ------------------------------- Screen ------------------------------- */

/**
 * Page container. Owns the background and the safe-area insets.
 *
 * The top padding is the REAL inset, not a guess. A fixed 56 is right on
 * roughly one phone: it clips under a Dynamic Island and leaves a visible gap
 * on a device with no notch at all.
 *
 * The bottom is a plain gap rather than insets.bottom, because a screen inside
 * the tab navigator is already laid out above the bar, and the bar carries the
 * inset itself. Adding it here too would double it.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshControl,
}: {
  children: ReactNode
  scroll?: boolean
  padded?: boolean
  refreshControl?: ScrollViewProps['refreshControl']
}) {
  const insets = useSafeAreaInsets()
  const inner = {
    paddingHorizontal: padded ? 16 : 0,
    paddingTop: insets.top + 12,
    paddingBottom: 32,
    gap: 16,
  }

  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: theme.bg.base, ...inner }}>{children}</View>
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.base }}
      contentContainerStyle={inner}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  )
}

/* ------------------------------ Typography ---------------------------- */

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>{children}</Text>
  )
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 14, color: theme.text.secondary }}>{children}</Text>
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: theme.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}
    >
      {children}
    </Text>
  )
}

/* -------------------------------- Card -------------------------------- */

export function Card({
  children,
  onPress,
  padded = true,
}: {
  children: ReactNode
  onPress?: () => void
  padded?: boolean
}) {
  const style = {
    backgroundColor: theme.bg.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    padding: padded ? 14 : 0,
    gap: 6,
  }

  if (!onPress) return <View style={style}>{children}</View>
  return (
    <Pressable
      onPress={onPress}
      // Touch feedback is opacity rather than a background change: a colour
      // swap on a translucent surface reads as a flicker on OLED.
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}
    >
      {children}
    </Pressable>
  )
}

/* ------------------------------- Button ------------------------------- */

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
}: {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 36 : 46
  const off = disabled || loading

  // brand.fg, never white: white on the turquoise fill is 1.95:1.
  const fg =
    variant === 'primary'
      ? theme.brand.fg
      : variant === 'secondary'
        ? theme.text.primary
        : theme.text.secondary

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        {
          height,
          borderRadius: RADIUS.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 18,
          backgroundColor:
            variant === 'primary'
              ? theme.brand.primary
              : variant === 'secondary'
                ? theme.bg.elevated
                : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.border.default,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '600', fontSize: size === 'sm' ? 13 : 15 }}>
        {label}
      </Text>
    </Pressable>
  )
}

/* -------------------------------- Chip -------------------------------- */

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string
  selected?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: RADIUS.pill,
          borderWidth: 1,
          borderColor: selected ? theme.brand.text : theme.border.default,
          backgroundColor: selected ? theme.brand.tint : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          color: selected ? theme.brand.text : theme.text.secondary,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/* ------------------------------ Progress ------------------------------ */

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height: 8, borderRadius: RADIUS.pill, backgroundColor: theme.bg.subtle, overflow: 'hidden' }}
    >
      <View
        style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.brand.primary }}
      />
    </View>
  )
}

/* ------------------------------ StatTile ------------------------------ */

export function StatTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 84 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text.primary }}>
        {value}
        {unit ? (
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.tertiary }}> {unit}</Text>
        ) : null}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: theme.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

/* ------------------------------- Avatar ------------------------------- */

export function Avatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.bg.subtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  )
}

/* ----------------------------- EmptyState ----------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <View style={{ paddingVertical: 44, alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary, textAlign: 'center', maxWidth: 280 }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  )
}

/* ------------------------------ Loading ------------------------------- */

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={theme.brand.text} />
    </View>
  )
}
