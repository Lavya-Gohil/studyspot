export function formatSessionTime(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const now = new Date()

  const isToday = start.toDateString() === now.toDateString()
  const isTomorrow =
    start.toDateString() === new Date(now.getTime() + 86400000).toDateString()

  const dateStr = isToday
    ? 'Today'
    : isTomorrow
    ? 'Tomorrow'
    : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const startStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const endStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const durationHours = (end.getTime() - start.getTime()) / 3600000

  return `${dateStr} · ${startStr} – ${endStr} · ${
    durationHours % 1 === 0 ? durationHours + 'h' : durationHours.toFixed(1) + 'h'
  }`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatCountdown(startTime: string): string {
  const start = new Date(startTime)
  const now = new Date()
  const diff = start.getTime() - now.getTime()

  if (diff <= 0) return 'Started'
  if (diff < 3600000) return `Starts in ${Math.floor(diff / 60000)}m`
  if (diff < 86400000)
    return `Starts in ${Math.floor(diff / 3600000)}h ${Math.floor(
      (diff % 3600000) / 60000
    )}m`
  return `Starts ${start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Evenly spaced hues, so two people in the same list are never near-twins. */
const AVATAR_HUES = 12

/**
 * Lightness per hue, solved so white initials land on 4.8:1 everywhere.
 *
 * HSL lightness is not perceptual: at a single fixed L, yellow-green comes out
 * more than twice as bright as blue. Holding L constant across the wheel gave
 * 8.7:1 on the indigo and 2.2:1 on the chartreuse: the same nominal colour
 * value, half of it unreadable. These are solved per hue against the WCAG
 * relative-luminance formula rather than eyeballed.
 */
const AVATAR_LIGHTNESS = [49.2, 36.7, 30.3, 32.2, 33, 32.4, 34.7, 51.3, 60, 55.1, 48.2, 51.3]

/**
 * A deterministic avatar gradient for someone with no photo.
 *
 * This was ten hand-picked gradient pairs, hot pink into orange, purple into
 * magenta, which read as ten unrelated products rather than one. They are now
 * generated from a single rule: pick one of twelve hues from the id, and run
 * it into a neighbouring hue a little deeper. That is the same idea as the
 * brand ramp, where the hue rotates as it darkens, so an avatar looks lit
 * rather than filled and sits beside the turquoise instead of fighting it.
 *
 * Saturation and lightness are fixed, which is what keeps the set coherent:
 * only hue varies. The end lightness is chosen so the white initials on top
 * clear AA at every avatar size.
 */
export function getAvatarGradient(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  // The 8° offset keeps the wheel off pure red/green/blue, which look
  // like defaults; 140deg matches the brand gradient's angle.
  const step = Math.abs(hash) % AVATAR_HUES
  const hue = step * (360 / AVATAR_HUES) + 8
  const light = AVATAR_LIGHTNESS[step]
  const deeper = (hue + 26) % 360

  // The second stop is 12 points darker, so the contrast floor is set by the
  // first, which is the one the table solves for.
  return `linear-gradient(140deg, hsl(${hue} 56% ${light}%), hsl(${deeper} 62% ${light - 12}%))`
}
