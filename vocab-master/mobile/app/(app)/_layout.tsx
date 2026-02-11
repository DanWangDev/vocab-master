import { useEffect } from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import {
  Home,
  BookOpen,
  Brain,
  Trophy,
  Users,
  Shield,
  List,
} from 'lucide-react-native';
import { useAuth, AppProvider } from '../../src/contexts';
import { colors } from '../../src/theme';

export default function AppLayout() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!state.isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = state.user?.role ?? 'student';

  return (
    <AppProvider isAuthenticated={state.isAuthenticated}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.gray[400],
          tabBarLabelStyle: {
            fontFamily: 'Nunito_600SemiBold',
            fontSize: 11,
          },
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
            paddingTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />

        {/* Student tabs */}
        <Tabs.Screen
          name="study"
          options={{
            title: 'Study',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
            href: role === 'student' ? '/(app)/study' : null,
          }}
        />
        <Tabs.Screen
          name="quiz"
          options={{
            title: 'Quiz',
            tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />,
            href: role === 'student' ? '/(app)/quiz' : null,
          }}
        />
        <Tabs.Screen
          name="challenge"
          options={{
            title: 'Challenge',
            tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
            href: role === 'student' ? '/(app)/challenge' : null,
          }}
        />

        {/* Parent tab */}
        <Tabs.Screen
          name="parent"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
            href: role === 'parent' ? '/(app)/parent' : null,
          }}
        />

        {/* Admin tab */}
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
            href: role === 'admin' ? '/(app)/admin' : null,
          }}
        />

        {/* Wordlists tab (parent + admin) */}
        <Tabs.Screen
          name="wordlists"
          options={{
            title: 'Wordlists',
            tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
            href: role !== 'student' ? '/(app)/wordlists' : null,
          }}
        />
      </Tabs>
    </AppProvider>
  );
}
