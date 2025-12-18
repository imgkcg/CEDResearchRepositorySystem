// app/components/CentralRepository.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Linking,
  Modal,
  Switch,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../lib/api";
import { getToken } from "../lib/auth";

type Visibility = "campus" | "private";

type ResearchItem = {
  _id: string;
  title?: string;
  author?: string;
  coAuthors?: string[] | string;
  year?: string | number;
  createdAt?: string;
  visibility?: Visibility | "public" | "embargo";
  allowedViewers?: string[];
  keywords?: string[] | string;
  fileName?: string;

  // taxonomy
  categories?: string[];
  category?: string;
  genreTags?: string[] | string;

  abstract?: string;
};

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
    if (!token.includes("@")) {
      if (!LOCAL_OK.test(token)) {
        invalid.push(token);
        continue;
      }
      emails.push(`${token.toLowerCase()}${G_DOMAIN}`);
      continue;
    }
    const [local, domain] = token.toLowerCase().split("@");
    if (!local || !domain || !LOCAL_OK.test(local) || `@${domain}` !== G_DOMAIN) {
      invalid.push(token);
      continue;
    }
    emails.push(`${local}${G_DOMAIN}`);
  }

  const deduped = Array.from(new Set(emails));
  return { emails: deduped, invalid };
}

export default function CentralRepository() {
  const [researchList, setResearchList] = useState<ResearchItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"student" | "faculty" | "staff" | "admin" | "">("");

  // Visibility modal state
  const [visModalOpen, setVisModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<ResearchItem | null>(null);
  const [visChoice, setVisChoice] = useState<Visibility>("campus");
  const [allowedStr, setAllowedStr] = useState("");
  const [savingVis, setSavingVis] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ResearchItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // NEW: full-screen detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ResearchItem | null>(null);

  // AI Tools state
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCache, setAiCache] = useState<Record<string, string>>({});

  /* ============================
     Fetch list (from /research)
  ============================ */
  const fetchResearch = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      setRole((token.role as any) || "");

      const res = await api.get(`/research`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      const payload = res?.data;
      const data: ResearchItem[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setResearchList(data);
    } catch (err: any) {
      console.error("❌ Fetch failed:", err?.response?.data || err);
      Alert.alert("Error", "Failed to load research repository.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);

  /* =================================
     Local search (incl. categories[])
  ================================== */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return researchList;
    return researchList.filter((r) => {
      const kws = Array.isArray(r.keywords)
        ? r.keywords
        : (r.keywords || "").split(",").map((s) => s.trim()).filter(Boolean);

      const genres = Array.isArray(r.genreTags)
        ? r.genreTags
        : (r.genreTags || "").split(",").map((s) => s.trim()).filter(Boolean);

      const cats = Array.isArray(r.categories)
        ? r.categories
        : (r.category ? [r.category] : []);

      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.author || "").toLowerCase().includes(q) ||
        (Array.isArray(r.coAuthors)
          ? r.coAuthors.some((c) => (c || "").toLowerCase().includes(q))
          : (r.coAuthors || "").toLowerCase().includes(q)) ||
        (r.year ? String(r.year).includes(q) : false) ||
        cats.some((c) => (c || "").toLowerCase().includes(q)) ||
        (r.abstract || "").toLowerCase().includes(q) ||
        kws.some((k) => (k || "").toLowerCase().includes(q)) ||
        genres.some((g) => (g || "").toLowerCase().includes(q))
      );
    });
  }, [researchList, query]);

  const deleteItem = async (item: ResearchItem) => {
    // Web Alert fallback
    const confirmDelete =
      Platform.OS === "web"
        ? window.confirm(`Are you sure you want to permanently delete "${item.title || "Untitled"}"?`)
        : true;

    if (Platform.OS !== "web") {
      Alert.alert(
        "Confirm Delete",
        `Are you sure you want to permanently delete "${item.title || "Untitled"}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => await handleDelete(item),
          },
        ]
      );
    } else if (confirmDelete) {
      await handleDelete(item);
    }
  };

  // shared delete logic
  const handleDelete = async (item: ResearchItem) => {
    try {
      const token = await getToken();
      await api.delete(`/research-admin/${item._id}`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      setResearchList((prev) => prev.filter((r) => r._id !== item._id));

      if (Platform.OS === "web") {
        alert("✅ Research deleted successfully.");
      } else {
        Alert.alert("✅ Deleted", "The research has been removed from the repository.");
      }
    } catch (err: any) {
      console.error("❌ Delete failed:", err?.response?.data || err);
      const msg = err?.response?.data?.error || "Failed to delete research.";
      if (Platform.OS === "web") alert(`❌ ${msg}`);
      else Alert.alert("Error", msg);
    }
  };

  /* =================================
     Signed preview link
  ================================== */
  const openWithSignedLink = async (id: string, fileName?: string) => {
    try {
      const token = await getToken();
      const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
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

  /* =================================
     Visibility toggle (with modal)
  ================================== */
  const requestToggle = (item: ResearchItem, next: boolean) => {
    const nextVis: Visibility = next ? "campus" : "private";
    setPendingItem(item);
    setVisChoice(nextVis);
    setAllowedStr((item.allowedViewers || []).join(", "));
    setVisModalOpen(true);
  };

  const saveVisibility = async () => {
    if (!pendingItem) return;

    let emails: string[] = [];
    if (visChoice === "private") {
      const { emails: normed, invalid } = normalizeMsuiitList(allowedStr);
      if (invalid.length) {
        Alert.alert(
          "Invalid entries",
          `Only handles (e.g., luis.marco) or ${G_DOMAIN} emails are allowed:\n• ${invalid.join(
            "\n• "
          )}`
        );
        return;
      }
      if (normed.length === 0) {
        Alert.alert("Required", "Add at least one allowed viewer (handle or email).");
        return;
      }
      emails = normed;
    }

    try {
      setSavingVis(true);
      const token = await getToken();
      await api.put(
        `/research-admin/${pendingItem._id}/visibility`,
        {
          visibility: visChoice,
          embargoUntil: null,
          allowedViewers: visChoice === "private" ? emails : [],
        },
        { headers: { Authorization: `Bearer ${token.token}` } }
      );

      setResearchList((prev) =>
        prev.map((r) =>
          r._id === pendingItem._id
            ? {
                ...r,
                visibility: visChoice,
                allowedViewers: visChoice === "private" ? emails : [],
              }
            : r
        )
      );

      setVisModalOpen(false);
      setPendingItem(null);
      setAllowedStr("");
      Alert.alert("✅ Updated", `Visibility set to ${visChoice.toUpperCase()}`);
    } catch (err: any) {
      console.error("❌ Visibility update failed:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to update visibility.");
    } finally {
      setSavingVis(false);
    }
  };

  const isAdminOrStaff = role === "admin" || role === "staff";

  /* =================================
     Edit metadata (incl. abstract)
  ================================== */
  const openEdit = (item: ResearchItem) => {
    setEditItem(item);
    setEditTitle(item.title || "");
    setEditAuthor(item.author || "");
    setEditYear(item.year ? String(item.year) : "");
    const kw = Array.isArray(item.keywords) ? item.keywords.join(", ") : (item.keywords as string) || "";
    setEditKeywords(kw);
    setEditAbstract(item.abstract || "");
    setEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    if (!editTitle.trim() || !editAuthor.trim()) {
      Alert.alert("Required", "Title and Author are required.");
      return;
    }
    try {
      setSavingEdit(true);
      const token = await getToken();

      // normalize co-authors input (comma separated → array)
      const coAuthorsArray =
        typeof editItem.coAuthors === "string"
          ? editItem.coAuthors
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : Array.isArray(editItem.coAuthors)
          ? editItem.coAuthors
          : [];

      const { data } = await api.put(
        `/research-admin/${editItem._id}`,
        {
          title: editTitle.trim(),
          author: editAuthor.trim(),
          year: editYear.trim(),
          keywords: editKeywords, // server normalizes to array
          abstract: editAbstract,
        },
        { headers: { Authorization: `Bearer ${token.token}` } }
      );

      setResearchList((prev) =>
        prev.map((r) => (r._id === editItem._id ? { ...r, ...data.research } : r))
      );

      setEditModalOpen(false);
      setEditItem(null);
      Alert.alert("✅ Saved", "Research details updated.");
    } catch (err: any) {
      console.error("❌ Edit failed:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to update research.");
    } finally {
      setSavingEdit(false);
    }
  };

  /* =================================
     Detail modal helpers
  ================================== */
  const openDetails = (item: ResearchItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDetailItem(null);
    setAiMode(null);
    setAiError(null);
  };

  /* =================================
     AI Tools handler
  ================================== */
  const runAiTool = useCallback(async (mode: string, item: ResearchItem) => {
    setAiMode(mode);
    setAiError(null);
    
    const id = item._id + mode;
    if (aiCache[id]) return; // Use cached result
    
    try {
      setAiBusy(true);
      const token = await getToken();
      
      const res = await api.post(
        "/ai/abstract-tools",
        {
          mode,
          abstract: (item.abstract || "").trim(),
          meta: {
            title: (item.title || "").trim(),
            author: (item.author || "").trim(),
            year: item.year,
            categories: Array.isArray(item.categories) ? item.categories : (item.category ? [item.category] : []),
            genreTags: Array.isArray(item.genreTags) ? item.genreTags : [],
          },
          filePath: null, // Add filePath if available in ResearchItem
          researchId: item._id || null, // Pass research ID so backend can fetch filePath
        },
        { headers: { Authorization: `Bearer ${token.token}` } }
      );
      
      const text = res?.data?.text || "No output.";
      setAiCache(prev => ({ ...prev, [id]: text }));
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to run AI tool.";
      setAiError(msg);
      Alert.alert("AI Error", msg);
    } finally {
      setAiBusy(false);
    }
  }, [aiCache]);

  /* =================================
     UI
  ================================== */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Central Research Repository</Text>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#6b7280" />
        <TextInput
          placeholder="Search by title, author, keyword, year, category, or abstract"
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>No research found.</Text>
          ) : (
            filtered.map((r) => {
              const isCampus = (r.visibility || "campus") === "campus";

              const genreArray = Array.isArray(r.genreTags)
                ? r.genreTags
                : (r.genreTags || "").split(",").map((s) => s.trim()).filter(Boolean);

              const catArray = Array.isArray(r.categories)
                ? r.categories
                : (r.category ? [r.category] : []);

              const kwArray = Array.isArray(r.keywords)
                ? r.keywords
                : (r.keywords || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

              return (
                <View key={r._id} style={styles.card}>
                  {/* Make the UPPER section tappable to open details */}
                  <TouchableOpacity
                    onPress={() => openDetails(r)}
                    activeOpacity={0.8}
                    style={{ paddingBottom: 8 }}
                  >
                    <Text style={styles.title}>{r.title || "(Untitled)"}</Text>
                    <Text style={styles.meta}>Author: {r.author || "—"}</Text>
                    {r.coAuthors && (Array.isArray(r.coAuthors) ? r.coAuthors.length > 0 : r.coAuthors.trim() !== "") ? (
                      <Text style={styles.meta}>
                        Co-authors: {Array.isArray(r.coAuthors) ? r.coAuthors.join(", ") : r.coAuthors}
                      </Text>
                    ) : (
                      <Text style={styles.meta}>Co-authors: —</Text>
                    )}

                    <Text style={styles.meta}>Year: {r.year || "—"}</Text>

                    {/* Categories */}
                    {catArray.length > 0 ? (
                      <>
                        <Text style={styles.metaLabel}>Categories:</Text>
                        <View style={styles.tagRow}>
                          {catArray.map((c, i) => (
                            <View key={`${r._id}-c-${i}`} style={styles.tagChip}>
                              <Text style={styles.tagText}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.meta}>Categories: —</Text>
                    )}

                    {/* Genre tags */}
                    {genreArray.length > 0 ? (
                      <>
                        <Text style={styles.metaLabel}>Genre Tags:</Text>
                        <View style={styles.tagRow}>
                          {genreArray.map((g, i) => (
                            <View key={`${r._id}-g-${i}`} style={styles.tagChip}>
                              <Text style={styles.tagText}>{g}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.meta}>Genre Tags: —</Text>
                    )}

                    {/* Keywords */}
                    {kwArray.length > 0 ? (
                      <>
                        <Text style={styles.metaLabel}>Keywords:</Text>
                        <View style={styles.tagRow}>
                          {kwArray.map((k, i) => (
                            <View key={`${r._id}-k-${i}`} style={styles.tagChip}>
                              <Text style={styles.tagText}>{k}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.meta}>Keywords: —</Text>
                    )}

                    <Text style={styles.meta}>
                      Uploaded: {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </Text>

                    {/* Abstract preview (cropped here; full in detail modal) */}
                    <Text style={styles.metaLabel}>Abstract:</Text>
                    <Text style={styles.abstract} numberOfLines={3}>
                      {r.abstract || "—"}
                    </Text>
                  </TouchableOpacity>

                  {/* Bottom actions (not part of details tap) */}
                  <View style={styles.actions}>
                    {r.fileName ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
                        onPress={() => openWithSignedLink(r._id, r.fileName)}
                      >
                        <Ionicons name="document-text-outline" size={18} color="#fff" />
                        <Text style={styles.btnText}>Open</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.actionBtn, { backgroundColor: "#9ca3af" }]}>
                        <Ionicons name="alert-circle-outline" size={18} color="#fff" />
                        <Text style={styles.btnText}>No file attached</Text>
                      </View>
                    )}

                    <View style={{ alignItems: "flex-end" }}>
                      <View style={styles.badge}>
                        <Ionicons
                          name={isCampus ? "people-outline" : "lock-closed-outline"}
                          size={14}
                          color="#2563eb"
                        />
                        <Text style={styles.badgeText}>
                          {(r.visibility || "campus").toUpperCase()}
                        </Text>
                      </View>

                      {isAdminOrStaff && (
                        <>
                          <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>Open to all MSU-IIT</Text>
                            <Switch
                              value={isCampus}
                              onValueChange={(next) => requestToggle(r, next)}
                              thumbColor={isCampus ? "#10B981" : "#64748B"}
                              trackColor={{ true: "#86efac", false: "#cbd5e1" }}
                            />
                          </View>

                          <View style={styles.rowButtons}>
                            <TouchableOpacity
                              style={[styles.smallBtn, { backgroundColor: "#F59E0B" }]}
                              onPress={() => openEdit(r)}
                            >
                              <Ionicons name="create-outline" size={16} color="#fff" />
                              <Text style={styles.smallBtnText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.smallBtn, { backgroundColor: "#EF4444" }]}
                              onPress={() => deleteItem(r)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#fff" />
                              <Text style={styles.smallBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>

                          {r.visibility === "private" && (
                            <TouchableOpacity
                              style={styles.manageBtn}
                              onPress={() => {
                                setPendingItem(r);
                                setVisChoice("private");
                                setAllowedStr((r.allowedViewers || []).join(", "));
                                setVisModalOpen(true);
                              }}
                            >
                              <Ionicons name="people-circle-outline" size={16} color="#2563eb" />
                              <Text style={styles.manageText}>Manage allowed viewers</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Confirm Visibility Modal */}
      <Modal visible={visModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set Visibility</Text>
            <Text style={{ color: "#6b7280", marginBottom: 12 }}>
              Campus: visible to all signed-in MSU-IIT ({G_DOMAIN}) accounts.{"\n"}
              Private: only the allow-listed MSU-IIT users.
            </Text>

            {/* Segmented choice */}
            <View style={styles.segmentRow}>
              <TouchableOpacity
                onPress={() => setVisChoice("campus")}
                style={[styles.segmentBtn, visChoice === "campus" && styles.segmentActive]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={visChoice === "campus" ? "#fff" : "#2563eb"}
                />
                <Text
                  style={[styles.segmentText, visChoice === "campus" && styles.segmentTextActive]}
                >
                  Campus (MSU-IIT)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setVisChoice("private")}
                style={[styles.segmentBtn, visChoice === "private" && styles.segmentActive]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={visChoice === "private" ? "#fff" : "#2563eb"}
                />
                <Text
                  style={[styles.segmentText, visChoice === "private" && styles.segmentTextActive]}
                >
                  Private (Allow-list)
                </Text>
              </TouchableOpacity>
            </View>

            {visChoice === "private" && (
              <>
                <Text style={{ color: "#0f172a", marginTop: 12, marginBottom: 6, fontWeight: "600" }}>
                  Allowed Viewers
                </Text>
                <Text style={{ color: "#6b7280" }}>
                  Enter handles (e.g., <Text style={{ fontWeight: "700" }}>luis.marco</Text>) or full
                  emails. Handles will automatically become{" "}
                  <Text style={{ fontWeight: "700" }}>{G_DOMAIN}</Text>.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={`luis.marco, ana.santos, prof.delacruz${G_DOMAIN}`}
                  value={allowedStr}
                  onChangeText={setAllowedStr}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#10B981" }]}
                onPress={saveVisibility}
                disabled={savingVis || !pendingItem}
              >
                {savingVis ? (
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
                onPress={() => {
                  setVisModalOpen(false);
                  setPendingItem(null);
                  setAllowedStr("");
                }}
                disabled={savingVis}
              >
                <Ionicons name="close-outline" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Research</Text>

            {/* Title */}
            <Text style={styles.label}>Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            {/* Author */}
            <Text style={styles.label}>Author:</Text>
            <TextInput
              style={styles.input}
              placeholder="Author"
              value={editAuthor}
              onChangeText={setEditAuthor}
            />

            {/* Co-Authors */}
            <Text style={styles.label}>Co-Authors:</Text>
            <TextInput
              style={styles.input}
              placeholder="Co-authors (comma-separated)"
              value={
                Array.isArray(editItem?.coAuthors)
                  ? editItem.coAuthors.join(", ")
                  : (editItem?.coAuthors as string) || ""
              }
              onChangeText={(text) =>
                setEditItem((prev) => (prev ? { ...prev, coAuthors: text } : null))
              }
            />

            {/* Year */}
            <Text style={styles.label}>Year:</Text>
            <TextInput
              style={styles.input}
              placeholder="Year"
              value={editYear}
              onChangeText={setEditYear}
              keyboardType="numeric"
            />

            {/* Keywords */}
            <Text style={styles.label}>Keywords:</Text>
            <TextInput
              style={styles.input}
              placeholder="Keywords (comma-separated)"
              value={editKeywords}
              onChangeText={setEditKeywords}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Abstract */}
            <Text style={styles.label}>Abstract:</Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              placeholder="Abstract"
              value={editAbstract}
              onChangeText={setEditAbstract}
              multiline
            />

            {/* Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#10B981" }]}
                onPress={saveEdit}
                disabled={savingEdit || !editItem}
              >
                {savingEdit ? (
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
                onPress={() => {
                  setEditModalOpen(false);
                  setEditItem(null);
                }}
                disabled={savingEdit}
              >
                <Ionicons name="close-outline" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔎 FULL-SCREEN DETAILS MODAL */}
      <Modal
        visible={detailOpen}
        onRequestClose={closeDetails}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
        transparent={false}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f9" }}>
          <View style={{ flex: 1, backgroundColor: "#f6f6f9" }}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={closeDetails} style={styles.detailIconBtn}>
                <Ionicons name="chevron-back" size={22} color="#0f172a" />
                <Text style={{ color: "#0f172a", fontWeight: "700" }}>Back</Text>
              </TouchableOpacity>

              {detailItem?.fileName ? (
                <TouchableOpacity
                  onPress={() => openWithSignedLink(detailItem!._id, detailItem!.fileName)}
                  style={styles.detailIconBtn}
                >
                  <Ionicons name="document-text-outline" size={20} color="#2563eb" />
                  <Text style={{ color: "#2563eb", fontWeight: "700" }}>Open PDF</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Body */}
            <ScrollView contentContainerStyle={styles.detailBody}>
              <Text style={styles.detailTitle}>{detailItem?.title || "(Untitled)"}</Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
                <Badge icon="person-outline" text={`Author: ${detailItem?.author || "—"}`} />
                {detailItem?.coAuthors && (Array.isArray(detailItem.coAuthors) ? detailItem.coAuthors.length > 0 : detailItem.coAuthors.trim() !== "") ? (
                  <Badge icon="people-outline" text={`Co-authors: ${
                    Array.isArray(detailItem.coAuthors) ? detailItem.coAuthors.join(", ") : detailItem.coAuthors
                  }`} />
                ) : null}

                <Badge icon="calendar-outline" text={`Year: ${detailItem?.year || "—"}`} />
                <Badge
                  icon={
                    (detailItem?.visibility || "campus") === "campus"
                      ? "people-outline"
                      : "lock-closed-outline"
                  }
                  text={(detailItem?.visibility || "campus").toUpperCase()}
                />
                {detailItem?.createdAt ? (
                  <Badge
                    icon="time-outline"
                    text={`Uploaded: ${new Date(detailItem.createdAt).toLocaleDateString()}`}
                  />
                ) : null}
              </View>

              {/* Chips */}
              {(() => {
                const cats = Array.isArray(detailItem?.categories)
                  ? detailItem!.categories!
                  : detailItem?.category
                  ? [detailItem.category]
                  : [];
                const tags = Array.isArray(detailItem?.genreTags)
                  ? (detailItem!.genreTags as string[])
                  : (detailItem?.genreTags || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                const kws = Array.isArray(detailItem?.keywords)
                  ? (detailItem!.keywords as string[])
                  : (detailItem?.keywords || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);

                return (
                  <>
                    <ChipBlock label="Categories" items={cats} />
                    <ChipBlock label="Genre Tags" items={tags} />
                    <ChipBlock label="Keywords" items={kws} />
                  </>
                );
              })()}

              {/* Abstract (full) */}
              <Text style={styles.detailSection}>Abstract</Text>
              <Text style={styles.detailAbstract}>{detailItem?.abstract || "—"}</Text>

              {/* AI Tools */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {([
                  ["tldr", "Short takeaway"],
                  ["methods", "Methods checklist"],
                  ["citations", "Citations"],
                  ["recommendations", "Recommendations"],
                ] as [string, string][]).map(([key, label]) => {
                  const active = aiMode === key && detailItem?._id;
                  return (
                    <TouchableOpacity
                      key={key}
                      disabled={aiBusy}
                      onPress={() => detailItem && runAiTool(key, detailItem)}
                      style={[
                        {
                          backgroundColor: active ? "#2563eb" : "#ffffff",
                          borderWidth: 1,
                          borderColor: "#dbeafe",
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          marginBottom: 4,
                        },
                        aiBusy && { opacity: 0.6 }
                      ]}
                    >
                      <Text style={{
                        color: active ? "#fff" : "#2563eb",
                        fontSize: 11,
                        fontWeight: "700"
                      }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* AI Output */}
              {aiMode && detailItem && (
                <View style={{
                  backgroundColor: "#f6f6f9",
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "#eef2ff",
                }}>
                  {aiBusy ? (
                    <ActivityIndicator size="large" color="#2563eb" />
                  ) : aiError ? (
                    <Text style={{ color: "#ef4444", fontSize: 14 }}>{aiError}</Text>
                  ) : (
                    <Text style={{ color: "#0f172a", fontSize: 14, lineHeight: 22 }}>
                      {aiCache[detailItem._id + aiMode] || "Generating…"}
                    </Text>
                  )}
                </View>
              )}

              {/* Spacer */}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/* ---------- Small presentational helpers ---------- */
function Badge({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.badgeDetail}>
      <Ionicons name={icon} size={14} color="#2563eb" />
      <Text style={styles.badgeDetailText}>{text}</Text>
    </View>
  );
}

function ChipBlock({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) {
    return (
      <Text style={[styles.meta, { marginTop: 10 }]}>
        {label}: —
      </Text>
    );
  }
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.metaLabel}>{label}:</Text>
      <View style={styles.tagRow}>
        {items.map((t, i) => (
          <View key={`${label}-${i}`} style={styles.tagChip}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f6f6f9" },
  header: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#eef2ff",
  },
  searchInput: { flex: 1, color: "#0f172a", paddingHorizontal: 6 },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 30 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef2ff",
  },
  title: { color: "#0f172a", fontWeight: "700", fontSize: 16, marginBottom: 6 },
  meta: { color: "#6b7280", fontSize: 13 },

  metaLabel: { color: "#0f172a", marginTop: 6, fontSize: 12, fontWeight: "700" },
  abstract: { color: "#6b7280", fontSize: 13, lineHeight: 18, marginTop: 2 },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  tagChip: {
    backgroundColor: "#dbeafe",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignSelf: "flex-end",
  },
  badgeText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },

  toggleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-end",
  },
  toggleLabel: { color: "#0f172a", fontSize: 12, fontWeight: "600" },
  label: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },

  rowButtons: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-end",
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  manageBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  manageText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },

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
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
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
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  segmentActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  segmentText: { color: "#2563eb", fontWeight: "700", fontSize: 12 },
  segmentTextActive: { color: "#fff" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    minWidth: 120,
  },

  /* Full-screen details modal styles */
  detailHeader: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ff",
  },
  detailIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
  },
  detailBody: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  detailTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: 8,
  },
  badgeDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  badgeDetailText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  detailSection: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 18,
    marginBottom: 6,
  },
  detailAbstract: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
  },
});