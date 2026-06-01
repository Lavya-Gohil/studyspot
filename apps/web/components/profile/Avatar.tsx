import Image from 'next/image'
import { getInitials, getAvatarGradient } from '@studyspot/utils'

interface AvatarProps {
  userId: string
  name: string | null
  avatarUrl: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  xs: { px: 24, text: 'text-[9px]' },
  sm: { px: 32, text: 'text-xs' },
  md: { px: 40, text: 'text-sm' },
  lg: { px: 56, text: 'text-base' },
  xl: { px: 80, text: 'text-xl' },
}

export function Avatar({ userId, name, avatarUrl, size = 'md' }: AvatarProps) {
  const { px, text } = sizes[size]
  const initials = getInitials(name)
  const gradient = getAvatarGradient(userId)

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center`}
      style={{ width: px, height: px }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name || 'User'}
          width={px}
          height={px}
          className="w-full h-full object-cover"
          unoptimized
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-semibold text-white ${text}`}
          style={{ background: gradient }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
