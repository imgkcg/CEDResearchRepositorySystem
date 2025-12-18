import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
  Dimensions,
  StatusBar,
} from "react-native";
import { useMe } from "./useMe";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useFacultyData, normalizeType } from "./useFaculty";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";

/** 🎨 Professional Academic Theme - Modern & Clean */
const C = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#3b82f6",
  primaryGradient: ["#2563eb", "#1d4ed8"],
  secondary: "#7c3aed",
  accent: "#f59e0b",
  bg: "#f8fafc",
  card: "#ffffff",
  surface: "#f1f5f9",
  ink: "#1e293b",
  inkLight: "#475569",
  mute: "#64748b",
  subtle: "#94a3b8",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#2563eb",
};

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

// Font configuration
const FONTS = {
  heading: Platform.select({
    ios: "AvenirNext-Bold",
    android: "Inter-Bold",
    default: "sans-serif",
  }),
  subheading: Platform.select({
    ios: "AvenirNext-DemiBold",
    android: "Inter-Medium",
    default: "sans-serif",
  }),
  body: Platform.select({
    ios: "AvenirNext-Regular",
    android: "Inter-Regular",
    default: "sans-serif",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "RobotoMono-Regular",
    default: "monospace",
  }),
};

type SubmissionType = "draft" | "final";

export default function FacultyResearch() {
  const { name } = useMe();
  const { myResearch, uploadResearch } = useFacultyData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [list, setList] = useState<any[]>(myResearch);
  
  useEffect(() => setList(myResearch), [myResearch]);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "draft" | "final">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  // Form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [submissionType, setSubmissionType] = useState<SubmissionType>("draft");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editSubmissionType, setEditSubmissionType] = useState<SubmissionType>("draft");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  // Filter and search functionality
  const filteredList = useMemo(() => {
    return list.filter(item => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" ||
        item.title?.toLowerCase().includes(searchLower) ||
        item.abstract?.toLowerCase().includes(searchLower) ||
        (Array.isArray(item.keywords) && item.keywords.some((k: string) => 
          k.toLowerCase().includes(searchLower)
        )) ||
        item.keywords?.toString().toLowerCase().includes(searchLower);

      // Type filter
      const itemType = normalizeType(item);
      const matchesType = filterType === "all" || itemType === filterType;

      return matchesSearch && matchesType;
    }).sort((a, b) => {
      // Sorting
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });
  }, [list, searchQuery, filterType, sortBy]);

  // Statistics - Only 3 stats (Total Papers, Drafts, Final Papers)
  const statsData = useMemo(() => {
    const total = list.length;
    const drafts = list.filter(item => normalizeType(item) === "draft").length;
    const finals = list.filter(item => normalizeType(item) === "final").length;

    return [
      {
        id: 'total',
        icon: 'book',
        value: total,
        label: 'Total Papers',
        color: C.primary,
      },
      {
        id: 'drafts',
        icon: 'create',
        value: drafts,
        label: 'Drafts',
        color: C.warning,
      },
      {
        id: 'finals',
        icon: 'checkmark-circle',
        value: finals,
        label: 'Final Papers',
        color: C.success,
      },
    ];
  }, [list]);

  const doUpload = async () => {
    if (!title.trim() || !abstract.trim()) {
      Alert.alert("Missing info", "Title and Abstract are required");
      return;
    }
    setBusy(true);
    try {
      const response = await uploadResearch({
        title,
        abstract,
        submissionType,
        keywords,
        file: Platform.OS === "web" ? file ?? undefined : undefined,
      });

      if (response?.research) {
        setList((prev) => [response.research, ...prev]);
      } else if (response) {
        setList((prev) => [response, ...prev]);
      }

      setTitle("");
      setAbstract("");
      setKeywords("");
      setSubmissionType("draft");
      setFile(null);
      setShowUploadModal(false);
      Alert.alert("Success", "Research uploaded successfully!");
    } catch (e: any) {
      console.error("Upload error:", e);
      Alert.alert(
        "Upload failed",
        e?.response?.data?.error || e?.message || "Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  async function openFacultyFile(item: any) {
    try {
      console.log("Opening file for item:", item);
      
      if (!item?._id) {
        Alert.alert("Error", "Invalid file record");
        return;
      }

      // Get token
      const tokenObj = await getToken();
      const token = tokenObj?.token;
      if (!token) {
        Alert.alert("Session expired", "Please sign in again.");
        return;
      }

      console.log("Token obtained, item ID:", item._id);

      // Construct URL properly
      let apiBase = api.defaults.baseURL || "";
      apiBase = apiBase.replace(/\/+$/, ""); // Remove trailing slashes
      
      // If it's a relative URL, make it absolute for web
      if (Platform.OS === "web" && !apiBase.startsWith("http")) {
        apiBase = `${window.location.origin}${apiBase}`;
      }

      const url = `${apiBase}/faculty/preview/${item._id}`;
      console.log("Attempting to open URL:", url);

      if (Platform.OS === "web") {
        // For web, fetch and open in new tab
        const res = await fetch(url, { 
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Accept": "application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          } 
        });
        
        console.log("Fetch response status:", res.status);
        
        if (!res.ok) {
          let errorDetail = "";
          try { 
            errorDetail = await res.text(); 
            console.log("Error detail:", errorDetail);
          } catch {}
          
          if (res.status === 404) {
            try {
              const errorJson = JSON.parse(errorDetail);
              if (errorJson.error === "File not found on disk") {
                Alert.alert(
                  "File Missing", 
                  `The file "${item.fileName || 'attachment'}" was not found on the server.\n\n` +
                  `Please re-upload the file or contact support.\n\n` +
                  `Research ID: ${item._id}`
                );
              } else {
                Alert.alert("File Not Found", errorJson.error || "File not found on server.");
              }
            } catch {
              Alert.alert(
                "File Not Found", 
                "This research paper doesn't have an attached file or the file has been removed."
              );
            }
            return;
          }
          
          Alert.alert(
            "Error Opening File", 
            `Server responded with status: ${res.status}\n${errorDetail || 'Please try again later.'}`
          );
          return;
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = blobUrl;
        a.target = "_blank";
        
        const filename = item.fileName || `research-${item._id}.pdf`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        
        console.log("File opened successfully");
        return;
      }

      console.log("Opening URL on mobile:", url);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this file type on your device.");
      }
    } catch (e: any) {
      console.error("❌ Faculty open file error:", e);
      
      let errorMessage = e?.message || "Failed to open file.";
      
      if (e?.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e?.status) {
        errorMessage = `Server error: ${e.status}`;
      }
      
      Alert.alert("Error Opening File", errorMessage);
    }
  }

  function confirmDelete(item: any) {
    if (!item?._id) return;

    if (Platform.OS === "web") {
      const ok = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
      if (ok) doDelete(item);
      return;
    }

    Alert.alert(
      "Delete this paper?",
      `This will remove "${item?.title}" from your uploads.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => doDelete(item) },
      ]
    );
  }

  async function doDelete(item: any) {
    if (!item?._id) return;
    try {
      setDeletingIds((m) => ({ ...m, [item._id]: true }));
      await api.delete(`/faculty/my-research/${item._id}`);
      setList((prev) => prev.filter((x) => x._id !== item._id));
      Alert.alert("Success", "Research deleted successfully!");
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to delete.";
      if (Platform.OS === "web") {
        window.alert(`Delete failed: ${msg}`);
      } else {
        Alert.alert("Delete failed", msg);
      }
    } finally {
      setDeletingIds((m) => {
        const { [item._id]: _, ...rest } = m;
        return rest;
      });
    }
  }

  function startEdit(item: any) {
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditAbstract(item.abstract || "");
    setEditKeywords(Array.isArray(item.keywords) ? item.keywords.join(", ") : (item.keywords || ""));
    setEditSubmissionType(normalizeType(item) as SubmissionType);
    setReplaceFile(null);
    setShowEditModal(true);
  }

  function cancelEdit() {
    setShowEditModal(false);
    setEditingItem(null);
    setEditTitle("");
    setEditAbstract("");
    setEditKeywords("");
    setEditSubmissionType("draft");
    setReplaceFile(null);
  }

  async function saveEdit() {
    if (!editingItem?._id) return;
    if (!editTitle.trim() || !editAbstract.trim()) {
      Alert.alert("Missing info", "Title and Abstract are required");
      return;
    }
    setEditBusy(true);
    try {
      const tokenObj = await getToken();
      const token = tokenObj?.token;
      
      if (!token) {
        Alert.alert("Session expired", "Please sign in again.");
        return;
      }

      const fd = new FormData();
      fd.append("title", editTitle);
      fd.append("abstract", editAbstract);
      fd.append("submissionType", editSubmissionType);
      
      const keywordsToSend = editKeywords.trim();
      console.log("Keywords to send:", keywordsToSend);
      fd.append("keywords", keywordsToSend);
      
      if (Platform.OS === "web" && replaceFile) {
        console.log("Replacing file with:", replaceFile.name);
        fd.append("file", replaceFile);
        fd.append("replaceFile", "true");
      }
      
      const { data } = await api.put(`/faculty/my-research/${editingItem._id}`, fd, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
      });
      
      console.log("Backend response:", data);
      
      let updatedKeywords = [];
      if (data?.keywords) {
        updatedKeywords = Array.isArray(data.keywords) ? data.keywords : [];
      } else if (data?.research?.keywords) {
        updatedKeywords = Array.isArray(data.research.keywords) ? data.research.keywords : [];
      } else if (keywordsToSend) {
        updatedKeywords = keywordsToSend.split(",")
          .map(k => k.trim())
          .filter(k => k.length > 0);
      }
      
      const updated = data?.research || data || {};
      setList(prev =>
        prev.map(r =>
          r._id === editingItem._id
            ? {
                ...r,
                ...updated,
                title: editTitle,
                abstract: editAbstract,
                submissionType: editSubmissionType,
                keywords: updatedKeywords,
                ...(replaceFile ? {
                  fileName: replaceFile.name,
                  fileType: replaceFile.type
                } : {})
              }
            : r
        )
      );

      Alert.alert("Success", "Research updated successfully!");
      cancelEdit();
    } catch (e: any) {
      console.error("Edit error details:", e.response || e);
      const msg = e?.response?.data?.error || e?.message || "Failed to save changes.";
      Alert.alert("Edit failed", msg);
    } finally {
      setEditBusy(false);
    }
  }

  const navItems = [
    {
      id: 'dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      onPress: () => router.push("/faculty"),
    },
    {
      id: 'research',
      icon: 'document-text-outline',
      activeIcon: 'document-text',
      label: 'My Research',
      active: true,
      onPress: () => {},
    },
    {
      id: 'students',
      icon: 'people-outline',
      activeIcon: 'people',
      label: 'Student Works',
      onPress: () => router.push("/faculty/submissions"),
    },
    {
      id: 'repository',
      icon: 'library-outline',
      activeIcon: 'library',
      label: 'Repository',
      onPress: () => router.push("/repository/faculty"),
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      onPress: () => router.push("/faculty/profile"),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar Navigation - Matching Base Design */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Logo and Toggle */}
        <View style={styles.sidebarHeader}>
          {!sidebarCollapsed ? (
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="school" size={28} color={C.primary} />
              </View>
              <View>
                <Text style={styles.logoText}>Faculty Portal</Text>
                <Text style={styles.logoSubtext}>Research Management</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.collapsedLogo}
              onPress={() => setSidebarCollapsed(false)}
            >
              <View style={styles.miniLogo}>
                <Ionicons name="school" size={24} color={C.primary} />
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Ionicons 
              name={sidebarCollapsed ? "chevron-forward" : "chevron-back"} 
              size={20} 
              color={C.mute} 
            />
          </TouchableOpacity>
        </View>

        {/* User Profile */}
        {!sidebarCollapsed && (
          <TouchableOpacity 
            style={styles.userSection}
            onPress={() => router.push("/faculty/profile")}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person-circle" size={44} color={C.primary} />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{name || "Professor"}</Text>
              <Text style={styles.userRole}>Faculty Member</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Main Navigation */}
        <View style={styles.navSection}>
          {!sidebarCollapsed && (
            <Text style={styles.navSectionTitle}>MENU</Text>
          )}
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              activeIcon={item.activeIcon}
              label={item.label}
              active={item.active}
              collapsed={sidebarCollapsed}
              onPress={item.onPress}
            />
          ))}
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => router.push("/login")}
          >
            <Ionicons name="log-out-outline" size={20} color={C.mute} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area - Matching Base Design */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Upload Modal - Positioned within main content area */}
        {showUploadModal && (
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              { 
                maxWidth: Math.min(contentWidth - 48, 1200),
                alignSelf: 'center',
                maxHeight: Dimensions.get('window').height * 0.99,
              }
            ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload New Research</Text>
                <TouchableOpacity 
                  onPress={() => setShowUploadModal(false)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Research Title</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="document-text-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter research title"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Abstract / Summary</Text>
                <View style={[styles.inputWrap, { height: 140, alignItems: "flex-start" }]}>
                  <Ionicons name="create-outline" size={20} color="#64748b" style={{ marginTop: 12, marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter abstract"
                    style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                    value={abstract}
                    onChangeText={setAbstract}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Keywords (comma-separated)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="pricetags-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="e.g., biomechanics, gait, EMG"
                    style={styles.input}
                    value={keywords}
                    onChangeText={setKeywords}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.label}>Submission Type</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                      {(["draft", "final"] as const).map((opt) => {
                        const active = submissionType === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => setSubmissionType(opt)}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: active ? "#2563EB" : "#E2E8F0",
                              backgroundColor: active ? "#EFF6FF" : "#F8FAFC",
                            }}
                          >
                            <Text style={{ fontWeight: "800", color: "#1E293B" }}>{opt.toUpperCase()}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {Platform.OS === "web" && (
                    <View style={styles.formColumn}>
                      <Text style={styles.label}>Attach File (optional)</Text>
                      <input
                        type="file"
                        accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
                        onChange={(e) => setFile((e.target.files?.[0] as any) || null)}
                        style={{ 
                          marginTop: 8,
                          padding: '8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      />
                      {file ? (
                        <Text style={{ marginTop: 6, color: "#475569", fontSize: 12 }}>
                          Selected: <Text style={{ fontWeight: "700" }}>{file.name}</Text>
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    disabled={busy}
                    onPress={doUpload}
                    style={[styles.modalPrimaryButton, busy && { opacity: 0.6 }]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={18} color="#fff" />
                        <Text style={styles.modalPrimaryButtonText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setShowUploadModal(false)}
                    style={styles.modalSecondaryButton}
                  >
                    <Ionicons name="close-outline" size={18} color={C.mute} />
                    <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Edit Modal - Positioned within main content area */}
        {showEditModal && (
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              { 
                maxWidth: Math.min(contentWidth - 48, 1200),
                alignSelf: 'center',
                maxHeight: Dimensions.get('window').height * 0.95,
              }
            ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Research</Text>
                <TouchableOpacity 
                  onPress={cancelEdit} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Research Title</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="document-text-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter research title"
                    style={styles.input}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Abstract / Summary</Text>
                <View style={[styles.inputWrap, { height: 140, alignItems: "flex-start" }]}>
                  <Ionicons name="create-outline" size={20} color="#64748b" style={{ marginTop: 12, marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter abstract"
                    style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                    value={editAbstract}
                    onChangeText={setEditAbstract}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Keywords (comma-separated)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="pricetags-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="e.g., biomechanics, gait, EMG"
                    style={styles.input}
                    value={editKeywords}
                    onChangeText={setEditKeywords}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  {editKeywords.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setEditKeywords("")}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.label}>Submission Type</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                      {(["draft", "final"] as const).map((opt) => {
                        const active = editSubmissionType === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => setEditSubmissionType(opt)}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: active ? "#2563EB" : "#E2E8F0",
                              backgroundColor: active ? "#EFF6FF" : "#F8FAFC",
                            }}
                          >
                            <Text style={{ fontWeight: "800", color: "#1E293B" }}>{opt.toUpperCase()}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {Platform.OS === "web" && (
                    <View style={styles.formColumn}>
                      <Text style={styles.label}>Replace File (optional)</Text>
                      <input
                        type="file"
                        accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setReplaceFile(file as any);
                          }
                        }}
                        style={{ 
                          marginTop: 8,
                          padding: '8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      />
                      <View style={{ marginTop: 8 }}>
                        {editingItem?.fileName && !replaceFile && (
                          <Text style={{ color: "#475569", fontSize: 12 }}>
                            <Text style={{ fontWeight: "600" }}>Current file:</Text> {editingItem.fileName}
                          </Text>
                        )}
                        {replaceFile ? (
                          <Text style={{ color: "#3b82f6", fontSize: 12 }}>
                            <Text style={{ fontWeight: "600" }}>New file:</Text> {replaceFile.name}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    disabled={editBusy}
                    onPress={saveEdit}
                    style={[styles.modalPrimaryButton, editBusy && { opacity: 0.6 }]}
                  >
                    {editBusy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color="#fff" />
                        <Text style={styles.modalPrimaryButtonText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={cancelEdit}
                    style={styles.modalSecondaryButton}
                  >
                    <Ionicons name="close-outline" size={18} color={C.mute} />
                    <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>My Research</Text>
              <Text style={styles.userGreeting}>Upload, edit & manage your papers</Text>
            </View>
            
            <View style={styles.navbarActions}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Upload New
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push("/faculty/profile")}
              >
                <View style={styles.smallAvatar}>
                  <Ionicons name="person" size={18} color={C.primary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section - Matching Base */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={C.primaryGradient}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.heroContent}>
                <View>
                  <Text style={styles.heroTitle}>Research Management</Text>
                  <Text style={styles.heroSubtitle}>
                    Upload, edit, and manage your academic research papers and publications
                  </Text>
                </View>
                <Ionicons name="document-text" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Key Metrics - Only 3 stats now */}
          <View style={styles.metricsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Research Overview</Text>
            
            </View>
            
            {/* Container with 3 stats that stay horizontal */}
            <View style={[
              styles.statsContainer,
              { 
                width: '100%',
                flexDirection: 'row',
                flexWrap: 'nowwrap',
                justifyContent: 'space-between',
                alignItems: 'stretch',
              }
            ]}>
              {statsData.map((stat, index) => (
                <View 
                  key={stat.id}
                  style={[
                    styles.statItem,
                    { 
                      flex: 1,
                      marginRight: index < statsData.length - 1 ? 12 : 0,
                      minWidth: 140, // Slightly larger for 3 items
                    }
                  ]}
                >
                  <MetricCard
                    icon={stat.icon}
                    value={stat.value}
                    label={stat.label}
                    color={stat.color}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Search and Filter Section - UPDATED: Filters on right side, horizontal */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
                {/* Search input on left */}
                <View style={styles.searchInputContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search papers..."
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#94a3b8"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Filters on right - horizontal */}
                <View style={styles.filtersContainer}>
                  {/* Type Filter */}
                  <View style={styles.filterGroupHorizontal}>
                    <Ionicons name="filter" size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <View style={styles.filterButtons}>
                      {(["all", "draft", "final"] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setFilterType(type)}
                          style={[
                            styles.filterButton,
                            filterType === type && styles.filterButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.filterButtonText,
                            filterType === type && styles.filterButtonTextActive
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Sort By */}
                  <View style={styles.filterGroupHorizontal}>
                    <Ionicons name="swap-vertical" size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <View style={styles.filterButtons}>
                      {(["newest", "oldest", "title"] as const).map((sort) => (
                        <TouchableOpacity
                          key={sort}
                          onPress={() => setSortBy(sort)}
                          style={[
                            styles.filterButton,
                            sortBy === sort && styles.filterButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.filterButtonText,
                            sortBy === sort && styles.filterButtonTextActive
                          ]}>
                            {sort.charAt(0).toUpperCase() + sort.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            {searchQuery && (
              <Text style={styles.resultsCount}>
                {filteredList.length} result{filteredList.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {/* Research List */}
          {filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching research found" : "No research uploaded yet"}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery ? "Try different search terms" : "Upload your first research paper to get started"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={styles.uploadEmptyButton}
                  onPress={() => setShowUploadModal(true)}
                >
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.uploadEmptyText}>Upload Your First Paper</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.researchList}>
              {filteredList.map((r: any) => {
                const isFinal = normalizeType(r) === "final";
                const deleting = !!deletingIds[r._id];

                return (
                  <View key={r._id} style={styles.researchCard}>
                    <View style={styles.researchHeader}>
                      <View style={styles.researchIcon}>
                        <Ionicons name="document-text" size={20} color="#2563eb" />
                      </View>
                      <View style={styles.researchTitleContainer}>
                        <Text style={styles.researchTitle}>{r.title}</Text>
                        <TypeBadge isFinal={isFinal} />
                      </View>
                    </View>

                    <Text style={styles.researchAbstract} numberOfLines={2}>
                      {r.abstract}
                    </Text>

                    {!!r.keywords?.length && (
                      <View style={styles.keywordsContainer}>
                        {r.keywords.map((k: string) => (
                          <View key={`${r._id}-${k}`} style={styles.keywordTag}>
                            <Text style={styles.keywordText}>#{k}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.researchFooter}>
                      <Text style={styles.researchDate}>
                        Uploaded: {new Date(r.createdAt).toLocaleDateString()}
                      </Text>
                      
                      <View style={styles.actionButtons}>
                        {r.fileName ? (
                          <TouchableOpacity onPress={() => openFacultyFile(r)} style={styles.viewButton}>
                            <Ionicons name="attach-outline" size={16} color="#2563EB" />
                            <Text style={styles.viewButtonText}>View File</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.viewButtonDisabled}>
                            <Ionicons name="attach-outline" size={16} color="#94A3B8" />
                            <Text style={[styles.viewButtonText, { color: "#94A3B8" }]}>No File</Text>
                          </View>
                        )}

                        <TouchableOpacity onPress={() => startEdit(r)} style={styles.editButton}>
                          <Ionicons name="create-outline" size={16} color="#0f766e" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => (deleting ? null : confirmDelete(r))}
                          style={[styles.deleteButton, deleting && { opacity: 0.6 }]}
                          disabled={deleting}
                        >
                          {deleting ? (
                            <ActivityIndicator size="small" color="#b91c1c" />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                              <Text style={styles.deleteButtonText}>Delete</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

/* ---------- Reusable Components ---------- */

function NavItem({ 
  icon, 
  activeIcon,
  label, 
  active,
  collapsed,
  onPress 
}: { 
  icon: string;
  activeIcon: string;
  label: string; 
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.navItem, active && styles.navItemActive]}
    >
      <View style={styles.navIconContainer}>
        <Ionicons 
          name={active ? activeIcon : icon} 
          size={22} 
          color={active ? C.primary : C.sidebarText} 
        />
      </View>
      {!collapsed && (
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MetricCard({ 
  icon, 
  value, 
  label, 
  color,
  onPress 
}: { 
  icon: any; 
  value: string | number; 
  label: string; 
  color: string;
  onPress?: () => void;
}) {
  const Content = (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.metricCardTouchable}>
        {Content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.metricCardTouchable}>{Content}</View>;
}

function TypeBadge({ isFinal }: { isFinal: boolean }) {
  return (
    <View style={[
      styles.typeBadge,
      isFinal ? styles.finalBadge : styles.draftBadge
    ]}>
      <Text style={[
        styles.typeBadgeText,
        isFinal ? styles.finalBadgeText : styles.draftBadgeText
      ]}>
        {isFinal ? "FINAL" : "DRAFT"}
      </Text>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: C.bg,
  },
  
  // Sidebar Styles - Matching Base
  sidebar: {
    backgroundColor: C.sidebarBg,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: C.borderLight,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.heading,
  },
  logoSubtext: {
    color: C.mute,
    fontSize: 12,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  collapsedLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.card,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginBottom: 4,
  },
  userRole: {
    color: C.mute,
    fontSize: 13,
    fontFamily: FONTS.body,
  },
  navSection: {
    paddingVertical: 16,
    flex: 1,
  },
  navSectionTitle: {
    color: C.subtle,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: `${C.primary}08`,
  },
  navIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navLabel: {
    flex: 1,
    color: C.sidebarText,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
  },
  navLabelActive: {
    color: C.primary,
    fontWeight: '600',
  },
  bottomSection: {
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.surface,
    justifyContent: 'center',
  },
  logoutText: {
    color: C.inkLight,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
  },

  // Main Content Styles - Matching Base
  mainContent: {
    flex: 1,
    backgroundColor: C.bg,
    position: 'relative', // For modal positioning
  },
  topNav: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  topNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
  },
  userGreeting: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginTop: 4,
  },
  navbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  uploadButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },

  // Hero Section - Matching Base
  heroSection: {
    marginBottom: 24,
    width: '100%',
  },
  heroGradient: {
    borderRadius: 20,
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: C.card,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONTS.heading,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },

  // Metrics Section - Only 3 stats now
  metricsSection: {
    marginBottom: 32,
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 5,
  },
  sectionTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONTS.heading,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
  },
  statsContainer: {
    width: '100%',
    marginBottom: -10,
  },
  statItem: {
    height: 120, // Compact height
    flexShrink: 1,
    minWidth: 0,
  },
  metricCardTouchable: {
    flex: 1,
    height: '100%',
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    height: '100%',
    minWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONTS.heading,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricLabel: {
    color: C.mute,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Search and Filter Section - UPDATED: Filters on right side
  searchSection: {
    marginBottom: 24,
    width: '100%',
  },
  searchContainer: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  searchInputContainer: {
    flex: 1,
    minWidth: 200,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.ink,
    fontFamily: FONTS.body,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filterGroupHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.ink,
    fontFamily: FONTS.subheading,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsCount: {
    marginTop: 8,
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },

  // Empty State
  emptyState: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyText: {
    fontSize: 18,
    color: C.ink,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadEmptyButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  uploadEmptyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Research List
  researchList: {
    gap: 12,
    width: '100%',
  },
  researchCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  researchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  researchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  researchTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONTS.subheading,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  finalBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },
  finalBadgeText: {
    color: '#065F46',
  },
  draftBadgeText: {
    color: '#92400E',
  },
  researchAbstract: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    lineHeight: 20,
    marginBottom: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  keywordTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  keywordText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
  },
  researchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    flexWrap: 'wrap',
  },
  researchDate: {
    fontSize: 12,
    color: C.subtle,
    fontFamily: FONTS.body,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.primary,
  },
  viewButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfeff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
    fontFamily: FONTS.subheading,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    fontFamily: FONTS.subheading,
  },

  // Modal Styles - UPDATED with compact, nice buttons
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 20,
    maxHeight: '100%',
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    fontFamily: FONTS.subheading,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  // Form row for side-by-side layout
  formRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  formColumn: {
    flex: 1,
    minWidth: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingBottom: 8,
    justifyContent: 'flex-end', // Align buttons to the right
  },
  // Compact, nice buttons (not stretched)
  modalPrimaryButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 120,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalPrimaryButtonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 14,
    fontFamily: FONTS.subheading,
  },
  modalSecondaryButton: {
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 100,
  },
  modalSecondaryButtonText: { 
    color: C.mute, 
    fontWeight: '600',
    fontSize: 14,
    fontFamily: FONTS.subheading,
  },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: C.ink, 
    marginBottom: 8, 
    marginTop: 12,
    fontFamily: FONTS.subheading,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: C.ink, 
    paddingVertical: 12,
    fontFamily: FONTS.body,
  },
});