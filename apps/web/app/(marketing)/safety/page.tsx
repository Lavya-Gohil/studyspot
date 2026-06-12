import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Safety — StudySpot',
  description: 'How StudySpot keeps study sessions safe, and how to protect yourself when meeting up.',
}

export default function SafetyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Safety"
      accent="guidelines."
      updated="June 12, 2026"
      intro="Meeting people from the internet to study should feel as safe as joining a table at the library. Here's what StudySpot does to protect you — and what you can do to protect yourself."
      sections={[
        {
          heading: 'What StudySpot does',
          bullets: [
            'Student verification: profiles with a Verified badge have had a student document reviewed by our team.',
            'Reputation scores: attendance, punctuality, and peer ratings build a track record you can check before joining anyone\'s session.',
            'Approval-based joining: hosts approve every join request — nobody just shows up.',
            'Blocking and reporting: block anyone instantly; reports go to our moderation team and repeat offenders are banned.',
            'Private data stays private: your exact location and verification documents are never shown to other users.',
          ],
        },
        {
          heading: 'Meeting in person — smart defaults',
          bullets: [
            'Pick public venues: libraries, campus buildings, busy cafés. Be cautious about private homes, especially with people you haven\'t studied with before.',
            'Check the host\'s profile: verified badge, reputation score, and past session history are there for a reason.',
            'Tell someone where you\'re going, especially for evening sessions.',
            'Arrive and leave on your own transport. You owe nobody an explanation for leaving a session that feels off.',
            'Keep early conversations in the session chat instead of moving to personal contact details right away.',
          ],
        },
        {
          heading: 'Online sessions',
          bullets: [
            'Online rooms are avatar + text only by design — no video means no pressure to share your room or appearance.',
            'Chat for online sessions lives inside the room, only accessible to approved members.',
            'The same conduct rules apply online: harassment in chat is a bannable offence.',
          ],
        },
        {
          heading: 'If something goes wrong',
          paragraphs: [
            'Use the Report button on any profile or session, or email hello@studyspot.app — a human reviews every report. If you are in immediate danger, contact local emergency services first.',
            'Reports are confidential: the reported user is not told who reported them.',
          ],
        },
        {
          heading: 'For minors (16–17)',
          paragraphs: [
            'Accounts under 18 are internally flagged and we apply extra caution in moderation. If you\'re under 18: stick to public venues and daytime sessions, and involve a parent or guardian in how you use StudySpot.',
          ],
        },
      ]}
    />
  )
}
