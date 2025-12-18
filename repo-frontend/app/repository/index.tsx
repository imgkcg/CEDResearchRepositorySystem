// app/screens/StudentResearchRepository.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  Platform, Linking, StyleSheet, TextInput, RefreshControl,
  StatusBar, Dimensions, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import api from "../../lib/api";
import { getToken, removeToken } from "../../lib/auth";
import Markdown from "react-native-markdown-display";

/** 🎨 UPDATED: Match Student Dashboard Theme - Green & Modern */
const C = {
  // Primary Colors - Student Green
  primary: "#10b981",
  primaryDark: "#059669",
  primaryLight: "#34d399",
  primaryGradient: ["#10b981", "#059669"],
  
  // Secondary Colors
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  
  // Neutral Colors (same as student dashboard)
  bg: "#f8fafc",
  card: "#ffffff",
  surface: "#f1f5f9",
  
  // Text Colors
  ink: "#1e293b",
  inkLight: "#475569",
  mute: "#64748b",
  subtle: "#94a3b8",
  
  // Status Colors
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  draft: "#94a3b8",
  
  // UI Elements
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  
  // Sidebar
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#10b981",
  
  // Charts
  chartColors: ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#94a3b8"]
};

// Font configuration (SAME AS STUDENT DASHBOARD)
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

type RepoItem = {
  _id?: string;
  id?: string;
  title?: string;
  author?: string;
  adviser?: string;
  student?: string;
  year?: number | string;
  createdAt?: string;
  abstract?: string;
  keywords?: string[] | string;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
   coAuthors?: string[] | string;
  uploaderRole?: "student" | "staff" | "faculty" | "admin";
  categories?: string[];
  genreTags?: string[];
  visibility?: "public" | "campus" | "private" | "embargo";
  landingPageUrl?: string | null;
  status?: "pending" | "approved" | "rejected" | "reviewing";
  submissionType?: "draft" | "final";
  facultyComment?: string;
};

type FacetEntry = { name: string; count: number };
type AiMode = "tldr"  | "methods" | "citations" | "recommendations";
type CitationPayload = { apa: string; ieee: string; bibtex: string };

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

function ensureArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function toKeywordArray(k: RepoItem["keywords"]): string[] {
  if (Array.isArray(k)) return k.filter(Boolean).map(String);
  if (typeof k === "string") return k.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

function quickSummary(text?: string) {
  if (!text) return "No abstract available for this study.";
  const sentences = text.replace(/\s+/g, " ").split(/[.!?]\s/).filter(s => s.length > 40);
  const top = sentences.slice(0, 2).join(". ") + ".";
  return top.trim() || (text.slice(0, 200) + "…");
}

function toStringArray(v: string[] | string | undefined | null): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  return String(v)
    .split(/[,;]\s*/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseMethodsIntoSections(text: string): Array<{ title: string; content: string }> {
  if (!text) return [];
  
  const sections: Array<{ title: string; content: string }> = [];
  
  // Split by markdown headers (### or ##)
  const parts = text.split(/###\s+/);
  
  parts.forEach(part => {
    const trimmedPart = part.trim();
    if (trimmedPart.length === 0) return;
    
    // Split title and content
    const lines = trimmedPart.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    
    if (title && content) {
      sections.push({ title, content });
    }
  });
  
  return sections;
}

function parseRecommendationsIntoArray(text: string): string[] {
  if (!text) return [];
  
  // Split by numbered list (1. 2. 3. etc.) or bullet points (• - *)
  const recommendations = text
    .split(/\d+\.\s*|\n\s*[•\-*]\s*/)
    .map(rec => rec.trim())
    .filter(rec => rec.length > 20); // Filter out very short fragments
  
  return recommendations;
}

function formatRecommendations(text: string): string {
  if (!text) return "No recommendations available.";
  
  const recommendations = text
    .split(/\d+\.\s*|\n\s*[-•*]\s*/)
    .map(rec => rec.trim())
    .filter(rec => rec.length > 0);
  
  const formatted = recommendations.map(rec => {
    let formattedRec = rec.trim();
    if (formattedRec.length > 0) {
      formattedRec = formattedRec.charAt(0).toUpperCase() + formattedRec.slice(1);
    }
    if (!/[.!?]$/.test(formattedRec)) {
      formattedRec += '.';
    }
    formattedRec = formattedRec
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .trim();
    return formattedRec;
  });
  
  return formatted.map(rec => `• ${rec}`).join('\n\n');
}

export default function StudentResearchRepository() {
  const [loading, setLoading] = useState(true);
  const [repository, setRepository] = useState<RepoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "year">("latest");
  const [facetCategories, setFacetCategories] = useState<FacetEntry[]>([]);
  const [facetGenres, setFacetGenres] = useState<FacetEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedVisibility, setSelectedVisibility] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RepoItem | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCache, setAiCache] = useState<Record<string, Partial<Record<AiMode, string>>>>({});
  const [aiCiteCache, setAiCiteCache] = useState<Record<string, CitationPayload | undefined>>({});
      const [user, setUser] = useState<any>(null);
  
  // New state for filter dropdown
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  const navItems = [
    {
      id: 'dashboard',
        icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      onPress: () => router.push("/(tabs)"),
      active: false
    },
    {
      id: 'submissions',
      icon: 'document-text-outline',
      activeIcon: 'document-text',
      label: 'My Research',
      onPress: () => router.push("/student"),
      active: false
    },
    {
      id: 'add',
      icon: 'add-circle-outline',
      activeIcon: 'add-circle',
      label: 'Add Research',
      onPress: () => router.push("/add-research"),
      active: false
    },
    {
      id: 'repository',
      icon: 'library-outline',
      activeIcon: 'library',
      label: 'Repository',
      onPress: () => {},
      active: true
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      onPress: () => router.push("/profile"),
      active: false
    },
  ];

  const fetchFacets = useCallback(async () => {
    try {
      const token = (await getToken())?.token;
      const res = await api.get("/repository/facets", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setFacetCategories(res?.data?.categories || []);
      setFacetGenres(res?.data?.genreTags || []);
    } catch (err) {
      console.warn("Facet load error:", (err as any)?.response?.data || err);
    }
  }, []);

  const fetchUserProfile = async () => {
        const tokenObj = await getToken();
        const bearer = tokenObj?.token; 
        
        if (bearer) {
            try {
                const res = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${bearer}` }
                });
                setUser(res.data);
            } catch (err) {
                console.error("Sidebar Profile fetch failed", err);
            }
        }
    };

  const fetchRepository = useCallback(async () => {
    try {
      setLoading(true);
      const token = (await getToken())?.token;
      const params: any = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      params.sort = sortBy === "year" ? "year" : "latest";
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedGenres.length) params.genre = selectedGenres.join(",");

      const res = await api.get("/repository", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params,
      });
      const raw = res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
      const repositoryData = ensureArray<RepoItem>(raw);
      
      // Filter by visibility if selected (exclude "private")
      let filteredData = repositoryData;
      if (selectedVisibility !== "all") {
        filteredData = repositoryData.filter((r) => {
          const vis = r.visibility || "campus";
          return vis === selectedVisibility;
        });
      }
      
      setRepository(filteredData);
    } catch (err: any) {
      console.error("Repository fetch error:", err.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to load research repository.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, sortBy, selectedCategory, selectedGenres, selectedVisibility]);

  useEffect(() => { fetchFacets(); }, [fetchFacets]);
  useEffect(() => {
      fetchUserProfile();
    }, []);
  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchRepository();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, selectedCategory, selectedGenres]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRepository();
    fetchFacets();
  }, [fetchRepository, fetchFacets]);

const handleSelect = async (r: RepoItem) => {

  // ✅ FIX: normalize coAuthors HERE
  setSelected({
    ...r,
    coAuthors: toStringArray(r.coAuthors), // 👈 THIS IS THE KEY FIX
  });

  const rid = r._id || r.id || r.title || "x";

  setAiCiteCache(prev => ({ ...prev, [rid]: undefined }));
  setAiCache(prev => ({ ...prev, [rid]: {} }));

  setSummary("");
  setSummarizing(true);
  setAiMode(null);
  setAiError(null);

  try {
    const token = (await getToken())?.token;
    const res = await api.post(
      "/ai/summary",
      { text: r.abstract, filePath: r.filePath ?? null },
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    );
    setSummary(res?.data?.summary || quickSummary(r.abstract));
  } catch (err) {
    setSummary(quickSummary(r.abstract));
  } finally {
    setSummarizing(false);
  }
};


  const handleOpenPDF = async (item: RepoItem) => {
    try {
      if (!item?._id) return Alert.alert("Error", "Invalid file");
      const token = (await getToken())?.token;
      if (!token) return Alert.alert("Session expired", "Please sign in again.");
      const apiBase = (api.defaults.baseURL || "").replace(/\/+$/, "");
      const url = `${apiBase}/research/file/${item._id}`;

      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Open failed (${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }
      Linking.openURL(url);
    } catch (e: any) {
      console.error("Open PDF error:", e);
      Alert.alert("Error", e?.message || "Failed to open PDF.");
    }
  };

  const runAiTool = useCallback(async (mode: AiMode) => {
    if (!selected) return;
    setAiMode(mode);
    setAiError(null);

    const id = selected._id || selected.id || selected.title || "x";
    if (mode === "citations") {
      if (aiCiteCache[id]) return;
    } else {
      if (aiCache[id]?.[mode]) return;
    }

    try {
      setAiBusy(true);
      const token = (await getToken())?.token;

      if (mode === "tldr") {
        const res = await api.post(
          "/ai/tldr",
          { abstract: (selected.abstract || "").trim(), filePath: selected.filePath ?? null },
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );
        const text = res?.data?.text || "No takeaway.";
        setAiCache(prev => ({ ...prev, [id]: { ...(prev[id] || {}), tldr: text } }));
        return;
      }
const payload = {
  mode,
  abstract: (selected.abstract || "").trim(),
  meta: {
    title: (selected.title || "").trim(),
    author: (selected.author || "").trim(),
    coAuthors: toStringArray(selected.coAuthors), // ✅ THIS IS WHAT WE NEED
    year: selected.year,
    categories: selected.categories || [],
    genreTags: selected.genreTags || [],
  },
  filePath: selected.filePath ?? null,
  researchId: selected._id || selected.id || null,
};

console.log("[AI payload]", payload);

// ✅ 👉 THIS IS THE MISSING PART
const res = await api.post(
  "/ai/abstract-tools",
  payload,
  { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
);

// ✅ Handle response
if (mode === "citations" && res?.data?.citations) {
  setAiCiteCache(prev => ({
    ...prev,
    [id]: res.data.citations as CitationPayload,
  }));
} else {
  const text = res?.data?.text || "No output.";
  setAiCache(prev => ({
    ...prev,
    [id]: { ...(prev[id] || {}), [mode]: text },
  }));
}



console.log("[AI payload]", payload);

     

      if (mode === "citations" && res?.data?.citations) {
        setAiCiteCache(prev => ({ ...prev, [id]: res.data.citations as CitationPayload }));
      } else {
        const text = res?.data?.text || "No output.";
        setAiCache(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [mode]: text } }));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to run AI tool.";
      setAiError(msg);
    } finally {
      setAiBusy(false);
    }
  }, [selected, aiCache, aiCiteCache]);

  const applyFilters = () => {
    fetchRepository();
    setShowFilterDropdown(false);
  };

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedGenres([]);
    setSelectedVisibility("all");
    setSortBy("latest");
  };

  const hasActiveFilters = selectedCategory !== "all" || selectedGenres.length > 0 || selectedVisibility !== "all";

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading research repository...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar Navigation - Matching Student Dashboard */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Logo and Toggle */}
        <View style={styles.sidebarHeader}>
          {!sidebarCollapsed ? (
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="school" size={28} color={C.primary} />
              </View>
              <View>
                <Text style={styles.logoText}>Submission Hub</Text>
                <Text style={styles.logoSubtext}>Research Repository</Text>
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

        {/* User Profile - Student Version */}
        {!sidebarCollapsed && (
          <TouchableOpacity 
            style={styles.userSection}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person-circle" size={44} color={C.primary} />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
 <View style={styles.userInfo}>
                         {/* 🔥 MODIFIED LINE for dynamic name */}
                         <Text style={styles.userName}>{user?.fullName || "Student"}</Text> 
                         
                         {/* 🔥 MODIFIED LINE for dynamic role */}
                         <Text style={styles.userRole}>
                           {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) + "" : ""}
                         </Text>
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
            onPress={async () => {
              await removeToken();
              router.replace("/login");
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={C.mute} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area - UPDATED: Fixed content width */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Research Detail Modal */}
        {selected && (
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
                <Text style={styles.modalTitle}>Research Details</Text>
                <TouchableOpacity 
                  onPress={() => setSelected(null)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <ResearchDetailContent
                  selected={selected}
                  summary={summary}
                  summarizing={summarizing}
                  aiMode={aiMode}
                  aiBusy={aiBusy}
                  aiError={aiError}
                  aiCache={aiCache}
                  aiCiteCache={aiCiteCache}
                  onRunAiTool={runAiTool}
                  onOpenPDF={() => handleOpenPDF(selected)}
                />
              </ScrollView>
            </View>
          </View>
        )}

        {/* Filter Dropdown Modal */}
        <Modal
          visible={showFilterDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownContent}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Filter Publications</Text>
                  <TouchableOpacity onPress={() => setShowFilterDropdown(false)}>
                    <Ionicons name="close" size={24} color={C.mute} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.dropdownBody} showsVerticalScrollIndicator={false}>
                  {/* Sort By */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Sort By</Text>
                    <View style={styles.filterOptions}>
                      {(["latest", "year"] as const).map((sort) => (
                        <TouchableOpacity
                          key={sort}
                          onPress={() => setSortBy(sort)}
                          style={[
                            styles.filterOption,
                            sortBy === sort && styles.filterOptionActive
                          ]}
                        >
                          <Ionicons 
                            name={sort === "latest" ? "time" : "calendar"} 
                            size={16} 
                            color={sortBy === sort ? "#fff" : C.inkLight} 
                          />
                          <Text style={[
                            styles.filterOptionText,
                            sortBy === sort && styles.filterOptionTextActive
                          ]}>
                            {sort.charAt(0).toUpperCase() + sort.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Categories */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Categories</Text>
                    <View style={styles.filterChips}>
                      <TouchableOpacity 
                        onPress={() => setSelectedCategory("all")} 
                        style={[
                          styles.filterChip,
                          selectedCategory === "all" && styles.filterChipActive
                        ]}
                      >
                        <Text style={[
                          styles.filterChipText,
                          selectedCategory === "all" && styles.filterChipTextActive
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {facetCategories.map((c) => (
                        <TouchableOpacity
                          key={`cat-${c.name}`}
                          onPress={() => setSelectedCategory(c.name === selectedCategory ? "all" : c.name)}
                          style={[
                            styles.filterChip,
                            selectedCategory === c.name && styles.filterChipActive
                          ]}
                        >
                          <Text style={[
                            styles.filterChipText,
                            selectedCategory === c.name && styles.filterChipTextActive
                          ]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Genres */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Genres</Text>
                    <View style={styles.filterChips}>
                      {facetGenres.map((g) => {
                        const isSelected = selectedGenres.includes(g.name);
                        return (
                          <TouchableOpacity
                            key={`gen-${g.name}`}
                            onPress={() => {
                              setSelectedGenres(prev => 
                                prev.includes(g.name) 
                                  ? prev.filter(x => x !== g.name)
                                  : [...prev, g.name]
                              );
                            }}
                            style={[
                              styles.filterChip,
                              isSelected && styles.filterChipActive
                            ]}
                          >
                            <Text style={[
                              styles.filterChipText,
                              isSelected && styles.filterChipTextActive
                            ]}>
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Visibility */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Visibility</Text>
                    <View style={styles.filterChips}>
                      <TouchableOpacity 
                        onPress={() => setSelectedVisibility("all")} 
                        style={[
                          styles.filterChip,
                          selectedVisibility === "all" && styles.filterChipActive
                        ]}
                      >
                        <Text style={[
                          styles.filterChipText,
                          selectedVisibility === "all" && styles.filterChipTextActive
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {(["public", "campus"] as const).map((vis) => (
                        <TouchableOpacity
                          key={`vis-${vis}`}
                          onPress={() => setSelectedVisibility(vis === selectedVisibility ? "all" : vis)}
                          style={[
                            styles.filterChip,
                            selectedVisibility === vis && styles.filterChipActive
                          ]}
                        >
                          <Ionicons 
                            name={vis === "public" ? "" : ""} 
                            size={14} 
                            color={selectedVisibility === vis ? "#fff" : C.inkLight} 
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[
                            styles.filterChipText,
                            selectedVisibility === vis && styles.filterChipTextActive
                          ]}>
                            {vis.charAt(0).toUpperCase() + vis.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.dropdownFooter}>
                  <TouchableOpacity 
                    onPress={clearAllFilters} 
                    style={styles.clearAllButton}
                  >
                    <Ionicons name="close-circle" size={18} color={C.mute} />
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={applyFilters} 
                    style={styles.applyFiltersButton}
                  >
                    <Ionicons name="filter" size={18} color="#fff" />
                    <Text style={styles.applyFiltersText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Research Repository</Text>
              <Text style={styles.userGreeting}>Browse Academic Publications</Text>
            </View>
            
            <View style={styles.navbarActions}>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push("/profile")}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Hero Section - Matching Student Dashboard */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={C.primaryGradient}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.heroContent}>
                <View>
                  <Text style={styles.heroTitle}>Research Repository</Text>
                  <Text style={styles.heroSubtitle}>
                    Browse, search, and analyze academic publications with AI-powered tools
                  </Text>
                </View>
                <Ionicons name="library" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Search and Filter Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
                {/* Search input */}
                <View style={styles.searchInputContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={C.mute} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search publications..."
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={C.subtle}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color={C.subtle} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Filter Button */}
                <TouchableOpacity 
                  style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                  onPress={() => setShowFilterDropdown(true)}
                >
                  <Ionicons 
                    name={hasActiveFilters ? "filter" : "filter-outline"} 
                    size={20} 
                    color={hasActiveFilters ? "#fff" : C.primary} 
                  />
                  <Text style={[
                    styles.filterButtonText,
                    hasActiveFilters && styles.filterButtonTextActive
                  ]}>
                    Filters
                    {hasActiveFilters && ` (${selectedGenres.length + (selectedCategory !== "all" ? 1 : 0) + (selectedVisibility !== "all" ? 1 : 0)})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <View style={styles.activeFiltersContainer}>
                <Text style={styles.activeFiltersLabel}>Active filters:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
                  {selectedCategory !== "all" && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Category: {selectedCategory}</Text>
                      <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                        <Ionicons name="close-circle" size={14} color={C.mute} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedGenres.map(genre => (
                    <View key={genre} style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Genre: {genre}</Text>
                      <TouchableOpacity onPress={() => setSelectedGenres(prev => prev.filter(g => g !== genre))}>
                        <Ionicons name="close-circle" size={14} color={C.mute} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedVisibility !== "all" && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Visibility: {selectedVisibility.charAt(0).toUpperCase() + selectedVisibility.slice(1)}</Text>
                      <TouchableOpacity onPress={() => setSelectedVisibility("all")}>
                        <Ionicons name="close-circle" size={14} color={C.mute} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Results Count */}
          <Text style={styles.resultsCount}>
            {repository.length} publication{repository.length !== 1 ? 's' : ''} found
          </Text>

           {/* Research Cards - 2x2 GRID */}
                 {repository.length === 0 ? (
                   <View style={styles.emptyState}>
                     <Ionicons name="documents-outline" size={64} color="#cbd5e1" />
                     <Text style={styles.emptyText}>
                       {searchQuery ? "No matching publications found" : "No research publications yet"}
                     </Text>
                     <Text style={styles.emptySub}>
                       {searchQuery ? "Try different search terms or filters" : "Publications will appear here"}
                     </Text>
                     {searchQuery && (
                       <TouchableOpacity 
                         onPress={() => { setSearchQuery(""); clearAllFilters(); }} 
                         style={styles.clearSearchButton}
                       >
                         <Ionicons name="close-circle" size={18} color="#fff" />
                         <Text style={styles.clearSearchButtonText}>Clear Search & Filters</Text>
                       </TouchableOpacity>
                     )}
                   </View>
                 ) : (
                   <View style={styles.researchGrid}>
                     {repository.map((r) => {
                       const kws = toKeywordArray(r.keywords);
                       const abstract = r.abstract || "";
                       
                       return (
                         <View key={r._id || r.id} style={styles.researchCard}>
                           <View style={styles.researchHeader}>
                             <View style={styles.researchIcon}>
                               <Ionicons name="document-text" size={20} color="#2563eb" />
                             </View>
                             <View style={styles.researchTitleContainer}>
                               <Text style={styles.researchTitle} numberOfLines={2}>{r.title || "Untitled"}</Text>
                               <View style={styles.yearVisibilityRow}>
                                 <View style={styles.yearBadge}>
                                   <Ionicons name="calendar-outline" size={12} color="#475569" />
                                   <Text style={styles.yearText}>{r.year || "N/A"}</Text>
                                 </View>
                                 {/* Visibility badge */}
                                 {(r.visibility === "public" || r.visibility === "campus") && (
                                   <View style={[
                                     styles.visibilityBadge,
                                     r.visibility === "public" ? styles.visibilityBadgePublic : styles.visibilityBadgeCampus
                                   ]}>
                                     <Ionicons 
                                       name={r.visibility === "public" ? 'earth-outline' : 'people-outline'}
                                       size={12} 
                                       color={r.visibility === "public" ? C.success : C.primary} 
                                     />
                                     <Text style={[
                                       styles.visibilityBadgeText,
                                       r.visibility === "public" ? styles.visibilityBadgeTextPublic : styles.visibilityBadgeTextCampus
                                     ]}>
                                       {(r.visibility || "campus").toUpperCase()}
                                     </Text>
                                   </View>
                                 )}
                               </View>
                             </View>
                           </View>
       
                           <View style={styles.authorSection}>
                             <Ionicons name="person-outline" size={14} color={C.mute} />
                             <Text style={styles.authorText}>{r.author || "Anonymous"}</Text>
                           </View>
       
                           <Text style={styles.researchAbstract} numberOfLines={2}>
                             {abstract.length > 120 ? abstract.substring(0, 120) + "..." : abstract}
                           </Text>
       
                           {kws.length > 0 && (
                             <View style={styles.keywordsContainer}>
                               {kws.slice(0, 3).map((k, idx) => (
                                 <View key={idx} style={styles.keywordTag}>
                                   <Text style={styles.keywordText}>#{k}</Text>
                                 </View>
                               ))}
                               {kws.length > 3 && (
                                 <View style={styles.moreKeywords}>
                                   <Text style={styles.moreKeywordsText}>+{kws.length - 3}</Text>
                                 </View>
                               )}
                             </View>
                           )}

                           {/* Categories - styled like staff.tsx */}
                           {(r.categories || []).length > 0 && (
                             <View style={styles.keywordsContainer}>
                               {(r.categories || []).slice(0, 3).map((c, idx) => (
                                 <View key={idx} style={styles.categoryTag}>
                                   <Text style={styles.categoryText}>{c}</Text>
                                 </View>
                               ))}
                               {(r.categories || []).length > 3 && (
                                 <View style={styles.moreCategories}>
                                   <Text style={styles.moreCategoriesText}>+{(r.categories || []).length - 3}</Text>
                                 </View>
                               )}
                             </View>
                           )}

                           {/* Genre Tags - styled like staff.tsx */}
                           {(r.genreTags || []).length > 0 && (
                             <View style={styles.keywordsContainer}>
                               {(r.genreTags || []).slice(0, 3).map((g, idx) => (
                                 <View key={idx} style={styles.genreTag}>
                                   <Text style={styles.genreText}>{g}</Text>
                                 </View>
                               ))}
                               {(r.genreTags || []).length > 3 && (
                                 <View style={styles.moreGenres}>
                                   <Text style={styles.moreGenresText}>+{(r.genreTags || []).length - 3}</Text>
                                 </View>
                               )}
                             </View>
                           )}
       
                           <View style={styles.researchFooter}>
                             <View style={styles.actionButtons}>
                               <TouchableOpacity 
                                 onPress={() => handleOpenPDF(r)} 
                                 style={styles.viewButton}
                               >
                                 <Ionicons name="attach-outline" size={16} color="#2563EB" />
                                 <Text style={styles.viewButtonText}>View PDF</Text>
                               </TouchableOpacity>

                               {r.landingPageUrl && (
                                 <TouchableOpacity 
                                   onPress={() => Linking.openURL(r.landingPageUrl!)} 
                                   style={styles.viewLinkButton}
                                 >
                                   <Ionicons name="link-outline" size={16} color="#7c3aed" />
                                   <Text style={styles.viewLinkButtonText}>View Link</Text>
                                 </TouchableOpacity>
                               )}
       
                               <TouchableOpacity 
                                 onPress={() => handleSelect(r)} 
                                 style={styles.detailsButton}
                               >
                                 <Ionicons name="eye-outline" size={16} color="#0f766e" />
                                 <Text style={styles.detailsButtonText}>Details</Text>
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

function ResearchDetailContent({
  selected,
  summary,
  summarizing,
  aiMode,
  aiBusy,
  aiError,
  aiCache,
  aiCiteCache,
  onRunAiTool,
  onOpenPDF
}: {
  selected: RepoItem;
  summary: string;
  summarizing: boolean;
  aiMode: AiMode | null;
  aiBusy: boolean;
  aiError: string | null;
  aiCache: Record<string, Partial<Record<AiMode, string>>>;
  aiCiteCache: Record<string, CitationPayload | undefined>;
  onRunAiTool: (mode: AiMode) => void;
  onOpenPDF: () => void;
}) {
  const selectedId = selected._id || selected.id || selected.title || "x";
  const cite = aiCiteCache[selectedId];
  const kws = toKeywordArray(selected.keywords);

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).clipboard) {
      await (navigator as any).clipboard.writeText(text || "");
      Alert.alert("Copied", "Text copied to clipboard.");
    }
  };

  return (
    <>
      {/* Paper Header - Matching Student Dashboard Style */}
      <View style={styles.modalPaperHeader}>
        <View style={styles.modalHeaderTop}>
          <View style={styles.yearBadgeModal}>
            <Ionicons name="calendar-outline" size={14} color={C.primary} />
            <Text style={styles.yearTextModal}>{selected.year || "N/A"}</Text>
          </View>
        </View>
        
        <Text style={styles.modalTitle}>{selected.title || "Untitled"}</Text>
      </View>

      {/* Author Information */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Author Information</Text>
        <View style={styles.detailSectionContent}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.infoLabel}>Primary Author</Text>
              <Text style={styles.infoValue}>{selected.author || "—"}</Text>
            </View>
          </View>
          
          {selected.adviser && (
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Adviser</Text>
                <Text style={styles.infoValue}>{selected.adviser}</Text>
              </View>
            </View>
          )}
          
          {selected.coAuthors && (Array.isArray(selected.coAuthors)
            ? selected.coAuthors.length > 0
            : (selected.coAuthors || "").trim() !== "") && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Co-authors</Text>
                <Text style={styles.infoValue}>
                  {Array.isArray(selected.coAuthors)
                    ? selected.coAuthors.join(", ")
                    : selected.coAuthors}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Keywords */}
      {kws.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Keywords</Text>
          <View style={styles.keywordsModalContainer}>
            {kws.map((k, i) => (
              <View key={i} style={styles.keywordChipModal}>
                <Text style={styles.keywordTextModal}>#{k}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Categories & Genres */}
      {(selected.categories?.length || selected.genreTags?.length) && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Categories & Genres</Text>
          <View style={styles.modalTagsContainer}>
            {(selected.categories || []).map((c, i) => (
              <View key={`mc-${i}`} style={styles.modalCategoryTag}>
                <Text style={styles.modalCategoryText}>{c}</Text>
              </View>
            ))}
            {(selected.genreTags || []).map((g, i) => (
              <View key={`mg-${i}`} style={styles.modalGenreTag}>
                <Text style={styles.modalGenreText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
 {/* AI Tools - HORIZONTAL 4 CARDS */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>AI Analysis Tools</Text>
        <View style={styles.aiToolsRow}>
          {([
            ["tldr", "sparkles", "Summary"],
            ["methods", "hammer", "Methods"], // Changed from "checklist" to "hammer"
            ["citations", "book", "Citations"],
            ["recommendations", "bulb", "Recommendations"],
          ] as [AiMode, string, string][]).map(([mode, icon, label]) => {
            const active = aiMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                disabled={aiBusy}
                onPress={() => onRunAiTool(mode)}
                style={[styles.aiToolCard, active && styles.aiToolCardActive]}
              >
                <View style={[styles.aiToolIcon, active && styles.aiToolIconActive]}>
                  <Ionicons 
                    name={icon as any} 
                    size={24} 
                    color={active ? "#fff" : C.primary} 
                  />
                </View>
                <Text style={[styles.aiToolLabel, active && styles.aiToolLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Output Section */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>
          {aiMode === "tldr" ? "AI Summary" : 
           aiMode === "methods" ? "Methods Analysis" :
           aiMode === "citations" ? "Citation Formats" :
           aiMode === "recommendations" ? "Recommendations" : "Abstract Summary"}
        </Text>
        
        <View style={styles.outputContainer}>
          {aiMode === "citations" ? (
            aiBusy && !cite ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : cite ? (
              <View>
                <View style={styles.citationSection}>
                  <Text style={styles.citationLabel}>APA Format</Text>
                  <View style={styles.copyRow}>
                    <TextInput 
                      editable={false} 
                      selectTextOnFocus 
                      value={cite.apa} 
                      style={styles.citationInput} 
                      multiline 
                    />
                    <TouchableOpacity onPress={() => copyToClipboard(cite.apa)} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={16} color="#fff" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.citationSection}>
                  <Text style={styles.citationLabel}>IEEE Format</Text>
                  <View style={styles.copyRow}>
                    <TextInput 
                      editable={false} 
                      selectTextOnFocus 
                      value={cite.ieee} 
                      style={styles.citationInput} 
                      multiline 
                    />
                    <TouchableOpacity onPress={() => copyToClipboard(cite.ieee)} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={16} color="#fff" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.citationSection}>
                  <Text style={styles.citationLabel}>BibTeX Format</Text>
                  <View style={styles.copyRow}>
                    <TextInput 
                      editable={false} 
                      selectTextOnFocus 
                      value={cite.bibtex} 
                      style={[styles.citationInput, { minHeight: 120 }]} 
                      multiline 
                    />
                    <TouchableOpacity onPress={() => copyToClipboard(cite.bibtex)} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={16} color="#fff" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noOutputText}>{aiError || "No citations generated."}</Text>
            )
          ) : aiMode === "methods" ? (
            // Methods displayed as separate section cards
            aiBusy ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : aiError ? (
              <Text style={styles.noOutputText}>{aiError}</Text>
            ) : (
              <View style={styles.methodsContainer}>
                {parseMethodsIntoSections(aiCache[selectedId]?.methods || "").length > 0 ? (
                  parseMethodsIntoSections(aiCache[selectedId]?.methods || "").map((section, index) => (
                    <View key={index} style={styles.methodCard}>
                      <View style={styles.methodHeader}>
                        <View style={styles.methodIconBadge}>
                          <Ionicons 
                            name={
                              section.title.toLowerCase().includes('design') ? 'flask-outline' :
                              section.title.toLowerCase().includes('approach') ? 'compass-outline' :
                              section.title.toLowerCase().includes('setting') || section.title.toLowerCase().includes('location') ? 'location-outline' :
                              section.title.toLowerCase().includes('subject') || section.title.toLowerCase().includes('participant') ? 'people-outline' :
                              section.title.toLowerCase().includes('instrument') || section.title.toLowerCase().includes('tool') ? 'build-outline' :
                              section.title.toLowerCase().includes('data gathering') || section.title.toLowerCase().includes('procedure') ? 'clipboard-outline' :
                              section.title.toLowerCase().includes('analysis') ? 'analytics-outline' :
                              'document-text-outline'
                            } 
                            size={20} 
                            color={C.primary} 
                          />
                        </View>
                        <Text style={styles.methodTitle}>{section.title}</Text>
                      </View>
                      <Text style={styles.methodText}>{section.content}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noOutputText}>No methods found.</Text>
                )}
              </View>
            )
          ) : aiMode === "recommendations" ? (
            // Recommendations displayed as separate cards
            aiBusy ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : aiError ? (
              <Text style={styles.noOutputText}>{aiError}</Text>
            ) : (
              <View style={styles.recommendationsContainer}>
                {parseRecommendationsIntoArray(aiCache[selectedId]?.recommendations || "").length > 0 ? (
                  parseRecommendationsIntoArray(aiCache[selectedId]?.recommendations || "").map((recommendation, index) => (
                    <View key={index} style={styles.recommendationCard}>
                      <View style={styles.recommendationHeader}>
                        <View style={styles.recommendationNumberBadge}>
                          <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.recommendationTitle}>Recommendation {index + 1}</Text>
                      </View>
                      <Text style={styles.recommendationText}>{recommendation}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noOutputText}>No recommendations found.</Text>
                )}
              </View>
            )
          ) : summarizing && !aiMode ? (
            <ActivityIndicator size="large" color={C.primary} />
          ) : aiMode ? (
            aiBusy ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : aiError ? (
              <Text style={styles.noOutputText}>{aiError}</Text>
            ) : (
              <Markdown style={markdownStyles}>
                {aiCache[selectedId]?.[aiMode] || "Generating…"}
              </Markdown>
            )
          ) : (
            <Markdown style={markdownStyles}>
              {summary || quickSummary(selected?.abstract)}
            </Markdown>
          )}
        </View>
      </View>

      {/* Open PDF Button */}
      <TouchableOpacity style={styles.modalPdfButton} onPress={onOpenPDF}>
        <Ionicons name="document-text-outline" size={20} color="#fff" />
        <Text style={styles.modalPdfButtonText}>Open Full PDF</Text>
      </TouchableOpacity>
    </>
  );
}

/* ---------- Markdown Styles ---------- */
const markdownStyles = {
  body: { 
    color: C.ink, 
    fontSize: 14, 
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  strong: { 
    color: C.ink, 
    fontWeight: "700" 
  },
  paragraph: {
    marginVertical: 6,
  }
};

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: C.bg,
  },
  
  // Sidebar Styles (matching student dashboard)
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

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: C.bg,
    position: 'relative',
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

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingText: {
    color: C.mute,
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONTS.body,
  },

  // Hero Section - Matching Student Dashboard
  heroSection: {
    marginBottom: 24,
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

  // Search and Filter Section - Updated for Student
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
    gap: 16,
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

  // Filter Button - Updated for Student Theme
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
    minWidth: 100,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: C.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  // Active Filters Display
  activeFiltersContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.mute,
    marginBottom: 8,
    fontFamily: FONTS.subheading,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: C.inkLight,
    fontFamily: FONTS.body,
  },

  // Results Count
  resultsCount: {
    fontSize: 14,
    color: C.mute,
    marginBottom: 16,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },

  // Empty State - Updated for Student Theme
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
    marginBottom: 16,
  },
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  clearSearchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },


  // Research Grid - 2x2 LAYOUT
  researchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  researchCard: {
    width: '49.5%', // This creates 2x2 grid
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
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
  },
  yearVisibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  visibilityBadgeCampus: {
    backgroundColor: '#eef2ff',
    borderColor: '#dbeafe',
  },
  visibilityBadgePublic: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  visibilityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
  visibilityBadgeTextCampus: {
    color: C.primary,
  },
  visibilityBadgeTextPublic: {
    color: C.success,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorText: {
    fontSize: 14,
    color: C.inkLight,
    fontWeight: '500',
    fontFamily: FONTS.body,
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
  moreKeywords: {
    backgroundColor: C.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  moreKeywordsText: {
    fontSize: 11,
    color: C.mute,
    fontFamily: FONTS.body,
  },
  researchFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    flexWrap: 'wrap',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  // Category Tags - Blue/Primary color (matching staff.tsx)
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: C.primary,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  moreCategories: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.primary,
  },
  moreCategoriesText: {
    fontSize: 11,
    color: C.primary,
    fontFamily: FONTS.body,
  },
  // Genre Tags - Purple/Secondary color (matching staff.tsx)
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: C.secondary,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
    fontFamily: FONTS.subheading,
  },
  moreGenres: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.secondary,
  },
  moreGenresText: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: FONTS.body,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.primary,
    minWidth: 100,
    flex: 1,
    flexBasis: 'auto',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  viewLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
    minWidth: 100,
    flex: 1,
    flexBasis: 'auto',
  },
  viewLinkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
    fontFamily: FONTS.subheading,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfeff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    minWidth: 100,
    flex: 1,
    flexBasis: 'auto',
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
    fontFamily: FONTS.subheading,
  },

  // Modal Styles
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

  // Filter Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    fontFamily: FONTS.subheading,
  },
  dropdownBody: {
    maxHeight: 400,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
    fontFamily: FONTS.subheading,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    flex: 1,
    justifyContent: 'center',
  },
  filterOptionActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  dropdownFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.mute,
    fontFamily: FONTS.subheading,
  },
  applyFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: FONTS.subheading,
  },

  // Detail Modal Content Styles - Updated for Student Theme
  modalPaperHeader: {
    marginBottom: 24,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearBadgeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${C.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  yearTextModal: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
    fontFamily: FONTS.subheading,
  },
  detailSectionContent: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.mute,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  keywordsModalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChipModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
  },
  keywordTextModal: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  modalTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalCategoryTag: {
    backgroundColor: `${C.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  modalGenreTag: {
    backgroundColor: `${C.accent}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalGenreText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
    fontFamily: FONTS.subheading,
  },
 
  // AI Tools Row - HORIZONTAL 4 CARDS
  aiToolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  aiToolCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    minHeight: 100,
    justifyContent: 'center',
  },
  aiToolCardActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  aiToolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aiToolIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  aiToolLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONTS.subheading,
    textAlign: 'center',
  },
  aiToolLabelActive: {
    color: '#ffffff',
  },
  outputContainer: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  noOutputText: {
    fontSize: 15,
    color: C.inkLight,
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: FONTS.body,
  },
  citationSection: {
    marginBottom: 20,
  },
  citationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 8,
    fontFamily: FONTS.subheading,
  },
  citationInput: {
    flex: 1,
    backgroundColor: C.bg,
    color: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.mono,
  },
  copyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
  // Methods Container and Cards
  methodsContainer: {
    gap: 16,
  },
  methodCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.borderLight,
  },
  methodIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    fontFamily: FONTS.subheading,
  },
  methodText: {
    fontSize: 14,
    color: C.inkLight,
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  // Recommendations Container and Cards
  recommendationsContainer: {
    gap: 16,
  },
  recommendationCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.accent, // Orange accent border on left
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.borderLight,
  },
  recommendationNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20, // Fully circular
    backgroundColor: C.accent, // Orange background
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  recommendationNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    fontFamily: FONTS.subheading,
  },
  recommendationText: {
    fontSize: 14,
    color: C.inkLight,
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  modalPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalPdfButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },
});