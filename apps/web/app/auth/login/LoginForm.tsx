'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FieldLabel } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { emailSchema, validate } from '@/lib/validation'

export function LoginForm() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())
  const passwordId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  // Set when login fails because the email was never confirmed — shows a
  // resend button instead of the misleading "invalid password" message.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    // Validate the email shape only — password rules must never gate login
    // (older accounts may predate the current policy).
    const v = validate(emailSchema, email)
    if (!v.ok) {
      setEmailError(v.error)
      return
    }
    setLoading(true)
    setEmailError('')
    setPasswordError('')

    const { error } = await supabase.auth.signInWithPassword({ email: v.data, password })
    if (error) {
      if (/not confirmed/i.test(error.message)) {
        setUnconfirmed(true)
      } else {
        setUnconfirmed(false)
        // Attached to the password field rather than floated above the form:
        // the message is deliberately vague about which half was wrong, but
        // the password is the one worth retyping.
        setPasswordError('Invalid email or password.')
      }
      setLoading(false)
      return
    }
    router.push('/feed')
    router.refresh()
  }

  async function handleResend() {
    const v = validate(emailSchema, email)
    if (!v.ok) {
      setEmailError(v.error)
      return
    }
    if (resendIn > 0) return

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: v.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(
        /rate|too many/i.test(error.message)
          ? 'Too many emails — wait a minute and try again.'
          : error.message
      )
      return
    }
    toast.success('Confirmation email sent — give it a minute, and check spam too.')
    setResendIn(60)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleLogin} className="space-y-4">
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

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
            {/* Outside the <label> on purpose — a button nested in one steals
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
            placeholder="Your password"
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        {unconfirmed ? (
          <div className="space-y-3 rounded-md border border-accent-amber/30 bg-accent-amber/5 p-3">
            <p role="alert" className="text-sm text-text-secondary">
              Your email isn&apos;t confirmed yet — click the link we sent you, or resend it below.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleResend}
              disabled={resendIn > 0}
            >
              {resendIn > 0 ? `Resend confirmation email (${resendIn}s)` : 'Resend confirmation email'}
            </Button>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-royal font-semibold shadow-soft hover:opacity-90"
          disabled={!email || !password}
          loading={loading}
        >
          {loading ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-text-tertiary">or</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <Button type="button" variant="secondary" size="lg" className="w-full gap-2" onClick={handleGoogle}>
        {/* Google's brand mark — the one place fixed hex is correct, since the
            logo must not shift with our theme tokens. */}
        {/* Google's own mark, at its exact brand hexes — the one SVG in the
            app that must not become a lucide glyph or inherit our tokens.
            Google's branding guidelines require the unmodified logo. */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Button>
    </div>
  )
}
