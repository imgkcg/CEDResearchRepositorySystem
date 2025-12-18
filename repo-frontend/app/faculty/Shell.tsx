// app/screens/faculty/Shell.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMe } from "./useMe";

const C = {
  bg: "#f6f6f9",
  ring: "#eef2ff",
  ink: "#0f172a",
  mute: "#6b7280",
};

export default function FacultyShell({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { name } = useMe();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top bar identical to home, now with real name */}
      <View style={styles.topbar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.logoDot} />
          <Text style={styles.appTitle}>Research Repository</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle-outline" size={22} color="#2563eb" />
          </View>
          <Text style={styles.userName} numberOfLines={1}>{name}</Text>

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/repository")}>
            <Ionicons name="book-outline" size={18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/login")}>
            <Ionicons name="log-out-outline" size={18} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Page header */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>

      <ScrollView contentContainerStyle={styles.container}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logoDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: "#2563eb" },
  appTitle: { fontWeight: "800", color: "#0f172a", fontSize: 16 },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center",
  },
  userName: { maxWidth: 140, color: C.ink, fontWeight: "800" },

  iconBtn: {
    width: 36, height: 36, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1,
    borderColor: "#eef2ff", alignItems: "center", justifyContent: "center",
  },

  pageHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  pageSub: { color: "#6b7280", fontWeight: "600", marginTop: 2 },

  container: { padding: 18, paddingBottom: 36, gap: 14 },
});
