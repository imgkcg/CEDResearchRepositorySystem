// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { getToken } from "../../lib/auth";

export default function TabsLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      setAuthed(!!t?.token);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!authed) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: { backgroundColor: "#fff", borderTopWidth: 0.5, height: 60 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"      // app/(tabs)/index.tsx ← put FacultyDashboard here
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"    // app/(tabs)/profile.tsx
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
