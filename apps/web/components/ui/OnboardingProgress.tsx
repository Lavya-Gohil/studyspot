/**
 * Account onboarding, in route order: basic-info → location → verify →
 * profile. These read ['Profile', 'Location', 'Verify', 'Setup'] until now,
 * which labelled step 1 "Profile" (that screen only asks name and age) and
 * called the actual profile screen "Setup" — so the dot a user stood on never
 * named the page in front of them. The order was always correct; see
 * STEP_TO_ROUTE in lib/supabase/middleware.ts and the onboarding_step each
 * page writes on success (2, 3, 4, 5 respectively).
 */
const ONBOARDING_STEPS = ['About you', 'Location', 'Verify', 'Profile']

/**
 * Dot-and-rail step indicator.
 *
 * Defaults to the account onboarding labels because that was its only caller;
 * pass `steps` to reuse it for any other multi-step flow (session creation
 * does). Kept generic rather than forked so both flows keep reading as the
 * same product.
 */
export function OnboardingProgress({
  currentStep,
  steps = ONBOARDING_STEPS,
  className = '',
}: {
  currentStep: number
  steps?: readonly string[]
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-0 mb-8 ${className}`}>
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isDone || isActive ? 'bg-accent-primary' : 'bg-bg-subtle border border-border-default'
                }`}
              />
              <span className={`text-xs ${isActive ? 'text-text-secondary' : 'text-text-tertiary'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-4 mx-1 transition-colors ${
                  stepNum < currentStep ? 'bg-accent-primary' : 'bg-border-subtle'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
