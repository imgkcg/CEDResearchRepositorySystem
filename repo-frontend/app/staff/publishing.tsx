  // app/staff/publishing.tsx - UPDATED TO MATCH STAFF DASHBOARD DESIGN
  import React, { useCallback, useEffect, useMemo, useState } from "react";
  import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Linking,
    RefreshControl,
    Dimensions,
    StatusBar,
  } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import { LinearGradient } from "expo-linear-gradient";
  import api from "../../lib/api";
  import { getToken, removeToken } from "../../lib/auth";
  import AsyncStorage from "@react-native-async-storage/async-storage";


  
  /** 🎨 Professional Academic Theme - Matching Staff Dashboard */
  const C = {
    // Primary Colors - Academic Blue
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    primaryLight: "#3b82f6",
    primaryGradient: ["#2563eb", "#1d4ed8"] as const,
    
    // Secondary Colors
    secondary: "#7c3aed",
    accent: "#f59e0b",
    
    // Neutral Colors
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
    info: "#3b82f6",
    
    // UI Elements
    border: "#e2e8f0",
    borderLight: "#f1f5f9",
    
    // Sidebar
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

  type Visibility = "public" | "campus" | "private";

  type ResearchItem = {
    _id: string;
    title?: string;
    author?: string;
    coAuthors?: string[] | string;
    year?: string | number;
    keywords?: string[] | string;
    createdAt?: string;
    updatedAt?: string;

    // publishing/taxonomy
    visibility?: Visibility;
    landingPageUrl?: string | null;
    categories?: string[];
    genreTags?: string[];

    // pipeline
    source?: string;
    submissionType?: "draft" | "final";

    // optional display
    fileName?: string;
    uploaderRole?: "student" | "faculty" | "staff" | "admin";
  };

  type FacetEntry = { name: string; count: number };

  // STATS TYPE
  type PublishingStats = {
    total: number;
    public: number;
    campus: number;
    private: number;
    incompleteMetadata: number;
    noCategories: number;
    noKeywords: number;
    recentUploads: ResearchItem[];
  };

  const toCsv = (v?: string[] | string | null) => {
    if (!v) return "";
    if (Array.isArray(v)) return v.join(", ");
    return v;
  };
  const toArray = (csv: string) =>
    (csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // Navigation Item Component
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

  // Stats Card Component - STAFF DASHBOARD STYLE
  const StatsCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    onPress?: () => void;
  }> = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity
      style={styles.statsCard}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.statsIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  // Donut Chart Component - STAFF STYLE
  function MiniDonut({
    approved,
    rejected,
    pending,
    pctApproved,
    pctRejected,
    pctPending,
  }: {
    approved: number;
    rejected: number;
    pending: number;
    pctApproved: number;
    pctRejected: number;
    pctPending: number;
  }) {
    return (
      <View style={styles.donutWrap}>
        <View style={styles.donutOuter}>
          <View style={styles.donutInner} />
        </View>
        <View style={styles.donutLegend}>
          <Legend color="#22c55e" label={`Public (${approved}, ${pctApproved}%)`} />
          <Legend color="#ef4444" label={`Campus (${rejected}, ${pctRejected}%)`} />
          <Legend color="#f59e0b" label={`Private (${pending}, ${pctPending}%)`} />
        </View>
      </View>
    );
  }

  function Legend({ color, label }: { color: string; label: string }) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 5 }}>
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
        <Text style={{ color: C.mute, fontWeight: "600", fontSize: 16 }}>{label}</Text>
      </View>
    );
  }

  export default function PublishingScreen() {
    // Avoid type/version mismatch across expo-router versions while still supporting deep-link params.
    const ExpoRouter = require("expo-router") as any;
    const router = ExpoRouter?.router || ExpoRouter?.useRouter?.();
    const params = ExpoRouter?.useLocalSearchParams?.() || {};
    const id = (params?.id as string | undefined) || undefined;
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [coAuthors, setCoAuthors] = useState("");
      const [user, setUser] = useState<any>(null);
    // list mode (when no id param)
    const [list, setList] = useState<ResearchItem[]>([]);
    const [search, setSearch] = useState("");

    // edit mode
    const [doc, setDoc] = useState<ResearchItem | null>(null);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [year, setYear] = useState("");
    const [keywords, setKeywords] = useState("");
const [bearerToken, setBearerToken] = useState<string>("");
    const [pubType, setPubType] = useState<Visibility>("campus");
    const [landingPageUrl, setLandingPageUrl] = useState("");
    const [categoriesCsv, setCategoriesCsv] = useState("");
    const [genreTagsCsv, setGenreTagsCsv] = useState("");

    // facets for quick-pick
    const [facetCats, setFacetCats] = useState<FacetEntry[]>([]);
    const [facetTags, setFacetTags] = useState<FacetEntry[]>([]);
    const [facetsLoading, setFacetsLoading] = useState(false);

    // STATS STATE
    const [stats, setStats] = useState<PublishingStats>({
      total: 0,
      public: 0,
      campus: 0,
      private: 0,
      incompleteMetadata: 0,
      noCategories: 0,
      noKeywords: 0,
      recentUploads: [],
    });

    const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
    
    // Navigation items - STAFF VERSION
    const navItems = [
      {
        id: 'dashboard',
        icon: 'grid-outline',
        activeIcon: 'grid',
        label: 'Dashboard',
        onPress: () => router.push("/staff"),
        active: false
      },
      {
        id: 'upload',
        icon: 'cloud-upload-outline',
        activeIcon: 'cloud-upload',
        label: 'Upload PDFs',
        onPress: () => router.push("/staff/upload"),
        active: false
      },
      {
        id: 'publishing',
        icon: 'pricetags-outline',
        activeIcon: 'pricetags',
        label: 'Publishing',
        onPress: () => {},
        active: true
      },
      {
        id: 'repository',
        icon: 'library-outline',
        activeIcon: 'library',
        label: 'Repository',
        onPress: () => router.push("/repository/staff"),
        active: false
      },
      {
        id: 'profile',
        icon: 'person-outline',
        activeIcon: 'person',
        label: 'Profile',
        onPress: () => router.push("/staff/profile"),
        active: false
      },
    ];

    const calculateStats = useCallback((items: ResearchItem[]): PublishingStats => {
      const stats: PublishingStats = {
        total: items.length,
        public: 0,
        campus: 0,
        private: 0,
        incompleteMetadata: 0,
        noCategories: 0,
        noKeywords: 0,
        recentUploads: items
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 5),
      };

      items.forEach((item) => {
        // Count by visibility
        switch (item.visibility) {
          case "public":
            stats.public++;
            break;
          case "campus":
            stats.campus++;
            break;
          case "private":
            stats.private++;
            break;
          default:
            stats.campus++; // Default to campus
        }

        // Check for incomplete metadata
        if (!item.title || !item.author || !item.year) {
          stats.incompleteMetadata++;
        }

        // Check for missing categories
        if (!item.categories || item.categories.length === 0) {
          stats.noCategories++;
        }

        // Check for missing keywords
        const kwArray = Array.isArray(item.keywords) 
          ? item.keywords 
          : (item.keywords || "").split(",").filter(k => k.trim());
        if (kwArray.length === 0) {
          stats.noKeywords++;
        }
      });

      return stats;
    }, []);

    const hydrateForm = useCallback((r: ResearchItem) => {
      setDoc(r);
      setTitle(r.title || "");
      setAuthor(r.author || "");
      setCoAuthors(
        Array.isArray(r.coAuthors)
          ? r.coAuthors.join(", ")
          : (r.coAuthors as string) || ""
      );
      setYear(r.year ? String(r.year) : "");
      setKeywords(toCsv(r.keywords));
      setPubType(r.visibility || "campus");
      setLandingPageUrl(r.landingPageUrl || "");
      setCategoriesCsv(toCsv(r.categories));
      setGenreTagsCsv(toCsv(r.genreTags));
    }, []);

    const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const token = await getToken();
    
    if (!token?.token) {
      console.log("No token found, but staying on page");
      // Don't redirect, just show empty state
      setList([]);
      setStats(calculateStats([]));
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    // Store token for later use
    setBearerToken(token.token);

    // Fetch staff profile
    try {
      const profileResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      setStaff(profileResponse.data.user);
    } catch (profileErr: any) {
      console.log("Profile fetch failed, continuing without user data");
      // Don't redirect on 401/403, just continue
      if (profileErr?.response?.status === 401 || profileErr?.response?.status === 403) {
        console.log("Token expired or invalid, but staying on page");
      }
    }

    // Fetch research list
    try {
      const r = await api.get(`/research-admin`, {
        headers: { Authorization: `Bearer ${token.token}` },
        params: { sort: "latest", status: "approved", limit: 1000 },
      });
      const raw: ResearchItem[] = r?.data?.data ?? r?.data ?? [];
      // Defensive filter: Publishing should only show real repository items,
      // not faculty-approved queue items and not drafts.
      const publishable = raw.filter((item) => {
        const isFinal = (item.submissionType || "final") === "final";
        const isRepo =
          item.source === "staff-upload" ||
          item.uploaderRole === "staff" ||
          item.uploaderRole === "admin";
        return isFinal && isRepo;
      });
      setList(publishable);
      
      // Calculate stats
      setStats(calculateStats(publishable));
    } catch (listErr: any) {
      console.error("Research list fetch failed:", listErr);
      // Don't redirect on 401/403, just show empty state
      if (listErr?.response?.status === 401 || listErr?.response?.status === 403) {
        console.log("Token expired or invalid, showing empty state");
        setList([]);
        setStats(calculateStats([]));
      } else {
        Alert.alert("Error", "Failed to load research list. Please try refreshing.");
      }
    }
  } catch (err: any) {
    console.error("❌ Load failed:", err);
    // Don't show alert or redirect for token errors
    if (err?.response?.status !== 401 && err?.response?.status !== 403) {
      Alert.alert("Error", "Failed to load data.");
    } else {
      // Token expired/invalid, just show empty state
      setList([]);
      setStats(calculateStats([]));
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [calculateStats]);

    const fetchFacets = useCallback(async () => {
      try {
        setFacetsLoading(true);
        const token = await getToken();
        const r = await api.get(`/repository/facets`, {
          headers: { Authorization: `Bearer ${token?.token}` },
        });
        setFacetCats(r?.data?.categories || []);
        setFacetTags(r?.data?.genreTags || []);
      } catch (err: any) {
        console.warn("Facet load failed:", err?.response?.data || err);
      } finally {
        setFacetsLoading(false);
      }
    }, []);

    const fetchOne = useCallback(async () => {
      if (!id) return;
      setLoading(true);
      try {
        const token = await getToken();
        let item: ResearchItem | null = null;
        
        try {
          const r = await api.get(`/research-admin/${id}`, {
            headers: { Authorization: `Bearer ${token?.token}` },
          });
          item = (r?.data?.data ?? r?.data) || null;
        } catch (e: any) {
          const r2 = await api.get(`/research-admin`, {
            headers: { Authorization: `Bearer ${token?.token}` },
          });
          const arr: ResearchItem[] = r2?.data?.data ?? r2?.data ?? [];
          item = arr.find((x) => String(x._id) === String(id)) || null;
        }

        if (!item) {
          Alert.alert("Not found", "Research item not found.");
          router.back();
          return;
        }
        hydrateForm(item);
        fetchFacets();
      } catch (err: any) {
        console.error("❌ Load item failed:", err?.response?.data || err);
        Alert.alert("Error", "Failed to load research item.");
        router.back();
      } finally {
        setLoading(false);
      }
    }, [hydrateForm, id, fetchFacets]);

    const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchData();
      await fetchFacets();
    }, [fetchData, fetchFacets]);

    useEffect(() => {
      if (id) {
        fetchOne();
      } else {
        fetchData();
        fetchFacets();
      }
    }, [id, fetchData, fetchFacets, fetchOne]);
  useEffect(() => {
      fetchUserProfile();
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
    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return list;

      return list.filter((r) => {
        const kws = Array.isArray(r.keywords)
          ? r.keywords
          : toCsv(r.keywords)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

        const coAuths = Array.isArray(r.coAuthors)
          ? r.coAuthors
          : (r.coAuthors || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

        return (
          (r.title || "").toLowerCase().includes(q) ||
          (r.author || "").toLowerCase().includes(q) ||
          coAuths.some((a) => a.toLowerCase().includes(q)) ||
          kws.some((k) => k.toLowerCase().includes(q)) ||
          (r.year ? String(r.year).includes(q) : false)
        );
      });
    }, [list, search]);

    const addChip = (currentCsv: string, setCsv: (v: string) => void, value: string) => {
      const arr = toArray(currentCsv);
      if (!arr.includes(value)) {
        arr.push(value);
        setCsv(arr.join(", "));
      }
    };

    const removeChip = (currentCsv: string, setCsv: (v: string) => void, value: string) => {
      const arr = toArray(currentCsv).filter((x) => x !== value);
      setCsv(arr.join(", "));
    };

    const isValidUrl = (url: string) => /^https?:\/\//i.test(url.trim());

const saveAll = async () => {
  if (!doc) return;

  if (pubType === "public") {
    const url = (landingPageUrl || "").trim();
    if (!url || !isValidUrl(url)) {
      Alert.alert("Landing page URL required", "Provide a valid http(s) URL to publish online.");
      return;
    }
  }

      const yearTrim = year.trim();
      if (yearTrim && !/^\d{4}$/.test(yearTrim)) {
        Alert.alert("Check Year", "Year should be a 4-digit value like 2025.");
        return;
      }

      try {
        setSaving(true);
        const token = await getToken();

        await api.put(
          `/research-admin/${doc._id}`,
          {
            visibility: pubType,
            allowedViewers: [],
            title: title.trim(),
            author: author.trim(),
            coAuthors: coAuthors.split(",").map((s) => s.trim()).filter(Boolean),
            year: yearTrim,
            keywords,
            landingPageUrl: pubType === "public" ? landingPageUrl.trim() : null,
            categories: toArray(categoriesCsv),
            genreTags: toArray(genreTagsCsv),
          },
          { headers: { Authorization: `Bearer ${token?.token}` } }
        );

        Alert.alert("✅ Saved", "Publishing & taxonomy updated.");
        
        // Refresh data to get updated changes
        await fetchData();
        await fetchFacets();
        
        // Navigate back to main publishing page (without id param)
        if (id) {
          router.replace("/staff/publishing");
        }
      } catch (err: any) {
        console.error("❌ Save failed:", err?.response?.data || err);
        Alert.alert("Error", err?.response?.data?.error || "Failed to save changes.");
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!doc) return;

      const confirmDelete =
        Platform.OS === "web"
          ? window.confirm(`Are you sure you want to permanently delete "${doc.title || "Untitled"}"?`)
          : true;

      if (Platform.OS !== "web") {
        Alert.alert(
          "Confirm Delete",
          `Are you sure you want to permanently delete "${doc.title || "Untitled"}"?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => await performDelete(),
            },
          ]
        );
      } else if (confirmDelete) {
        await performDelete();
      }
    };

    const performDelete = async () => {
      if (!doc) return;

      try {
        setSaving(true);
        const token = await getToken();

        await api.delete(`/research-admin/${doc._id}`, {
          headers: { Authorization: `Bearer ${token?.token}` },
        });

        if (Platform.OS === "web") {
          alert("✅ Research deleted successfully.");
        } else {
          Alert.alert("✅ Deleted", "The research has been removed from the repository.");
        }

        // Navigate back to main publishing page
        router.replace("/staff/publishing");
      } catch (err: any) {
        console.error("❌ Delete failed:", err?.response?.data || err);
        const msg = err?.response?.data?.error || "Failed to delete research.";
        if (Platform.OS === "web") alert(`❌ ${msg}`);
        else Alert.alert("Error", msg);
      } finally {
        setSaving(false);
      }
    };

    // Calculate donut chart data from stats
    const donut = useMemo(() => {
      const total = stats.total || 1;
      const approved = stats.public || 0;
      const rejected = stats.campus || 0;
      const pending = stats.private || 0;
      
      return {
        approved,
        rejected,
        pending,
        pctApproved: Math.round((approved / total) * 100),
        pctRejected: Math.round((rejected / total) * 100),
        pctPending: Math.round((pending / total) * 100),
        hasAny: total > 0,
      };
    }, [stats]);

    // Logout function
    const handleLogout = async () => {
      Alert.alert(
        "Sign out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log out", style: "destructive", onPress: performLogout },
        ],
        { cancelable: true }
      );
    };

    const performLogout = async () => {
      try {
        try {
          const token = await getToken();
          if (token?.token) {
            await api.post(
              "/auth/logout",
              {},
              { headers: { Authorization: `Bearer ${token.token}` } }
            );
          }
        } catch (err) {
          console.log("⚠️ Server logout skipped:", err);
        }
        await AsyncStorage.multiRemove(["authToken", "token", "user", "role", "refreshToken"]);
        router.replace("/login");
      } catch (error: any) {
        console.error("❌ Logout error:", error);
        Alert.alert("Error", `Failed to log out: ${error?.message || error}`);
      }
    };

    if (loading && !id) {
      return (
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.mute, marginTop: 10 }}>Loading Publishing Dashboard...</Text>
        </View>
      );
    }

    // EDIT MODE (id present) - Different Layout
    if (id) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
          
          {/* Left Sidebar Navigation */}
          <View style={[styles.sidebar, { width: sidebarWidth }]}>
            {/* Logo and Toggle */}
            <View style={styles.sidebarHeader}>
              {!sidebarCollapsed ? (
                <View style={styles.logoContainer}>
                  <View style={styles.logo}>
                    <Ionicons name="library" size={28} color={C.primary} />
                  </View>
                  <View>
                    <Text style={styles.logoText}>Staff Portal</Text>
                    <Text style={styles.logoSubtext}>Publishing</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.collapsedLogo}
                  onPress={() => setSidebarCollapsed(false)}
                >
                  <View style={styles.miniLogo}>
                    <Ionicons name="library" size={24} color={C.primary} />
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
                onPress={() => router.push("/staff/profile")}
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
          {/* Main Content Area - EDIT MODE */}
          <View style={styles.mainContent}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
              <View style={styles.topNavContent}>
                <View>
                  <Text style={styles.welcomeText}>Publishing Management</Text>
                  <Text style={styles.userGreeting}>
                    Editing: {doc?.title || "Research Document"}
                  </Text>
                </View>
                
                <View style={styles.navbarActions}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={() => router.back()}
                  >
                    <Ionicons name="arrow-back" size={18} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.profileButton}
                    onPress={() => router.push("/staff/profile")}
                  >
                    <View style={styles.smallAvatar}>
                      <Ionicons name="person" size={18} color={C.primary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Hero Section */}
              <View style={styles.heroSection}>
                <LinearGradient
                  colors={C.primaryGradient}
                  style={styles.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.heroContent}>
                    <View>
                      <Text style={styles.heroTitle}>Edit Publishing Settings</Text>
                      <Text style={styles.heroSubtitle}>
                        Configure visibility, metadata, and taxonomy for this research document
                      </Text>
                    </View>
                    <Ionicons name="pricetags" size={40} color="rgba(255,255,255,0.9)" />
                  </View>
                </LinearGradient>
              </View>

              {/* Publish Type Card */}
              <View style={styles.publishCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="eye-outline" size={24} color={C.primary} />
                  <View>
                    <Text style={styles.cardTitle}>Visibility Settings</Text>
                    <Text style={styles.cardSubtitle}>Control who can access this research</Text>
                  </View>
                </View>

                {/* HORIZONTAL VISIBILITY GRID - 3 OPTIONS */}
                <View style={styles.horizontalVisibilityGrid}>
                  {/* Public Online */}
                  <TouchableOpacity
                    onPress={() => setPubType("public")}
                    style={[
                      styles.horizontalVisibilityOption,
                      pubType === "public" && styles.horizontalVisibilityOptionActive,
                      { borderColor: pubType === "public" ? C.success : C.border }
                    ]}
                  >
                    <View style={styles.horizontalVisibilityContent}>
                      <View style={[styles.horizontalVisibilityIcon, { backgroundColor: `${C.success}15` }]}>
                        <Ionicons 
                          name="globe" 
                          size={18} 
                          color={pubType === "public" ? C.success : C.mute} 
                        />
                      </View>
                      <View style={styles.horizontalVisibilityTextGroup}>
                        <Text style={[
                          styles.horizontalVisibilityTitle,
                          pubType === "public" && { color: C.success }
                        ]}>
                          Public Online
                        </Text>
                        <Text style={styles.horizontalVisibilityDescription}>
                          Accessible to anyone on the internet
                        </Text>
                      </View>
                      {pubType === "public" && (
                        <Ionicons name="checkmark-circle" size={18} color={C.success} style={{marginLeft: 8}} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Campus Only */}
                  <TouchableOpacity
                    onPress={() => setPubType("campus")}
                    style={[
                      styles.horizontalVisibilityOption,
                      pubType === "campus" && styles.horizontalVisibilityOptionActive,
                      { borderColor: pubType === "campus" ? C.primary : C.border }
                    ]}
                  >
                    <View style={styles.horizontalVisibilityContent}>
                      <View style={[styles.horizontalVisibilityIcon, { backgroundColor: `${C.primary}15` }]}>
                        <Ionicons 
                          name="people" 
                          size={18} 
                          color={pubType === "campus" ? C.primary : C.mute} 
                        />
                      </View>
                      <View style={styles.horizontalVisibilityTextGroup}>
                        <Text style={[
                          styles.horizontalVisibilityTitle,
                          pubType === "campus" && styles.horizontalVisibilityTitleActive
                        ]}>
                          Campus Only
                        </Text>
                        <Text style={styles.horizontalVisibilityDescription}>
                          Accessible only within campus network
                        </Text>
                      </View>
                      {pubType === "campus" && (
                        <Ionicons name="checkmark-circle" size={18} color={C.primary} style={{marginLeft: 8}} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Private */}
                  <TouchableOpacity
                    onPress={() => setPubType("private")}
                    style={[
                      styles.horizontalVisibilityOption,
                      pubType === "private" && styles.horizontalVisibilityOptionActive,
                      { borderColor: pubType === "private" ? C.warning : C.border }
                    ]}
                  >
                    <View style={styles.horizontalVisibilityContent}>
                      <View style={[styles.horizontalVisibilityIcon, { backgroundColor: `${C.warning}15` }]}>
                        <Ionicons 
                          name="lock-closed" 
                          size={18} 
                          color={pubType === "private" ? C.warning : C.mute} 
                        />
                      </View>
                      <View style={styles.horizontalVisibilityTextGroup}>
                        <Text style={[
                          styles.horizontalVisibilityTitle,
                          pubType === "private" && { color: C.warning }
                        ]}>
                          Private
                        </Text>
                        <Text style={styles.horizontalVisibilityDescription}>
                          Restricted to authorized users only
                        </Text>
                      </View>
                      {pubType === "private" && (
                        <Ionicons name="checkmark-circle" size={18} color={C.warning} style={{marginLeft: 8}} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                {/* END HORIZONTAL VISIBILITY GRID */}

                {pubType === "public" && (
                  <View style={styles.landingPageSection}>
                    <Text style={styles.sectionLabel}>Landing Page URL (required for public access)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="https://example.edu/repo/handle/1234"
                      value={landingPageUrl}
                      onChangeText={setLandingPageUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!landingPageUrl && isValidUrl(landingPageUrl) && (
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => Linking.openURL(String(landingPageUrl || ""))}
                      >
                        <Ionicons name="open-outline" size={16} color={C.primary} />
                        <Text style={styles.linkButtonText}>Preview Landing Page</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

         <View style={styles.metadataCard}>
  <View style={styles.cardHeader}>
    <Ionicons name="document-text-outline" size={24} color={C.primary} />
    <View>
      <Text style={styles.cardTitle}>Document Metadata</Text>
      <Text style={styles.cardSubtitle}>Basic information about the research</Text>
    </View>
  </View>

  <View style={styles.formGrid}>
    {/* Title and Year on same row */}
    <View style={styles.titleYearRow}>
      <View style={styles.titleInputContainer}>
        <Text style={styles.inputLabel}>Title *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Research title"
        />
      </View>
      <View style={styles.yearInputContainer}>
        <Text style={styles.inputLabel}>Year *</Text>
        <TextInput
          style={styles.yearTextInput}
          value={year}
          onChangeText={setYear}
          placeholder="2024"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </View>

    {/* Author and Co-Authors on same row */}
    <View style={styles.authorRow}>
      <View style={styles.authorInputContainer}>
        <Text style={styles.inputLabel}>Primary Author *</Text>
        <TextInput
          style={styles.textInput}
          value={author}
          onChangeText={setAuthor}
          placeholder="Author name"
        />
      </View>
      <View style={styles.coAuthorsInputContainer}>
        <Text style={styles.inputLabel}>Co-Authors</Text>
        <TextInput
          style={styles.textInput}
          value={coAuthors}
          onChangeText={setCoAuthors}
          placeholder="Comma-separated list"
        />
      </View>
    </View>

    {/* Keywords full width */}
    <View style={styles.keywordsInputContainer}>
      <Text style={styles.inputLabel}>Keywords</Text>
      <TextInput
        style={styles.textInput}
        value={keywords}
        onChangeText={setKeywords}
        placeholder="Comma-separated keywords"
      />
    </View>
  </View>
</View>

              {/* Taxonomy Card */}
              <View style={styles.taxonomyCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="pricetags-outline" size={24} color={C.secondary} />
                  <View>
                    <Text style={styles.cardTitle}>Taxonomy & Categories</Text>
                    <Text style={styles.cardSubtitle}>Classify and organize the research</Text>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={[styles.formGroup, { width: '100%' }]}>
                    <Text style={styles.inputLabel}>Categories</Text>
                    <TextInput
                      style={styles.textInput}
                      value={categoriesCsv}
                      onChangeText={setCategoriesCsv}
                      placeholder="Comma-separated categories"
                    />
                  </View>

                  <View style={[styles.formGroup, { width: '100%' }]}>
                    <Text style={styles.inputLabel}>Genre Tags</Text>
                    <TextInput
                      style={styles.textInput}
                      value={genreTagsCsv}
                      onChangeText={setGenreTagsCsv}
                      placeholder="Comma-separated tags"
                    />
                  </View>
                </View>

                {/* Quick Pick Categories */}
                <View style={styles.quickPickSection}>
                  <Text style={styles.quickPickTitle}>Suggested Categories</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {facetsLoading ? (
                        <ActivityIndicator size="small" color={C.primary} />
                      ) : (
                        facetCats.slice(0, 12).map((cat) => {
                          const selected = toArray(categoriesCsv).includes(cat.name);
                          return (
                            <TouchableOpacity
                              key={`cat-${cat.name}`}
                              onPress={() =>
                                selected
                                  ? removeChip(categoriesCsv, setCategoriesCsv, cat.name)
                                  : addChip(categoriesCsv, setCategoriesCsv, cat.name)
                              }
                              style={[
                                styles.categoryChip,
                                selected && styles.categoryChipActive
                              ]}
                            >
                              <Text style={[
                                styles.categoryChipText,
                                selected && styles.categoryChipTextActive
                              ]}>
                                {cat.name} ({cat.count})
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>
                </View>

                {/* Quick Pick Tags */}
                <View style={styles.quickPickSection}>
                  <Text style={styles.quickPickTitle}>Suggested Tags</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {facetsLoading ? (
                        <ActivityIndicator size="small" color={C.secondary} />
                      ) : (
                        facetTags.slice(0, 14).map((tag) => {
                          const selected = toArray(genreTagsCsv).includes(tag.name);
                          return (
                            <TouchableOpacity
                              key={`tag-${tag.name}`}
                              onPress={() =>
                                selected
                                  ? removeChip(genreTagsCsv, setGenreTagsCsv, tag.name)
                                  : addChip(genreTagsCsv, setGenreTagsCsv, tag.name)
                              }
                              style={[
                                styles.tagChip,
                                selected && styles.tagChipActive
                              ]}
                            >
                              <Text style={[
                                styles.tagChipText,
                                selected && styles.tagChipTextActive
                              ]}>
                                {tag.name} ({tag.count})
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="close-outline" size={20} color={C.mute} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveAll}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      );
    }

    // LIST MODE (no id) - Dashboard Layout
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        
        {/* Left Sidebar Navigation */}
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          {/* Logo and Toggle */}
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed ? (
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Ionicons name="library" size={28} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.logoText}>Staff Portal</Text>
                  <Text style={styles.logoSubtext}>Publishing Management</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.collapsedLogo}
                onPress={() => setSidebarCollapsed(false)}
              >
                <View style={styles.miniLogo}>
                  <Ionicons name="library" size={24} color={C.primary} />
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
              onPress={() => router.push("/staff/profile")}
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
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={C.mute} />
              {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Navigation Bar */}
          <View style={styles.topNav}>
            <View style={styles.topNavContent}>
              <View>
                <Text style={styles.welcomeText}>Publishing Dashboard</Text>
                <Text style={styles.userGreeting}>
                  Welcome, {staff?.firstName || staff?.fullName || "Staff Member"}
                </Text>
              </View>
              
              <View style={styles.navbarActions}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={onRefresh}
                  disabled={refreshing}
                >
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color={refreshing ? C.subtle : C.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={() => router.push("/staff/profile")}
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={C.primaryGradient}
                style={styles.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.heroContent}>
                  <View>
                    <Text style={styles.heroTitle}>Publishing Management</Text>
                    <Text style={styles.heroSubtitle}>
                      Manage research visibility, metadata, and taxonomy across all documents
                    </Text>
                  </View>
                  <Ionicons name="pricetags" size={40} color="rgba(255,255,255,0.9)" />
                </View>
              </LinearGradient>
            </View>

            {/* Overview Section - STAFF DASHBOARD STYLE */}
            <View style={styles.overviewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Publishing Overview</Text>
                <Text style={styles.sectionSubtitle}>Research visibility and metadata statistics</Text>
              </View>
              
              {/* 4 Containers in one row - STAFF STYLE */}
              <View style={styles.fourContainerRow}>
                {/* Publishing Status Donut Chart Container - STAFF STYLE */}
                <View style={[styles.statItem, { flex: 1.5 }]}>
                  <View style={styles.reviewStatusContainer}>
                    <View style={styles.reviewStatusHeader}>
                      <Ionicons name="pie-chart-outline" size={20} color={C.secondary} />
                      <Text style={styles.reviewStatusTitle}>Visibility Status</Text>
                    </View>
                    
                    {donut.hasAny ? (
                      <MiniDonut
                        approved={donut.approved}
                        rejected={donut.rejected}
                        pending={donut.pending}
                        pctApproved={donut.pctApproved}
                        pctRejected={donut.pctRejected}
                        pctPending={donut.pctPending}
                      />
                    ) : (
                      <View style={styles.noDataContainerSmall}>
                        <Ionicons name="stats-chart-outline" size={32} color={C.subtle} />
                        <Text style={styles.noDataTextSmall}>No research yet</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 3 Stats Containers - STAFF STYLE */}
                {[
                  {
                    id: 'totalResearch',
                    icon: 'book',
                    value: stats.total || 0,
                    label: 'Total Research',
                    color: C.primary,
                    subtitle: 'Approved items',
                  },
                  {
                    id: 'incomplete',
                    icon: 'alert-circle',
                    value: stats.incompleteMetadata || 0,
                    label: 'Incomplete',
                    color: C.warning,
                    subtitle: 'Missing metadata',
                    onPress: () => {
                      const incomplete = list.filter(
                        (item) => !item.title || !item.author || !item.year
                      );
                      setList(incomplete);
                      setSearch("incomplete");
                    }
                  },
                  {
                    id: 'noCategories',
                    icon: 'pricetag-outline',
                    value: stats.noCategories || 0,
                    label: 'No Categories',
                    color: C.secondary,
                    subtitle: 'Untagged items',
                    onPress: () => {
                      const noCat = list.filter(
                        (item) => !item.categories || item.categories.length === 0
                      );
                      setList(noCat);
                      setSearch("no categories");
                    }
                  },
                ].map((stat, index) => (
                  <View 
                    key={stat.id}
                    style={[
                      styles.statItem,
                      { 
                        flex: 1,
                        marginLeft: index === 0 ? 12 : 0,
                      }
                    ]}
                  >
                    <StatsCard
                      title={stat.label}
                      value={stat.value}
                      subtitle={stat.subtitle}
                      icon={stat.icon}
                      color={stat.color}
                      onPress={stat.onPress}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Search and Filter Section */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                  {/* Search input */}
                  <View style={styles.searchInputContainer}>
                    <View style={styles.searchBar}>
                      <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 10 }} />
                      <TextInput
                        placeholder="Search research documents..."
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94a3b8"
                      />
                      {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                          <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Results Count */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filtered.length} of {list.length} research documents
                {search ? ` matching "${search}"` : ""}
              </Text>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => {
                  setSearch("");
                  fetchData();
                }}
                disabled={!search && filtered.length === list.length}
              >
                <Ionicons name="refresh-outline" size={16} color={C.info} />
                <Text style={styles.filterBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Research Items Grid */}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {search ? "No matching documents found" : "No research documents yet"}
                </Text>
                <Text style={styles.emptySub}>
                  {search ? "Try different search terms" : "Documents will appear here"}
                </Text>
                {search && (
                  <TouchableOpacity 
                    onPress={() => setSearch("")} 
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.researchGrid}>
                {filtered.map((r) => {
                  const vis = r.visibility || "campus";
                  return (
                    <View key={r._id} style={styles.researchCard}>
                      <View style={styles.researchHeader}>
                        <View style={styles.researchIcon}>
                          <Ionicons name="document-text" size={20} color="#2563eb" />
                        </View>
                        <View style={styles.researchTitleContainer}>
                          <Text style={styles.researchTitle} numberOfLines={2}>
                            {r.title || "(Untitled)"}
                          </Text>
                          <View style={[
                            styles.visibilityBadge,
                            vis === 'public' ? styles.visibilityBadgePublic :
                            vis === 'campus' ? styles.visibilityBadgeCampus :
                            styles.visibilityBadgePrivate
                          ]}>
                            <Ionicons 
                              name={
                                vis === 'public' ? 'globe' :
                                vis === 'campus' ? 'people' : 'lock-closed'
                              } 
                              size={12} 
                              color={
                                  vis === 'public' ? C.success :
                                  vis === 'campus' ? C.primary : C.warning
                              } 
                            />
                            <Text style={[
                              styles.visibilityBadgeText,
                              vis === 'public' ? styles.visibilityBadgePublicText :
                              vis === 'campus' ? styles.visibilityBadgeCampusText :
                              styles.visibilityBadgePrivateText
                            ]}>
                              {vis.charAt(0).toUpperCase() + vis.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>

                  <View style={styles.researchMeta}>
    {/* Primary Author */}
    <View style={styles.metaItem}>
      <Ionicons name="person-outline" size={14} color={C.mute} />
      <Text style={styles.metaText}>{r.author || "—"}</Text>
    </View>

    {/* Co-authors (only if present) */}
    {r.coAuthors && (
      <View style={styles.metaItem}>
        <Ionicons name="people-outline" size={14} color={C.mute} />
        <Text style={styles.metaText}>
          {Array.isArray(r.coAuthors)
            ? r.coAuthors.join(", ")
            : r.coAuthors}
        </Text>
      </View>
    )}

    {/* Year */}
    <View style={styles.metaItem}>
      <Ionicons name="calendar-outline" size={14} color={C.mute} />
      <Text style={styles.metaText}>{r.year || "—"}</Text>
    </View>
  </View>



                      {/* Incomplete warning */}
                      {(!r.title || !r.author || !r.year) && (
                        <View style={styles.incompleteWarning}>
                          <Ionicons name="warning-outline" size={14} color={C.warning} />
                          <Text style={styles.incompleteText}>Incomplete metadata</Text>
                        </View>
                      )}

                      {/* Categories & Tags */}
                      <View style={styles.categoriesContainer}>
                        {(r.categories || []).slice(0, 3).map((c, idx) => (
                          <View key={idx} style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{c}</Text>
                          </View>
                        ))}
                        {(r.genreTags || []).slice(0, 2).map((g, idx) => (
                          <View key={idx} style={styles.genreTag}>
                            <Text style={styles.genreTagText}>{g}</Text>
                          </View>
                        ))}
                        {(!r.categories || r.categories.length === 0) && 
                        (!r.genreTags || r.genreTags.length === 0) && (
                          <Text style={styles.noTagsText}>No categories or tags</Text>
                        )}
                      </View>

{/* Landing Page Link (if available) */}
{r.landingPageUrl && (
  <TouchableOpacity
    style={styles.linkContainer}
    onPress={() => Linking.openURL(String(r.landingPageUrl))}
    activeOpacity={0.7}
  >
    <Ionicons name="link-outline" size={14} color={C.info} />
    <Text style={styles.linkText} numberOfLines={1}>
      {r.landingPageUrl.replace(/^https?:\/\//, '').split('/')[0]}
    </Text>
  </TouchableOpacity>
)}
                      <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() =>
                          router.push({ pathname: "/staff/publishing", params: { id: String(r._id) } })
                        }
                      >
                        <Ionicons name="settings-outline" size={16} color="#fff" />
                        <Text style={styles.manageButtonText}>Manage Publishing</Text>
                      </TouchableOpacity>
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: C.bg,
    },
    
    // Sidebar Styles
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
      gap: 12,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
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

    // Hero Section
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

    // Overview Section - STAFF STYLE
    overviewSection: {
      marginBottom: 32,
    },
    sectionHeader: {
      marginBottom: 20,
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
    
    // 4 Container Row - STAFF STYLE
    fourContainerRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
    },
    statItem: {
      height: 200,
      flexShrink: 1,
      minWidth: 0,
    },
    
    // Review Status Container - STAFF STYLE
    reviewStatusContainer: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    reviewStatusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    reviewStatusTitle: {
      color: C.ink,
      fontSize: 16,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },

    // Stats Card - STAFF STYLE
    statsCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      height: '100%',
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    statsIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statsValue: {
      fontSize: 32,
      fontWeight: '700',
      fontFamily: FONTS.heading,
      marginBottom: 8,
      textAlign: 'center',
    },
    statsTitle: {
      color: C.mute,
      fontSize: 14,
      fontWeight: '500',
      fontFamily: FONTS.subheading,
      textAlign: 'center',
      lineHeight: 18,
    },
    statsSubtitle: {
      color: C.subtle,
      fontSize: 12,
      fontFamily: FONTS.body,
      textAlign: 'center',
      marginTop: 4,
    },

    // Donut Chart Styles (STAFF STYLE)
    donutWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    donutOuter: {
      width: 80,
      height: 80,
      borderRadius: 80,
      borderWidth: 10,
      borderColor: "#22c55e",
      borderRightColor: "#ef4444",
      borderBottomColor: "#f59e0b",
      transform: [{ rotateZ: "20deg" }],
      backgroundColor: "#fff",
    },
    donutInner: {
      position: "absolute",
      left: 18,
      top: 18,
      width: 44,
      height: 44,
      borderRadius: 44,
      backgroundColor: "#fff",
    },
    donutLegend: {
      flex: 1,
    },

    // No Data State
    noDataContainerSmall: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    noDataTextSmall: {
      color: C.mute,
      fontSize: 14,
      fontFamily: FONTS.body,
      textAlign: 'center',
      marginTop: 8,
    },

    // Search and Filter Section
    searchSection: {
      marginBottom: 24,
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

    // Results Header
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    resultsCount: {
      fontSize: 14,
      color: C.mute,
      fontFamily: FONTS.body,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: `${C.info}15`,
    },
    filterBtnText: {
      color: C.info,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
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

    // Research Grid (List Mode)
    researchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    researchCard: {
      width: '48%',
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
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
      alignItems: 'flex-start',
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
      flexShrink: 0,
    },
    researchTitleContainer: {
      flex: 1,
    },
    researchTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.ink,
      fontFamily: FONTS.subheading,
      marginBottom: 8,
      lineHeight: 18,
    },
    researchMeta: {
      gap: 8,
      marginBottom: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: C.inkLight,
      fontFamily: FONTS.body,
    },
    incompleteWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${C.warning}15`,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      marginBottom: 12,
    },
    incompleteText: {
      fontSize: 11,
      color: C.warning,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },
    categoriesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 16,
    },
    categoryTag: {
      backgroundColor: `${C.primary}08`,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    categoryTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.primary,
      fontFamily: FONTS.subheading,
    },
    genreTag: {
      backgroundColor: `${C.secondary}08`,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    genreTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.secondary,
      fontFamily: FONTS.subheading,
    },
    noTagsText: {
      fontSize: 11,
      color: C.subtle,
      fontStyle: 'italic',
      fontFamily: FONTS.body,
    },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 8,
      paddingVertical: 10,
      width: '100%',
    },
    manageButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },

    // Visibility Badges (List Mode)
    visibilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    visibilityBadgePublic: {
      backgroundColor: `${C.success}15`,
    },
    visibilityBadgeCampus: {
      backgroundColor: `${C.primary}15`,
    },
    visibilityBadgePrivate: {
      backgroundColor: `${C.warning}15`,
    },
    visibilityBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: FONTS.subheading,
    },
    visibilityBadgePublicText: {
      color: C.success,
    },
    visibilityBadgeCampusText: {
      color: C.primary,
    },
    visibilityBadgePrivateText: {
      color: C.warning,
    },

    // EDIT MODE STYLES
    publishCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    metadataCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    taxonomyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    cardTitle: {
      color: C.ink,
      fontSize: 18,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },
    cardSubtitle: {
      color: C.mute,
      fontSize: 13,
      fontFamily: FONTS.body,
      marginTop: 2,
    },

    // HORIZONTAL VISIBILITY STYLES (3 options)
    horizontalVisibilityGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    horizontalVisibilityOption: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: C.border,
      minHeight: 90,
      justifyContent: 'center',
    },
    horizontalVisibilityOptionActive: {
      backgroundColor: C.card,
    },
    horizontalVisibilityContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    horizontalVisibilityIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      flexShrink: 0,
    },
    horizontalVisibilityTextGroup: {
      flex: 1,
    },
    horizontalVisibilityTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.ink,
      fontFamily: FONTS.subheading,
      marginBottom: 4,
    },
    horizontalVisibilityTitleActive: {
      color: C.primary,
    },
    horizontalVisibilityDescription: {
      fontSize: 12,
      color: C.mute,
      fontFamily: FONTS.body,
      lineHeight: 16,
    },

    landingPageSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.ink,
      marginBottom: 8,
      fontFamily: FONTS.subheading,
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    // Add these styles to your existing styles object:
// 5. Additional styles for the new components
// Add these to your stylesheet
linkContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: `${C.info}10`,
  paddingHorizontal: 8,
  paddingVertical: 6,
  borderRadius: 6,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: `${C.info}20`,
},
linkText: {
  fontSize: 11,
  color: C.info,
  fontFamily: FONTS.subheading,
  flex: 1,
},
// Title and Year row
titleYearRow: {
  flexDirection: 'row',
  gap: 16,
  width: '100%',
  marginBottom: 16,
},
titleInputContainer: {
  flex: 1,
},
yearInputContainer: {
  width: 100, // Fixed width for year
},
yearTextInput: {
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: C.ink,
  fontFamily: FONTS.body,
  textAlign: 'center',
  minWidth: 80,
},

// Author and Co-Authors row
authorRow: {
  flexDirection: 'row',
  gap: 16,
  width: '100%',
  marginBottom: 16,
},
authorInputContainer: {
  flex: 1,
  minWidth: 120,
},
coAuthorsInputContainer: {
  flex: 2, // Co-authors is wider than primary author
  minWidth: 160,
},

// Keywords
keywordsInputContainer: {
  width: '100%',
  marginBottom: 8,
},
    formGroup: {
      flex: 1,
      minWidth: '48%',
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.inkLight,
      marginBottom: 8,
      fontFamily: FONTS.subheading,
    },
    textInput: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: C.ink,
      fontFamily: FONTS.body,
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: `${C.primary}15`,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    linkButtonText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },
    quickPickSection: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: C.borderLight,
    },
    quickPickTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.ink,
      marginBottom: 12,
      fontFamily: FONTS.subheading,
    },
    chipContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryChip: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    categoryChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.inkLight,
      fontFamily: FONTS.subheading,
    },
    categoryChipTextActive: {
      color: '#ffffff',
    },
    tagChip: {
      backgroundColor: `${C.secondary}10`,
      borderWidth: 1,
      borderColor: `${C.secondary}30`,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    tagChipActive: {
      backgroundColor: C.secondary,
      borderColor: C.secondary,
    },
    tagChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.secondary,
      fontFamily: FONTS.subheading,
    },
    tagChipTextActive: {
      color: '#ffffff',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.surface,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    cancelButtonText: {
      color: C.mute,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: FONTS.subheading,
    },
    deleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.error,
      paddingVertical: 14,
      borderRadius: 12,
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
    deleteButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: FONTS.subheading,
    },
    saveButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.primary,
      paddingVertical: 14,
      borderRadius: 12,
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
    saveButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: FONTS.subheading,
    },
  });