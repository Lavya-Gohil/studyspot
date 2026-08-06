import { Navbar } from '@/components/layout/Navbar'
import { CommandPalette } from '@/components/ui/CommandPalette'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />
      <main className="pt-24">{children}</main>
      {/* Mounted once for the whole authenticated app. It renders no DOM at
          all until opened, so the cost of being everywhere is one listener. */}
      <CommandPalette />
    </div>
  )
}
