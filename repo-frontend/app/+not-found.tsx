import React, { useEffect, useState } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { Link, Stack } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import api from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function NotFoundScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const tokenObj = await getToken();
        if (!tokenObj?.token) {
          console.log("⚠️ No stored token found");
          setLoading(false);
          return;
        }

        const response = await api.get("/auth/me");
        const userRole = response.data.role;
        setRole(userRole);
      } catch (err: any) {
        console.log("⚠️ Role check failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <ThemedText style={{ marginTop: 10 }}>Checking your role...</ThemedText>
      </View>
    );
  }

  const roleHome =
    role === "admin"
      ? "/admin"
      : role === "faculty"
      ? "/faculty"
      : role === "staff"
      ? "/staff"
      : "/(tabs)";

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <Link href={roleHome} style={styles.link}>
          <ThemedText type="link">
            Go back to your {role ? `${role} dashboard` : "home"}!
          </ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
