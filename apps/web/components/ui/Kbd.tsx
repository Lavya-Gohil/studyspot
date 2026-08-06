/**
 * A keyboard key.
 *
 * <kbd> is the correct element and browsers already style it — badly, and
 * differently from each other. Everything here is undoing that so a shortcut
 * hint reads as part of the interface rather than as a browser default.
 */
export function Kbd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border-default bg-bg-subtle px-1.5 font-sans text-[11px] font-medium leading-none text-text-tertiary ${className}`}
    >
      {children}
    </kbd>
  )
}
