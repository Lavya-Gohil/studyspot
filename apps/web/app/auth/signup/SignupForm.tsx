'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { FieldLabel } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { signupSchema, validate } from '@studyspot/utils/validation'
import { CheckInbox } from './CheckInbox'

const CONSENT_REQUIRED = 'Please agree to the Terms of Service and Privacy Policy first.'
const ALREADY_REGISTERED = 'You already have an account, log in instead.'

export function SignupForm() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())
  const passwordId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Terms consent is opt-in: unchecked by default, required to sign up.
  const [agreed, setAgreed] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [consentError, setConsentError] = useState('')
  const [loading, setLoading] = useState(false)
  // When set, the form is replaced by the "check your inbox" panel.
  const [sentTo, setSentTo] = useState<string | null>(null)

  const isValid = email.includes('@') && password.length >= 8 && agreed

  function clearErrors() {
    setEmailError('')
    setPasswordError('')
    setConsentError('')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setConsentError(CONSENT_REQUIRED)
      return
    }
    // Schema validation: proper email format, 8–72 char password.
    const emailCheck = validate(signupSchema.shape.email, email)
    const passwordCheck = validate(signupSchema.shape.password, password)
    if (!emailCheck.ok || !passwordCheck.ok) {
      setEmailError(emailCheck.ok ? '' : emailCheck.error)
      setPasswordError(passwordCheck.ok ? '' : passwordCheck.error)
      return
    }
    setLoading(true)
    clearErrors()

    const { data, error } = await supabase.auth.signUp({
      email: emailCheck.data,
      password: passwordCheck.data,
      // The confirmation link must land on /auth/callback: it exchanges the
      // code for a session, then the middleware drops the user straight into
      // onboarding. Without this the link would dead-end on the homepage.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)

    if (error) {
      if (/already registered/i.test(error.message)) {
        setEmailError(ALREADY_REGISTERED)
      } else if (/rate limit/i.test(error.message)) {
        toast.error('Our mail service is briefly at capacity, please try again in a few minutes.')
      } else {
        toast.error(error.message)
      }
      return
    }
    // Supabase obfuscates duplicate signups: an existing confirmed email
    // comes back as a user with an empty identities array (no email is sent).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setEmailError(ALREADY_REGISTERED)
      return
    }
    if (data.session) {
      // Email confirmation is disabled in this project: already signed in.
      router.push('/auth/onboarding/basic-info')
      router.refresh()
      return
    }
    // Confirmation required: swap the form for the check-your-inbox panel.
    setSentTo(emailCheck.data)
  }

  async function handleGoogle() {
    // Google signup also creates an account; same consent gate applies.
    if (!agreed) {
      setConsentError(CONSENT_REQUIRED)
      return
    }
    clearErrors()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        onRestart={() => {
          setSentTo(null)
          clearErrors()
          setPassword('')
          setAgreed(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="font-display text-3xl font-bold text-royal">StudySpot</div>
        <p className="text-sm text-text-secondary">Find your study crew</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) setEmailError('')
          }}
          error={emailError}
          placeholder="you@university.edu"
          autoComplete="email"
          disabled={loading}
        />
        {emailError === ALREADY_REGISTERED ? (
          <p className="-mt-2 text-xs text-text-secondary">
            <Link href="/auth/login" className="text-accent-primary hover:underline">
              Go to log in →
            </Link>
          </p>
        ) : null}

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
            {/* Outside the <label> on purpose: a button nested in one steals
                the click that should focus the input. */}
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="mb-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <Input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            error={passwordError}
            hint="At least 8 characters"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <Checkbox
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked)
            if (consentError) setConsentError('')
          }}
          error={consentError}
          disabled={loading}
          label={
            <span className="text-xs leading-relaxed text-text-secondary">
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
          }
        />

        <Button
          type="submit"
          size="lg"
          className="w-full bg-royal font-semibold shadow-soft hover:opacity-90"
          disabled={!isValid}
          loading={loading}
        >
          {loading ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-text-tertiary">or</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <Button type="button" variant="secondary" size="lg" className="w-full gap-2" onClick={handleGoogle}>
        {/* Google's brand mark; the one place fixed hex is correct, since the
            logo must not shift with our theme tokens. */}
        {/* Google's own mark, at its exact brand hexes; must stay unmodified
            per Google's branding guidelines. Not a candidate for the icon system. */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
