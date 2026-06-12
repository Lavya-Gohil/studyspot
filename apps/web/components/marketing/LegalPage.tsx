import { FadeIn } from '@/components/motion/Motion'
import { CONTACT_EMAIL } from '@/lib/site'

export type LegalSection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

/**
 * Consistent shell for legal documents (Privacy, Terms, Safety, Cookies):
 * eyebrow + serif-accent title + dated glass card of sections.
 */
export function LegalPage({
  eyebrow,
  title,
  accent,
  updated,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  accent: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <FadeIn>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-4 text-[clamp(2.2rem,5.5vw,3.5rem)] font-bold leading-[1.0] tracking-[-0.035em]">
          {title} <span className="hl">{accent}</span>
        </h1>
        <p className="mt-4 text-sm text-text-tertiary">Last updated: {updated}</p>
        <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-text-secondary">{intro}</p>

        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                {s.heading}
              </h2>
              {s.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-pretty text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-2">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-primary/60" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="glass mt-14 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-sm text-text-secondary">
          <span>Questions about this document?</span>
          {/* Address lives only in the href — not shown as text. */}
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn-accent">
            Email us →
          </a>
        </div>
      </FadeIn>
    </div>
  )
}
