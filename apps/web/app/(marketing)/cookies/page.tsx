import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Cookie Policy — StudySpot',
  description: 'The (very short) list of cookies and local storage StudySpot uses.',
}

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie"
      accent="policy."
      updated="June 12, 2026"
      intro="StudySpot uses a deliberately small set of cookies and browser storage — only what's needed to keep you signed in and remember your preferences. There are no advertising or cross-site tracking cookies."
      sections={[
        {
          heading: 'Strictly necessary',
          bullets: [
            'Authentication cookies (sb-*-auth-token): set by our authentication provider (Supabase) when you sign in. They keep your session alive and are required for the app to work. Removed when you sign out.',
            'Security: requests carry standard technical headers (like your IP) used for rate limiting and abuse prevention; these aren\'t cookies but are part of keeping the service safe.',
          ],
        },
        {
          heading: 'Preferences',
          bullets: [
            'theme (localStorage): remembers whether you chose light or dark mode. Stays on your device, never sent to our servers.',
          ],
        },
        {
          heading: 'What we don\'t use',
          bullets: [
            'No advertising cookies.',
            'No cross-site tracking pixels.',
            'No selling or sharing of cookie data with data brokers.',
          ],
        },
        {
          heading: 'Managing cookies',
          paragraphs: [
            'You can clear or block cookies in your browser settings at any time. Blocking the authentication cookie will sign you out and prevent sign-in; clearing localStorage simply resets your theme to match your system.',
          ],
        },
      ]}
    />
  )
}
