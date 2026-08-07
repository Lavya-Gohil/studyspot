import { Tabs } from 'expo-router'
import { Bell, Compass, LayoutGrid, MessageCircle, Sparkles, User, Users } from '@/components/icons'
import type { LucideIcon } from '@/components/icons'
import { theme } from '@/lib/theme'

/**
 * The tab bar.
 *
 * Icons rather than emoji, matching the web. Emoji as interface renders
 * differently on every OS version, cannot inherit a colour, and is the
 * loudest "assembled quickly" signal in a mobile app. The one emoji left in
 * the product is the circle emoji, which is user-chosen data.
 *
 * Labels are always visible. Seven unlabelled glyphs is a memory test, and
 * this app is opened daily by people who should not have to learn it.
 *
 * The bar sits at the bottom, which is what expo-router's Tabs does and where
 * a thumb can reach it. Note what is NOT set below: height and paddingBottom.
 * React Navigation computes those as 49 + insets.bottom and insets.bottom, so
 * hardcoding them (as this did) throws the safe-area inset away and drops the
 * labels into the home-indicator zone on every phone with gesture navigation.
 * Style the appearance here; leave the geometry to the inset.
 */

const ICON_SIZE = 20
const STROKE = 1.9

function icon(Glyph: LucideIcon) {
  return function TabIcon({ color }: { color: string }) {
    return <Glyph size={ICON_SIZE} color={color} strokeWidth={STROKE} />
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.elevated,
          borderTopColor: theme.border.subtle,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.brand.text,
        tabBarInactiveTintColor: theme.text.tertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: icon(LayoutGrid) }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon(Compass) }} />
      <Tabs.Screen name="match" options={{ title: 'Match', tabBarIcon: icon(Sparkles) }} />
      <Tabs.Screen name="circles" options={{ title: 'Circles', tabBarIcon: icon(Users) }} />
      <Tabs.Screen name="chats/index" options={{ title: 'Chats', tabBarIcon: icon(MessageCircle) }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: icon(Bell) }}
      />
      <Tabs.Screen name="profile/index" options={{ title: 'You', tabBarIcon: icon(User) }} />

      {/* Reachable from the profile screen, not from the bar itself. Without
          these entries expo-router would add a tab for each file. */}
      <Tabs.Screen name="profile/stats" options={{ href: null }} />
      <Tabs.Screen name="profile/leaderboard" options={{ href: null }} />
      <Tabs.Screen name="profile/goals" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
    </Tabs>
  )
}
