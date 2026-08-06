/**
 * StudySpot UI primitives.
 *
 * Everything here is built on the design tokens in tailwind.config.ts /
 * globals.css — no component ships its own colors.
 *
 *   import { Button, Input, Modal, useToast } from '@/components/ui'
 *
 * Bundle cost in client components: Modal, Toast and Tooltip depend on
 * framer-motion, and a barrel import pulls that whole graph in even when you
 * only wanted <Button> — measured at +40kB on /feed. Inside a `'use client'`
 * file, import the specific module instead:
 *
 *   import { Button } from '@/components/ui/Button'
 *
 * Server components can use the barrel freely; nothing ships to the client.
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
