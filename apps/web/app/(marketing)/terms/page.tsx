import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service. StudySpot',
  description: 'The agreement between you and StudySpot when you use the platform.',
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of"
      accent="service."
      updated="June 12, 2026"
      intro="These terms are the agreement between you and StudySpot when you create an account or use the platform. The short version: be a real student, be decent to other students, and don't abuse the service."
      sections={[
        {
          heading: '1. Who can use StudySpot',
          paragraphs: [
            'You must be at least 16 years old and a student (or otherwise studying) to use StudySpot. You agree to give accurate information when signing up and during verification, and to keep your account credentials to yourself. One person, one account.',
          ],
        },
        {
          heading: '2. Your content',
          paragraphs: [
            'You own what you post: profiles, sessions, messages, circle posts and goals. By posting, you give StudySpot a licence to host, display, and distribute that content inside the product so the service can work (for example, showing your session to nearby students).',
            'You are responsible for what you post. Don\'t post anything illegal, harassing, deceptive, or that infringes someone else\'s rights.',
          ],
        },
        {
          heading: '3. Acceptable use',
          bullets: [
            'No harassment, hate, or threats toward other users.',
            'No fake profiles, impersonation, or fraudulent verification documents.',
            'No spam, advertising, or recruiting disguised as study sessions.',
            'No scraping, automated access, probing, or attempts to bypass security controls (rate limits, row-level security, verification).',
            'No using StudySpot for anything other than its purpose: organising real study together.',
          ],
        },
        {
          heading: '4. Sessions and meeting people',
          paragraphs: [
            'StudySpot helps students find each other; we are not present at sessions and cannot guarantee anyone\'s behaviour. Use the safety tools (verified badges, reputation, public venues, blocking and reporting) and read our Safety guidelines. You attend sessions at your own judgement and risk.',
          ],
        },
        {
          heading: '5. Enforcement',
          paragraphs: [
            'We may remove content, suspend, or ban accounts that violate these terms or put other users at risk, including permanently for serious violations such as harassment or fake verification. Where reasonable, we\'ll tell you why.',
          ],
        },
        {
          heading: '6. The service',
          paragraphs: [
            'StudySpot is provided free for students, "as is". We work hard to keep it available and secure, but we don\'t guarantee uninterrupted service and may change or discontinue features. To the maximum extent permitted by law, StudySpot is not liable for indirect damages or for what happens between users at sessions.',
          ],
        },
        {
          heading: '7. Ending the agreement',
          paragraphs: [
            'You can stop using StudySpot and request account deletion at any time. We can terminate accounts that breach these terms. Sections that by nature survive termination (content licences already exercised, liability limits) survive.',
          ],
        },
        {
          heading: '8. Changes to these terms',
          paragraphs: [
            'If we make material changes, we\'ll notify you in the app before they take effect. Continuing to use StudySpot after that means you accept the new terms.',
          ],
        },
      ]}
    />
  )
}
