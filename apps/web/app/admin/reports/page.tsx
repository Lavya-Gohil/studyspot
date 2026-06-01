import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRelativeTime } from '@studyspot/utils'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reporter_id(full_name, email),
      reported:profiles!reported_id(full_name, email)
    `)
    .eq('resolved', false)
    .order('created_at', { ascending: true })
    .limit(50)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Reports Queue</h1>

      {!reports || reports.length === 0 ? (
        <p className="text-text-secondary">No unresolved reports.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <div key={report.id} className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-text-primary">
                    <span className="text-accent-red">{report.reason}</span>
                  </p>
                  <p className="text-text-secondary text-sm">
                    Reported: <span className="text-text-primary">{report.reported?.full_name}</span> ({report.reported?.email})
                  </p>
                  <p className="text-text-secondary text-sm">
                    By: {report.reporter?.full_name} ({report.reporter?.email})
                  </p>
                  {report.details && (
                    <p className="text-text-secondary text-sm mt-1 italic">&quot;{report.details}&quot;</p>
                  )}
                </div>
                <span className="text-text-tertiary text-xs shrink-0">{formatRelativeTime(report.created_at)}</span>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/profile/${report.reported_id}`}
                  className="h-8 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary text-xs hover:bg-bg-subtle transition-colors"
                >
                  View profile
                </Link>
                <BanButton userId={report.reported_id} reportId={report.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BanButton({ userId, reportId }: { userId: string; reportId: string }) {
  return (
    <form action="/api/admin/ban" method="post" className="inline">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="reportId" value={reportId} />
      <button type="submit" className="h-8 px-4 rounded-md bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs hover:bg-accent-red/20 transition-colors">
        Ban user
      </button>
    </form>
  )
}
