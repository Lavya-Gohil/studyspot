import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { theme } from '@/lib/theme'

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      {focused && <Text style={{ fontSize: 10, color: theme.brand.text, fontWeight: '500' }}>{label}</Text>}
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.elevated,
          borderTopColor: theme.border.subtle,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.brand.text,
        tabBarInactiveTintColor: theme.text.tertiary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🏠" label="Feed" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🔍" label="Explore" />,
        }}
      />
      <Tabs.Screen
        name="chats/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="💬" label="Chats" />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🔔" label="Notifs" />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👤" label="Profile" />,
        }}
      />
    </Tabs>
  )
}
