'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'

/**
 * Shown in place of the signup form once Supabase has sent a confirmation
 * link. Signing up without this panel dead-ended users: signUp() returns no
 * session while email confirmation is on, so they were pushed into onboarding
 * that silently failed to save and bounced them back to login.
 *
 * Owns its own cooldown, seeded at 60s because the signup itself just sent an
 * email; the button must not be live the moment the panel appears.
 */
export function CheckInbox({ email, onRestart }: { email: string; onRestart: () => void }) {
  const toast = useToast()
  const [supabase] = useState(() => createClient())
  const [resendIn, setResendIn] = useState(60)
  const [resending, setResending] = useState(false)

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  async function handleResend() {
    if (resendIn > 0) return
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (error) {
      toast.error(
        /rate|too many/i.test(error.message)
          ? 'Too many emails, wait a minute and try again.'
          : error.message
      )
      return
    }
    toast.success('Sent again! Give it a minute, and check your spam folder too.')
    setResendIn(60)
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
        <Icon as={Mail} size="lg" />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="text-sm leading-relaxed text-text-secondary">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-text-primary">{email}</span>.
          <br />
          Click it to activate your account and continue.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleResend}
        disabled={resendIn > 0}
        loading={resending}
      >
        {resendIn > 0 ? `Resend email (${resendIn}s)` : 'Resend email'}
      </Button>

      <div className="space-y-2 text-sm text-text-secondary">
        <p>
          Wrong email?{' '}
          <button type="button" onClick={onRestart} className="text-accent-primary hover:underline">
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
