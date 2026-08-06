import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The detail page does four sequential Supabase reads before it can render, so
 * the gap is long enough to notice. Shapes mirror page.tsx — host row, title,
 * detail card, CTA — so nothing jumps when the real content lands.
 */
export default function SessionDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" aria-busy="true">
      <Skeleton className="h-4 w-28" />

      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <Skeleton className="h-8 w-2/3" />

      <div className="space-y-4 rounded-lg border border-border-subtle bg-bg-surface p-6">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  )
}
