export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton rounded ${className}`}
    />
  )
}

export function SessionCardSkeleton() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  )
}
