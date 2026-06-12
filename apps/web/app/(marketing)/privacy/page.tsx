import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — StudySpot',
  description: 'What StudySpot collects, why, and the controls you have over your data.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy"
      accent="policy."
      updated="June 12, 2026"
      intro="StudySpot exists to help students study together — not to monetise your attention or sell your data. This policy explains, in plain language, what we collect, why we collect it, and the controls you have."
      sections={[
        {
          heading: '1. What we collect',
          bullets: [
            'Account basics: email address, name, age, and password (stored only as a salted hash by our authentication provider).',
            'Profile details you choose to add: username, college, course, year of study, subjects, bio, and avatar.',
            'Location: the city/region you set during onboarding, and the location of sessions you create or join. Precise device location is used only when you allow it, to show sessions near you.',
            'Verification documents: if you verify as a student, the document you upload is stored in a private bucket, visible only to our review team, and used solely to confirm student status.',
            'Activity inside the product: sessions, join requests, messages, circles, goals, and ratings — the content you create by using StudySpot.',
            'Technical data: IP address and basic device/browser information, used for security (rate limiting, abuse prevention) and to keep the service running.',
          ],
        },
        {
          heading: '2. What we use it for',
          bullets: [
            'Running the product: showing sessions near you, matching you with compatible study partners, syncing chats and rooms in real time.',
            'Trust and safety: student verification, reputation scores, blocking, reporting, and ban enforcement.',
            'Security: detecting abuse, rate limiting, and protecting accounts.',
            'Communication: service notifications (session reminders, request approvals). We do not send marketing email without your consent.',
          ],
        },
        {
          heading: '3. What we never do',
          bullets: [
            'We never sell your personal data.',
            'We never show your precise location to other users — others see session locations and the city on your profile, not your live position.',
            'We never make verification documents visible to other users, and we delete them after review where regulations allow.',
            'We never read your private messages for advertising.',
          ],
        },
        {
          heading: '4. Who can see what',
          paragraphs: [
            'Your profile (name, username, college, subjects, bio, reputation) is visible to other signed-in students. Session details are visible to signed-in users browsing the feed. Messages are visible only to approved members of that session. Private circles are visible only to their members.',
          ],
        },
        {
          heading: '5. Where your data lives',
          paragraphs: [
            'StudySpot runs on Supabase (database, authentication, storage) and Vercel (web hosting). Both act as data processors for us, and access to production data is restricted and protected by row-level security — each user\'s requests can only ever read what that user is allowed to see.',
          ],
        },
        {
          heading: '6. Your controls',
          bullets: [
            'Edit or remove profile fields anytime in Profile → Settings.',
            'Block any user — they can no longer see or contact you.',
            'Delete your account: contact us with the "Email us" button at the bottom of this page and we erase your profile and content within 30 days, except records we must keep for safety or legal reasons.',
            'Export: ask us for a copy of your data and we will provide it in a portable format.',
          ],
        },
        {
          heading: '7. Age',
          paragraphs: [
            'StudySpot is for students aged 16 and over. Accounts for users under 18 are flagged as minors internally so we can apply additional safety measures. We do not knowingly allow accounts for anyone under 16.',
          ],
        },
        {
          heading: '8. Changes',
          paragraphs: [
            'If this policy changes in a meaningful way, we will tell you in the app before the change takes effect. Continued use after that date means you accept the updated policy.',
          ],
        },
      ]}
    />
  )
}
