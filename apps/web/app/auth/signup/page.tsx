'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, validate } from '@/lib/validation'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Terms consent is opt-in: unchecked by default, required to sign up.
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // When set, the form is replaced by the "check your inbox" panel.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [info, setInfo] = useState('')

  const isValid = email.includes('@') && password.length >= 8 && agreed

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy first.')
      return
    }
    // Schema validation: proper email format, 8–72 char password.
    const v = validate(signupSchema, { email, password })
    if (!v.ok) {
      setError(v.error)
      return
    }
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      ...v.data,
      // The confirmation link must land on /auth/callback: it exchanges the
      // code for a session, then the middleware drops the user straight into
      // onboarding. Without this the link would dead-end on the homepage.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)

    if (error) {
      if (/already registered/i.test(error.message)) {
        setError('You already have an account — log in instead.')
      } else if (/rate limit/i.test(error.message)) {
        setError('Our mail service is briefly at capacity — please try again in a few minutes.')
      } else {
        setError(error.message)
      }
      return
    }
    // Supabase obfuscates duplicate signups: an existing confirmed email
    // comes back as a user with an empty identities array (no email is sent).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('You already have an account — log in instead.')
      return
    }
    if (data.session) {
      // Email confirmation is disabled in this project: already signed in.
      router.push('/auth/onboarding/basic-info')
      router.refresh()
      return
    }
    // Confirmation required: swap the form for the check-your-inbox panel.
    setSentTo(v.data.email)
    setResendIn(60)
  }

  async function handleResend() {
    if (!sentTo || resendIn > 0) return
    setInfo('')
    setError('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(
        /rate|too many/i.test(error.message)
          ? 'Too many emails — wait a minute and try again.'
          : error.message
      )
      return
    }
    setInfo('Sent again! Give it a minute, and check your spam folder too.')
    setResendIn(60)
  }

  async function handleGoogle() {
    // Google signup also creates an account — same consent gate applies.
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy first.')
      return
    }
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  /* ------------------- "Check your inbox" panel ------------------- */
  if (sentTo) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">Check your inbox</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            We sent a confirmation link to{' '}
            <span className="font-semibold text-text-primary">{sentTo}</span>.
            <br />
            Click it to activate your account and continue.
          </p>
        </div>

        {info && <p className="text-sm text-accent-green">{info}</p>}
        {error && <p className="text-sm text-accent-red">{error}</p>}

        <button
          onClick={handleResend}
          disabled={resendIn > 0}
          className="w-full h-11 rounded-md bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-primary font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendIn > 0 ? `Resend email (${resendIn}s)` : 'Resend email'}
        </button>

        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            Wrong email?{' '}
            <button
              onClick={() => {
                setSentTo(null)
                setInfo('')
                setError('')
                setPassword('')
                setAgreed(false)
              }}
              className="text-accent-primary hover:underline"
            >
              Sign up again
            </button>
          </p>
          <p>
            Already confirmed?{' '}
            <Link href="/auth/login" className="text-accent-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  /* --------------------------- Signup form ------------------------ */
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="font-display text-3xl font-bold text-royal">StudySpot</div>
        <p className="text-text-secondary text-sm">Find your study crew</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className="w-full h-11 px-3.5 pr-12 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary text-xs"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent-primary cursor-pointer"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="text-text-primary underline underline-offset-2 hover:opacity-80">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-text-primary underline underline-offset-2 hover:opacity-80">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-accent-red text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full h-11 rounded-md bg-royal hover:opacity-90 text-accent-fg font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-text-tertiary text-xs">or</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full h-11 rounded-md bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-primary font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-text-secondary text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
