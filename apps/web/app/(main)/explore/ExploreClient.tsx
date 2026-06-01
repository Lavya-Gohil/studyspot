'use client'

import { useState } from 'react'
import { SessionCard } from '@/components/session/SessionCard'
import type { Session } from '@studyspot/types'

export function ExploreClient({ sessions, userCountry }: { sessions: Session[]; userCountry: string | null }) {
  const [query, setQuery] = useState('')

  const filtered = sessions.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.subject.toLowerCase().includes(q) ||
      s.location_name?.toLowerCase().includes(q) ||
      s.location_city?.toLowerCase().includes(q) ||
      s.host_name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold text-text-primary">Explore</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sessions by subject, location, host..."
        className="w-full h-11 px-4 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-secondary text-sm">
            {query ? 'No sessions match your search.' : 'No sessions available.'}
          </p>
          {query && (
            <button onClick={() => setQuery('')} className="text-accent-primary text-sm mt-2 hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-text-tertiary text-sm">{filtered.length} session{filtered.length === 1 ? '' : 's'}</p>
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
