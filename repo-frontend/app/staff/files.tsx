// app/screens/files.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  Modal,
  TextInput,
  RefreshControl,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";
import { router } from "expo-router";

type Visibility = "campus" | "private";

type Item = {
  _id: string;
  title?: string;
  author?: string;
    coAuthors?: string[]; 
  year?: string | number;
  abstract?: string;
  keywords?: string[] | string;
  fileName?: string;
  createdAt?: string;
  visibility?: Visibility;
  allowedViewers?: string[];
  uploaderRole?: "student" | "faculty" | "staff" | "admin";
};

const VIS_OPTS: Visibility[] = ["campus", "private"];

// Accept full MSU-IIT emails (g.msuiit.edu.ph or msuiit.edu.ph)
const isMsuiitEmail = (e: string) =>
  /@g\.msuiit\.edu\.ph$/i.test(e) || /@msuiit\.edu\.ph$/i.test(e);

// --- NEW: allow handles (auto-append @g.msuiit.edu.ph), still accept full MSU-IIT emails ---
const G_DOMAIN = "@g.msuiit.edu.ph";
const LOCAL_OK = /^[a-z0-9._-]+$/i;

function normalizeMsuiitList(input: string) {
  const raw = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const emails: string[] = [];
  const invalid: string[] = [];

  for (const token of raw) {
    // handle-only -> append @g.msuiit.edu.ph
    if (!token.includes("@")) {
      if (!LOCAL_OK.test(token)) {
        invalid.push(token);
        continue;
      }
      emails.push(`${token.toLowerCase()}${G_DOMAIN}`);
      continue;
    }

    // full email must be MSU-IIT domain
    const email = token.toLowerCase();
    const [local] = email.split("@");
    if (!local || !LOCAL_OK.test(local) || !isMsuiitEmail(email)) {
      invalid.push(token);
      continue;
    }
    emails.push(email);
  }

  return { emails: Array.from(new Set(emails)), invalid };
}

type RowState = {
  visibility: Visibility;
  allowedViewers?: string; // comma-separated in UI
  saving?: boolean;
};

export default function Files() {
  const [loading, setLoading] = useState(true);
  const [researchList, setResearchList] = useState<Item[]>([]);
  const [visState, setVisState] = useState<Record<string, RowState>>({});
  const [editing, setEditing] = useState<Item | null>(null);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "faculty" | "staff" | "admin">("all");
  const [sortBy, setSortBy] = useState<"latest" | "year">("latest");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const token = await getToken();
      const res = await api.get("/research-admin", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      const data: Item[] = res?.data?.data ?? res?.data ?? [];
      const next: Record<string, RowState> = {};
      for (const r of data) {
        const id = String(r._id);
        next[id] = {
          visibility: (r.visibility as Visibility) || "campus",
          allowedViewers: (r.allowedViewers || []).join(", "),
          saving: false,
        };
      }
      setResearchList(data);
      setVisState(next);
    } catch (err: any) {
      console.error("❌ Fetch error:", err?.response?.data || err);
      Alert.alert("Error", "Failed to fetch research files.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = [...researchList];
    if (q) {
      items = items.filter((r) => {
        const kws = Array.isArray(r.keywords)
          ? r.keywords
          : (r.keywords || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
        return (
          (r.title || "").toLowerCase().includes(q) ||
          (r.author || "").toLowerCase().includes(q) ||
           (r.coAuthors || []).some(ca => ca.toLowerCase().includes(q)) || 
          kws.some((k) => k.toLowerCase().includes(q)) ||
          (r.year ? String(r.year).includes(q) : false)
        );
      });
    }
    if (roleFilter !== "all") items = items.filter((r) => r.uploaderRole === roleFilter);
    if (sortBy === "year") items.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    else
      items.sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    return items;
  }, [researchList, search, roleFilter, sortBy]);

  // 🔐 Short-lived, headerless viewer link
  const openWithSignedLink = async (id: string, fileName?: string) => {
    try {
      const token = await getToken();
      const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
      // Ask server for a 1–2 min signed URL
      const res = await fetch(`${base}/research/file/${id}/signed`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        Alert.alert("Error", `Failed to get preview link (${res.status}) ${msg}`);
        return;
      }
      const { url } = await res.json();
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        Alert.alert("Open PDF", fileName || "Open file", [
          { text: "Cancel", style: "cancel" },
          { text: "Open", onPress: () => Linking.openURL(url) },
        ]);
      }
    } catch (e: any) {
      console.error("❌ Signed link error:", e);
      Alert.alert("Error", e?.message || "Failed to open file.");
    }
  };

  const handleDelete = async (paper: Item) => {
    const ok = Platform.OS === "web" ? window.confirm(`Delete "${paper.title}"?`) : true;
    if (!ok) return;
    try {
      const token = await getToken();
      await api.delete(`/research-admin/${String(paper._id)}`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      Alert.alert("🗑️ Deleted", "Research deleted.");
      fetchAll();
    } catch (err: any) {
      console.error("❌ Delete failed:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to delete research.");
    }
  };

  const saveVisibility = async (id: string) => {
    const normId = String(id);
    const row = visState[normId];
    if (!row) return;

    try {
      const token = await getToken();
      setVisState((s) => ({ ...s, [normId]: { ...row, saving: true } }));

      const payload: any = { visibility: row.visibility, embargoUntil: null };

      if (row.visibility === "private") {
        // --- accept handles and normalize to valid MSU-IIT emails ---
        const { emails, invalid } = normalizeMsuiitList(row.allowedViewers || "");
        if (invalid.length) {
          Alert.alert(
            "Invalid entries",
            `Use handles (e.g., luis.marco) or full MSU-IIT emails:\n• ${invalid.join("\n• ")}`
          );
          setVisState((s) => ({ ...s, [normId]: { ...row, saving: false } }));
          return;
        }
        if (emails.length === 0) {
          Alert.alert("Error", "Provide at least one allowed viewer for PRIVATE.");
          setVisState((s) => ({ ...s, [normId]: { ...row, saving: false } }));
          return;
        }
        payload.allowedViewers = emails;
      } else {
        payload.allowedViewers = []; // campus
      }

      await api.put(`/research-admin/${normId}/visibility`, payload, {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      Alert.alert("✅ Visibility updated", "Saved.");
      fetchAll();
    } catch (err: any) {
      console.error("❌ Visibility update failed:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to update visibility.");
    } finally {
      setVisState((s) => ({ ...s, [normId]: { ...s[normId], saving: false } }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      setUpdating(true);
      const token = await getToken();
      await api.put(
        `/research-admin/${String(editing._id)}`,
        {
          title: editing.title,
          author: editing.author,
           coAuthors: editing.coAuthors || [], 
          year: editing.year,
          abstract: editing.abstract,
          keywords: Array.isArray(editing.keywords)
            ? editing.keywords.join(", ")
            : (editing.keywords as any),
        },
        { headers: { Authorization: `Bearer ${token.token}` } }
      );
      Alert.alert("✅ Updated", "Research details saved.");
      setEditing(null);
      fetchAll();
    } catch (err: any) {
      console.error("❌ Update failed:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to update research.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: "#6b7280", marginTop: 10 }}>Loading files…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.header}>📋 Staff – Manage Research Files</Text>

        {/* Top controls */}
        <View style={styles.toolbar}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search title, author, keyword, year…"
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.row}>
            {(["all", "faculty", "student", "staff", "admin"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                style={[styles.chip, roleFilter === r && styles.chipActive]}
              >
                <Text style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
                  {r[0].toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.chip, styles.sortChip, sortBy !== "latest" && styles.chipActive]}
              onPress={() => setSortBy((s) => (s === "latest" ? "year" : "latest"))}
            >
              <Ionicons
                name={sortBy === "latest" ? "time-outline" : "calendar-outline"}
                size={16}
                color={sortBy === "latest" ? "#2563eb" : "#fff"}
              />
              <Text style={[styles.chipText, sortBy !== "latest" && styles.chipTextActive, { marginLeft: 6 }]}>
                {sortBy === "latest" ? "Latest" : "By Year"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <Text style={styles.noResult}>No files found.</Text>
        ) : (
          filtered.map((r) => {
            const id = String(r._id);
            const row = visState[id] || {
              visibility: (r.visibility as Visibility) || "campus",
              allowedViewers: (r.allowedViewers || []).join(", "),
            };
            const isCampus = row.visibility === "campus";

            return (
              <View key={id} style={styles.card}>
                <Text style={styles.title}>{r.title || "(Untitled)"}</Text>
                <Text style={styles.meta}>Author: {r.author || "—"}</Text>
                {r.coAuthors && r.coAuthors.length > 0 && (
                  <Text style={styles.meta}>
                    Co-authors: {r.coAuthors.join(", ")}
                  </Text>
                )}

                <Text style={styles.meta}>Year: {r.year || "—"}</Text>
                <Text style={styles.meta}>
                  Uploaded: {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                </Text>

                {/* Toggle Campus ⇄ Private */}
                <View style={styles.toggleRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={isCampus ? "people-outline" : "lock-closed-outline"} size={16} color="#2563eb" />
                    <Text style={styles.toggleLabel}>Open to all MSU-IIT</Text>
                  </View>
                  <Switch
                    value={isCampus}
                    onValueChange={(next) =>
                      setVisState((s) => ({
                        ...s,
                        [id]: {
                          ...(s[id] || row),
                          visibility: next ? "campus" : "private",
                          allowedViewers: next ? "" : (s[id]?.allowedViewers ?? row.allowedViewers ?? ""),
                        },
                      }))
                    }
                    thumbColor={isCampus ? "#10B981" : "#64748B"}
                    trackColor={{ true: "#86efac", false: "#cbd5e1" }}
                  />
                </View>

                {/* Private allow-list */}
                {row.visibility === "private" && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.meta}>
                      Allowed Viewers (handles or MSU-IIT emails, comma-separated):
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="luis.marco, ana.santos, prof.delacruz@g.msuiit.edu.ph"
                      value={row.allowedViewers || ""}
                      onChangeText={(t) =>
                        setVisState((s) => ({
                          ...s,
                          [id]: { ...((s[id] as RowState) || row), allowedViewers: t },
                        }))
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <View style={styles.btnRow}>
                  {/* Open / No File button (WORKING) */}
                  {r.fileName ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
                      onPress={() => openWithSignedLink(id, r.fileName)}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>Open</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#9ca3af" }]}
                      onPress={() => Alert.alert("No PDF", "This entry has no attached file.")}
                    >
                      <Ionicons name="alert-circle-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>No File</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                    onPress={() => setEditing(r)}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => saveVisibility(id)}
                    disabled={!!(visState[id]?.saving)}
                  >
                    {visState[id]?.saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="eye-outline" size={18} color="#fff" />
                        <Text style={styles.btnText}>Save Visibility</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => handleDelete(r)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/staff")}>
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
          <Text style={{ color: "#2563eb", marginLeft: 6, fontWeight: "700" }}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ✏️ Edit modal (metadata) */}
      <Modal visible={!!editing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Research</Text>

            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={editing?.title}
                onChangeText={(t) => setEditing({ ...editing!, title: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Author"
                value={editing?.author}
                onChangeText={(t) => setEditing({ ...editing!, author: t })}
              />
              <TextInput
  style={styles.input}
  placeholder="Co-authors (comma-separated)"
  value={(editing?.coAuthors || []).join(", ")}
  onChangeText={(t) =>
    setEditing({
      ...editing!,
      coAuthors: t
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
    })
  }
  autoCapitalize="words"
/>

              <TextInput
                style={styles.input}
                placeholder="Year"
                value={editing?.year?.toString() || ""}
                onChangeText={(t) => setEditing({ ...editing!, year: t })}
              />
              <TextInput
                style={[styles.input, { height: 100 }]}
                multiline
                placeholder="Abstract"
                value={editing?.abstract}
                onChangeText={(t) => setEditing({ ...editing!, abstract: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Keywords (comma-separated)"
                value={
                  Array.isArray(editing?.keywords)
                    ? editing?.keywords?.join(", ")
                    : (editing?.keywords as string) || ""
                }
                onChangeText={(t) => setEditing({ ...editing!, keywords: t })}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#10B981" }]}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.modalBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#6B7280" }]}
                onPress={() => setEditing(null)}
              >
                <Ionicons name="close-outline" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ===================== Styles ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f9" },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f6f9" },
  header: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  toolbar: { marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#eef2ff",
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  sortChip: { flexDirection: "row", alignItems: "center" },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  noResult: { color: "#6b7280", textAlign: "center", marginTop: 40, fontSize: 14 },
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#eef2ff" },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  meta: { color: "#6b7280", fontSize: 13, marginBottom: 2 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  visRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginLeft: 8 },
  toggleRow: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: { color: "#0f172a", fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#f6f6f9",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#eef2ff",
    color: "#0f172a",
  },
  btnRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  backBtn: { marginTop: 24, flexDirection: "row", justifyContent: "center", alignItems: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});