const STEPS = ['Profile', 'Location', 'Verify', 'Setup']

export function OnboardingProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isDone || isActive ? 'bg-accent-primary' : 'bg-bg-subtle border border-border-default'
                }`}
              />
              <span className={`text-xs ${isActive ? 'text-text-secondary' : 'text-text-tertiary'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
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
