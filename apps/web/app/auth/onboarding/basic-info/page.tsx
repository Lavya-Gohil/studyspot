import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { BasicInfoForm } from './BasicInfoForm'

/**
 * Server component so the step indicator and headings render without shipping
 * anything; only the two fields and their save handler need to be interactive.
 */
export default function BasicInfoPage() {
  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={1} />

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Tell us about yourself
        </h1>
        <p className="text-sm text-text-secondary">Just a couple of things to get started.</p>
      </div>

      <BasicInfoForm />
    </div>
  )
}
