'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { emailSchema, validate } from '@/lib/validation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Set when login fails because the email was never confirmed — shows a
  // resend button instead of the misleading "invalid password" message.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [info, setInfo] = useState('')

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
      setError(v.error)
      return
    }
    setLoading(true)
    setError('')
    setInfo('')

    const { error } = await supabase.auth.signInWithPassword({ email: v.data, password })
    if (error) {
      if (/not confirmed/i.test(error.message)) {
        setUnconfirmed(true)
        setError("Your email isn't confirmed yet — click the link we sent you, or resend it below.")
      } else {
        setUnconfirmed(false)
        setError('Invalid email or password.')
      }
      setLoading(false)
      return
    }
    router.push('/feed')
    router.refresh()
  }

  async function handleResend() {
    const v = validate(emailSchema, email)
    if (!v.ok || resendIn > 0) return
    setInfo('')
    setError('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: v.data,
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
    setInfo('Confirmation email sent — give it a minute, and check spam too.')
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
      <div className="text-center space-y-2">
        <div className="font-display text-3xl font-bold text-royal">StudySpot</div>
        <p className="text-text-secondary text-sm">Welcome back</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="Your password"
              autoComplete="current-password"
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

        {error && <p className="text-accent-red text-sm">{error}</p>}
        {info && <p className="text-accent-green text-sm">{info}</p>}

        {unconfirmed && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0}
            className="w-full h-11 rounded-md bg-bg-elevated border border-border-default hover:bg-bg-subtle text-text-primary font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendIn > 0 ? `Resend confirmation email (${resendIn}s)` : 'Resend confirmation email'}
          </button>
        )}

        <button
          type="submit"
          disabled={!email || !password || loading}
          className="w-full h-11 rounded-md bg-royal hover:opacity-90 text-accent-fg font-semibold text-sm transition-opacity disabled:opacity-50 shadow-soft"
        >
          {loading ? 'Signing in...' : 'Sign in'}
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
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-accent-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
