'use client'

import { useId, useState, type ReactNode } from 'react'

const placements = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

/**
 * Text hint on hover *and* keyboard focus.
 *
 * Tooltips are supplementary only — never put an action or information the
 * user needs here, since touch devices have no hover. For a control whose
 * purpose isn't obvious from its label, the label is the fix, not a tooltip.
 */
export function Tooltip({
  content,
  placement = 'top',
  children,
  className = '',
}: {
  content: ReactNode
  placement?: keyof typeof placements
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      // Escape dismisses, matching the dialog convention.
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-50 w-max max-w-[16rem] rounded-md border border-border-default bg-bg-elevated px-2 py-1 text-xs text-text-primary shadow-lift animate-fade-in ${placements[placement]}`}
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
