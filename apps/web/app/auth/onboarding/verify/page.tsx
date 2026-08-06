import { BadgeCheck } from 'lucide-react'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { Icon } from '@/components/ui/Icon'
import { VerifyForm } from './VerifyForm'

/**
 * Server component: only the picker and the two actions need to be
 * interactive, so the indicator and the pitch copy stay off the client.
 */
export default function VerifyPage() {
  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={3} />

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Verify your student status
        </h1>
        <p className="text-sm text-text-secondary">
          Upload your college ID, timetable, or fee receipt to get a{' '}
          <span className="inline-flex items-center gap-1 font-medium text-accent-green">
            <Icon as={BadgeCheck} size="sm" />
            Verified Student
          </span>{' '}
          badge.
          Verified users get more approved requests. You can skip this and do it later.
        </p>
      </div>

      <VerifyForm />
    </div>
  )
}
