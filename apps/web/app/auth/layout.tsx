export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-bg-base px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-border-default bg-bg-surface/80 p-8 shadow-lift backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  )
}
