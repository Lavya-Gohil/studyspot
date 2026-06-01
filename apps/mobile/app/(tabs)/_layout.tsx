import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      {focused && <Text style={{ fontSize: 10, color: '#7B61FF', fontWeight: '500' }}>{label}</Text>}
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C1C24',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#7B61FF',
        tabBarInactiveTintColor: '#5C5B6E',
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
