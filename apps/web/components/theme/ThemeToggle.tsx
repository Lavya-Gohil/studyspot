'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'

type Theme = 'dark' | 'light'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
    setTheme(current)
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary ${className}`}
    >
      {/* Avoid hydration flash: render nothing icon-specific until mounted */}
      <Icon as={mounted && theme === 'dark' ? Sun : Moon} size="md" />
    </button>
  )
}
