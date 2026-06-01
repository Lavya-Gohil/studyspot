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

export function getAvatarGradient(userId: string): string {
  const gradients = [
    'linear-gradient(135deg, #7B61FF, #9B59B6)',
    'linear-gradient(135deg, #00E5A0, #00B4D8)',
    'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    'linear-gradient(135deg, #4ECDC4, #556270)',
    'linear-gradient(135deg, #A8E063, #56AB2F)',
    'linear-gradient(135deg, #F7971E, #FFD200)',
    'linear-gradient(135deg, #ee0979, #ff6a00)',
    'linear-gradient(135deg, #1FA2FF, #12D8FA)',
    'linear-gradient(135deg, #D4145A, #FBB03B)',
    'linear-gradient(135deg, #662D8C, #ED1E79)',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}
