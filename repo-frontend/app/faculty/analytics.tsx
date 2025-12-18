// app/screens/faculty/analytics.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FacultyShell from "./Shell";
import { useFacultyData } from "./useFaculty";

export default function FacultyAnalytics() {
  const { analytics } = useFacultyData();

  return (
    <FacultyShell title="Analytics" subtitle="Overview of advisees and outputs">
      <View style={styles.grid3}>
        <Stat icon="document-text-outline" value={analytics.myResearchCount} label="My Research" bg="#dbeafe" ic="#2563eb" />
        <Stat icon="people-outline" value={analytics.total} label="Advisees" bg="#d1fae5" ic="#059669" />
        <Stat icon="time-outline" value={analytics.pending} label="Pending" bg="#fde9c9" ic="#d97706" />
      </View>

      <View style={styles.grid3}>
        <Stat icon="checkmark-circle-outline" value={analytics.approved} label="Approved" bg="#dcfce7" ic="#22c55e" />
        <Stat icon="close-circle-outline" value={analytics.rejected} label="Rejected" bg="#fee2e2" ic="#ef4444" />
        <Stat
          icon="bar-chart-outline"
          value={`${analytics.total ? Math.round((analytics.approved / analytics.total) * 100) : 0}%`}
          label="Approval Rate"
          bg="#ede9fe"
          ic="#7c3aed"
        />
      </View>
    </FacultyShell>
  );
}

function Stat({ icon, value, label, bg, ic }: any) {
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: "#eef2ff" }]}>
      <Ionicons name={icon} size={22} color={ic} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid3: { flexDirection: "row", gap: 14 },
  card: {
    flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, alignItems: "center",
  },
  value: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginTop: 8 },
  label: { color: "#6b7280", fontWeight: "700", marginTop: 2 },
});
