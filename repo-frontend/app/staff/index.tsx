// app/screens/staff/index.tsx - UPDATED WITH FACULTY DESIGN
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** 🎨 Professional Academic Theme - Modern & Clean */
const C = {
  // Primary Colors - Academic Blue
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#3b82f6",
  primaryGradient: ["#2563eb", "#1d4ed8"],
  
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

/* ---------- Chart Components ---------- */

/** Data-driven donut legend for staff stats (FACULTY STYLE) */
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
        <Legend color="#f59e0b" label={`Restricted (${pending}, ${pctPending}%)`} />
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

// Types matching your publishing code
type ResearchItem = {
  _id: string;
  title?: string;
  author?: string;
  coAuthors?: string[] | string;
  year?: string | number;
  keywords?: string[] | string;
  createdAt?: string;
  updatedAt?: string;
  visibility?: "public" | "campus" | "private" | "embargo";
  landingPageUrl?: string | null;
  categories?: string[];
  genreTags?: string[];
  fileName?: string;
  uploaderRole?: "student" | "faculty" | "staff" | "admin";
};

type PublishingStats = {
  total: number;
  public: number;
  campus: number;
  private: number;
  embargo: number;
  incompleteMetadata: number;
  noCategories: number;
  noKeywords: number;
  recentUploads: ResearchItem[];
};

export default function StaffDashboardHome() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [researchList, setResearchList] = useState<ResearchItem[]>([]);
    const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<PublishingStats>({
    total: 0,
    public: 0,
    campus: 0,
    private: 0,
    embargo: 0,
    incompleteMetadata: 0,
    noCategories: 0,
    noKeywords: 0,
    recentUploads: [],
  });

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Calculate stats from research list (same as publishing code)
  const calculateStats = useCallback((items: ResearchItem[]): PublishingStats => {
    const stats: PublishingStats = {
      total: items.length,
      public: 0,
      campus: 0,
      private: 0,
      embargo: 0,
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
        case "embargo":
          stats.embargo++;
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

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      
      // Fetch staff profile
      const profileResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaff(profileResponse.data.user);

      // Fetch research list (same as publishing code)
      const researchResponse = await api.get(`/research-admin`, {
        headers: { Authorization: `Bearer ${token.token}` },
        params: { sort: "latest", status: "approved", limit: 1000 },
      });
      
      const researchData: ResearchItem[] = researchResponse?.data?.data ?? researchResponse?.data ?? [];
      setResearchList(researchData);
      
      // Calculate stats from research data
      setStats(calculateStats(researchData));

    } catch (error: any) {
      console.log("❌ Failed to load staff data:", error?.message || error);
      Alert.alert("Error", "Unable to fetch dashboard information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
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
  // Calculate donut chart data from stats (FACULTY STYLE)
  const donut = useMemo(() => {
    const total = stats.total || 1;
    const approved = stats.public || 0;
    const rejected = stats.campus || 0;
    const pending = (stats.private + stats.embargo) || 0;
    
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

  // Navigation items
  const navItems = [
    {
      id: 'dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      active: true,
      onPress: () => {},
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
      onPress: () => router.push("/staff/publishing"),
      active: false
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

  // Stats data - FACULTY DASHBOARD STYLE
  const statsData = [
    {
      id: 'myResearch',
      icon: 'book',
      value: stats.total || 0,
      label: 'Total Research',
      color: C.primary,
      onPress: () => router.push("/staff/publishing"),
    },
  
  ];

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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ color: C.mute, marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }

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
                <Text style={styles.logoSubtext}>Research Management</Text>
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
               onPress={() => router.push("/login")}
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
              <Text style={styles.welcomeText}>Dashboard</Text>
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
                  <Text style={styles.heroTitle}>Research Repository Hub</Text>
                  <Text style={styles.heroSubtitle}>
                    Manage research documents, publishing, and repository operations
                  </Text>
                </View>
                <Ionicons name="library" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Overview Section - FACULTY DASHBOARD STYLE */}
          <View style={styles.overviewSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.sectionSubtitle}>Research publishing metrics</Text>
            </View>
            
            {/* 4 Containers in one row - FACULTY STYLE */}
            <View style={styles.fourContainerRow}>
              {/* Publishing Status Donut Chart Container - FACULTY STYLE */}
              <View style={[styles.statItem, { flex: 1.5 }]}>
                <View style={styles.reviewStatusContainer}>
                  <View style={styles.reviewStatusHeader}>
                    <Ionicons name="pie-chart-outline" size={20} color={C.secondary} />
                    <Text style={styles.reviewStatusTitle}>Publishing Status</Text>
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

              {/* 3 Stats Containers - FACULTY STYLE */}
              {statsData.map((stat, index) => (
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
                  <MetricCard
                    icon={stat.icon}
                    value={stat.value}
                    label={stat.label}
                    color={stat.color}
                    onPress={stat.onPress}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Main Actions */}
          <View style={styles.actionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <Text style={styles.sectionSubtitle}>Navigate to key features</Text>
            </View>
            
            <View style={styles.actionsGrid}>
              <View style={styles.actionCardWrapper}>
                <ActionCard
                  title="Upload PDFs"
                  description="Add new research documents to the repository"
                  icon="cloud-upload"
                  color={C.primary}
                  onPress={() => router.push("/staff/upload")}
                />
              </View>
              <View style={styles.actionCardWrapper}>
                <ActionCard
                  title="Publishing"
                  description="Manage visibility, landing pages, and taxonomy"
                  icon="pricetags"
                  color={C.secondary}
                  onPress={() => router.push("/staff/publishing")}
                />
              </View>
              <View style={styles.actionCardWrapper}>
                <ActionCard
                  title="Repository"
                  description="Browse and manage all research documents"
                  icon="library"
                  color={C.accent}
                  onPress={() => router.push("/repository/staff")}
                />
              </View>
            </View>
          </View>

          {/* Recent Activity - KEPT AS REQUESTED */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Uploads</Text>
              <Text style={styles.sectionSubtitle}>Latest research items added</Text>
            </View>
         
            <View style={styles.activityCards}>
              {/* Recent Uploads Card */}
              <View style={styles.activityCardWrapper}>
                <View style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: `${C.primary}15` }]}>
                      <Ionicons name="cloud-upload" size={20} color={C.primary} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Recent Uploads</Text>
                      <Text style={styles.cardSubtitle}>Latest research documents added</Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityList}>
                    {stats.recentUploads.length > 0 ? (
                      stats.recentUploads.slice(0, 5).map((item) => (
                        <ActivityItem
                          key={item._id}
                          title={item.title || "Untitled"}
                          subtitle={`${item.author || "Unknown"} • ${item.year || "No year"}`}
                          time={new Date(item.createdAt || item.updatedAt || Date.now()).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          type="upload"
                          onPress={() => router.push(`/staff/publishing?id=${item._id}`)}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyActivity}>
                        <Ionicons name="cloud-upload-outline" size={32} color={C.subtle} />
                        <Text style={styles.emptyActivityText}>No recent uploads</Text>
                        <Text style={styles.emptyActivitySubtext}>Start by uploading research documents</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

            
            </View>
          </View>
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

// FACULTY STYLE Metric Card
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
function ActionCard({
  title,
  description,
  icon,
  color,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  // Determine the arrow text based on the title (FACULTY STYLE)
  const getArrowText = () => {
    switch (title.toLowerCase()) {
      case 'upload pdfs':
        return 'Upload';
      case 'publishing':
        return 'Manage';
      case 'repository':
        return 'Browse';
      default:
        return 'View';
    }
  };

  const arrowText = getArrowText();

  return (
    <TouchableOpacity onPress={onPress} style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
      <TouchableOpacity onPress={onPress} style={styles.actionButton}>
        <Ionicons name="arrow-forward" size={16} color={C.primary} />
        <Text style={styles.actionButtonText}>{arrowText}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ActivityItem({
  title,
  subtitle,
  time,
  type,
  onPress,
}: {
  title: string;
  subtitle: string;
  time: string;
  type: string;
  onPress: () => void;
}) {
  const getIcon = () => {
    switch (type) {
      case "upload": return "cloud-upload-outline";
      case "publishing": return "pricetags-outline";
      default: return "document-outline";
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.activityItem}>
      <View style={[styles.activityItemIcon, { backgroundColor: C.surface }]}>
        <Ionicons name={getIcon()} size={16} color={C.inkLight} />
      </View>
      <View style={styles.activityItemContent}>
        <Text style={styles.activityItemTitle}>{title}</Text>
        <Text style={styles.activityItemSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.activityItemTime}>{time}</Text>
    </TouchableOpacity>
  );
}

function TaskItem({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.taskItem}>
      <View style={[styles.taskItemIcon, { backgroundColor: C.surface }]}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={styles.taskItemContent}>
        <Text style={styles.taskItemTitle}>{title}</Text>
        <Text style={styles.taskItemSubtitle}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */

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

  // Main Content Styles
  mainContent: {
    flex: 1,
    backgroundColor: C.bg,
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

  // Overview Section - FACULTY STYLE
  overviewSection: {
    marginBottom: 32,
    width: '100%',
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
  
  // 4 Container Row - FACULTY STYLE
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
  
  // Review Status Container - FACULTY STYLE
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

  // Metric Card - FACULTY STYLE
  metricCardTouchable: {
    flex: 1,
    height: '100%',
  },
  metricCard: {
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
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: FONTS.heading,
    marginBottom: 8,
    textAlign: 'center',
  },
  metricLabel: {
    color: C.mute,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Donut Chart Styles (FACULTY STYLE)
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
  actionsSection: {
    marginBottom: 32,
    width: '100%',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
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
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginBottom: 8,
  },
  actionDescription: {
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: `${C.primary}08`,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  actionButtonText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

 
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${C.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Recent Activity Section - KEPT AS REQUESTED
  activitySection: {
    marginBottom: 32,
    width: '100%',
  },
  activityCards: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  activityCardWrapper: {
    flex: 1,
  },
  activityCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  activityItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemTitle: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
    marginBottom: 2,
  },
  activityItemSubtitle: {
    color: C.mute,
    fontSize: 13,
    fontFamily: FONTS.body,
  },
  activityItemTime: {
    color: C.subtle,
    fontSize: 12,
    fontFamily: FONTS.body,
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyActivityText: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginTop: 12,
  },
  emptyActivitySubtext: {
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },

  // Task Item Styles
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  taskItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskItemContent: {
    flex: 1,
  },
  taskItemTitle: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginBottom: 2,
  },
  taskItemSubtitle: {
    color: C.mute,
    fontSize: 13,
    fontFamily: FONTS.body,
  },
});