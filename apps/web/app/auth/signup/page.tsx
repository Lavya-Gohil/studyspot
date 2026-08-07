import type { Metadata } from 'next'
import { SignupForm } from './SignupForm'

export const metadata: Metadata = {
  title: 'Sign up. StudySpot',
  description: 'Create a StudySpot account and find your study crew.',
}

/**
 * Thin by design: on success the form swaps itself for the check-your-inbox
 * panel, so the wordmark and footer belong to the form's state, not the page.
 */
export default function SignupPage() {
  return <SignupForm />
}
