/**
 * StudySpot UI primitives.
 *
 * Everything here is built on the design tokens in tailwind.config.ts /
 * globals.css — no component ships its own colors.
 *
 * ALWAYS IMPORT THE SPECIFIC MODULE, NOT THIS BARREL:
 *
 *   import { Button } from '@/components/ui/Button'   // yes
 *   import { Button } from '@/components/ui'          // no
 *
 * Modal depends on framer-motion, and this file re-exports it. Because Modal
 * is a `'use client'` module, importing the barrel establishes a client
 * boundary for everything it re-exports — so the route pays for framer-motion
 * whether or not a Modal is ever rendered, and tree-shaking cannot remove it
 * because the decision happens at the module-graph level, not at usage.
 *
 * That applies to SERVER components too. This file previously claimed they
 * could use the barrel freely; they can't. Five server components importing it
 * for <OnboardingProgress> and <Card> cost ~43kB each on /sessions/[id] and
 * all three onboarding steps, for components those routes never render.
 *
 * The barrel is kept only so this list documents what exists.
 */
export { Button } from './Button'
export { VibePill, SpotsBadge, VerifiedBadge, UnderAgeLabel } from './Badge'
export { Card, CardHeader } from './Card'
export { Checkbox, Radio } from './Checkbox'
export { EmptyState, ErrorState } from './EmptyState'
export { FieldLabel, FieldMessage, controlClasses, type FieldProps } from './Field'
export { Input, Textarea } from './Input'
export { Modal, Sheet } from './Modal'
export { OnboardingProgress } from './OnboardingProgress'
export { Select } from './Select'
export { Skeleton, SessionCardSkeleton } from './Skeleton'
export { Spinner } from './Spinner'
export { Tabs, TabPanel, type TabItem } from './Tabs'
export { ToastProvider, useToast } from './Toast'
export { Tooltip } from './Tooltip'
