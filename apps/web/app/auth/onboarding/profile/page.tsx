import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { ProfileForm } from './ProfileForm'

/**
 * Last onboarding step. Server component so the indicator and headings cost
 * nothing on the client; the form, subject picker and avatar picker are the
 * only interactive parts.
 */
export default function ProfileSetupPage() {
  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={4} />

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Set up your study profile
        </h1>
        <p className="text-sm text-text-secondary">All optional; you can fill this in later.</p>
      </div>

      <ProfileForm />
    </div>
  )
}
