import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Log in — StudySpot',
  description: 'Sign in to StudySpot to find your study crew.',
}

/** Server component: only the credential form itself needs to be interactive. */
export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="font-display text-3xl font-bold text-royal">StudySpot</div>
        <p className="text-sm text-text-secondary">Welcome back</p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-accent-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
