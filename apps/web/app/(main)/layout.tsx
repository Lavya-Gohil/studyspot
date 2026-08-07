import { Navbar } from '@/components/layout/Navbar'
import { AppShell } from '@/components/layout/AppShell'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { CommandPalette } from '@/components/ui/CommandPalette'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />
      {/* The floating tab bar is fixed, so it reserves no layout space. This
          padding is what keeps the last card clear of it, and it has to
          include the safe-area inset for the same reason the bar does. */}
      <main className="pt-24 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <AppShell>{children}</AppShell>
      </main>
      <MobileTabBar />
      {/* Mounted once for the whole authenticated app. It renders no DOM at
          all until opened, so the cost of being everywhere is one listener. */}
      <CommandPalette />
    </div>
  )
}
