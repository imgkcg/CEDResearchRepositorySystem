// app/screens/faculty/index.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useFacultyData } from "./useFaculty";
import { useMe } from "./useMe";

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

/** Data-driven donut legend (visual ring is decorative; numbers are real) */
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
        <Legend color="#22c55e" label={`Approved (${approved}, ${pctApproved}%)`} />
        <Legend color="#ef4444" label={`Rejected (${rejected}, ${pctRejected}%)`} />
        <Legend color="#f59e0b" label={`Pending (${pending}, ${pctPending}%)`} />
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

export default function FacultyDashboardHome() {
  const { analytics, studentSubs, myResearch } = useFacultyData();
  const { name } = useMe();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  /** ------- Derived, data-only views ------- */

  // Status counts (data-driven) - This is the donut data logic from your simpler code
  const donut = useMemo(() => {
    const approved = studentSubs.filter((s: any) => s.status === "approved").length;
    const rejected = studentSubs.filter((s: any) => s.status === "rejected").length;
    const pending = studentSubs.filter((s: any) => s.status === "pending").length;
    const total = approved + rejected + pending || 1;
    return {
      approved,
      rejected,
      pending,
      pctApproved: Math.round((approved / total) * 100),
      pctRejected: Math.round((rejected / total) * 100),
      pctPending: Math.round((pending / total) * 100),
      hasAny: approved + rejected + pending > 0,
    };
  }, [studentSubs]);

  // Calculate approval rate correctly using: Approval Rate (%) = (Approved ÷ Total Evaluated) × 100
  // Total Evaluated = Approved + Rejected (items that have been reviewed)
  const calculateApprovalRate = () => {
    if (!analytics) return 0;
    
    const approved = analytics.approved || 0;
    const rejected = analytics.rejected || 0;
    
    // Total evaluated items = approved + rejected
    const totalEvaluated = approved + rejected;
    
    if (totalEvaluated === 0) return 0;
    
    // Approval Rate = (Approved ÷ Total Evaluated) × 100
    const approvalRate = (approved / totalEvaluated) * 100;
    return Math.round(approvalRate);
  };

  // Recent lists (data only)
  const recentMyResearch = useMemo(
    () =>
      [...(myResearch || [])]
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [myResearch]
  );

  const pendingSubs = useMemo(
    () =>
      (studentSubs || [])
        .filter((s: any) => s.status === "pending")
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [studentSubs]
  );

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
      id: 'research',
      icon: 'document-text-outline',
      activeIcon: 'document-text',
      label: 'My Research',
      onPress: () => router.push("/faculty/research"),
      active: false
    },
    {
      id: 'students',
      icon: 'people-outline',
      activeIcon: 'people',
      label: 'Student Works',
      badge: analytics?.pending > 0,
      onPress: () => router.push("/faculty/submissions"),
      active: false
    },
    {
      id: 'repository',
      icon: 'library-outline',
      activeIcon: 'library',
      label: 'Repository',
      onPress: () => router.push("/repository/faculty"),
      active: false
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      onPress: () => router.push("/faculty/profile"),
      active: false
    },
  ];

  // Stats data: My Research, Advisees, and Approval Rate only
  const statsData = [
    {
      id: 'myResearch',
      icon: 'book',
      value: analytics?.myResearchCount || 0,
      label: 'My Research',
      color: C.primary,
      onPress: () => router.push("/faculty/research"),
    },
    {
      id: 'advisees',
      icon: 'people',
      value: analytics?.total || 0,
      label: 'Advisees',
      color: C.secondary,
      onPress: () => router.push("/faculty/submissions"),
    },
    {
      id: 'approvalRate',
      icon: 'trending-up',
      value: `${calculateApprovalRate()}%`,
      label: 'Approval Rate',
      color: C.accent,
    },
  ];

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
              badge={item.badge}
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
              <Text style={styles.userGreeting}>Welcome back, {name || "Professor"}</Text>
            </View>
            
            <View style={styles.navbarActions}>
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
                  <Text style={styles.heroTitle}>Academic Research Hub</Text>
                  <Text style={styles.heroSubtitle}>
                    Manage your research, review student work, and access the repository
                  </Text>
                </View>
                <Ionicons name="rocket" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Overview Section - Now with 4 containers in one row */}
          <View style={styles.overviewSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.sectionSubtitle}>Key metrics and review status</Text>
            </View>
            
            {/* 4 Containers in one row: Review Status + 3 Stats */}
            <View style={styles.fourContainerRow}>
              {/* Review Status Donut Chart Container */}
              <View style={[styles.statItem, { flex: 1.5 }]}>
                <View style={styles.reviewStatusContainer}>
                  <View style={styles.reviewStatusHeader}>
                    <Ionicons name="pie-chart-outline" size={20} color={C.secondary} />
                    <Text style={styles.reviewStatusTitle}>Review Status</Text>
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
                      <Text style={styles.noDataTextSmall}>No reviews yet</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 3 Stats Containers */}
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
                  title="My Research"
                  description="Manage your publications and projects"
                  icon="book"
                  color={C.primary}
                  onPress={() => router.push("/faculty/research")}
                />
              </View>
              <View style={styles.actionCardWrapper}>
                <ActionCard
                  title="Student Works"
                  description="Review and approve student submissions"
                  icon="people"
                  color={C.secondary}
                  onPress={() => router.push("/faculty/submissions")}
                />
              </View>
              <View style={styles.actionCardWrapper}>
                <ActionCard
                  title="Repository"
                  description="Browse academic research database"
                  icon="library"
                  color={C.accent}
                  onPress={() => router.push("/repository/faculty")}
                />
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.sectionSubtitle}>Latest research and submissions</Text>
            </View>
         
            <View style={styles.activityCards}>
              {/* My Recent Research */}
              <View style={styles.activityCardWrapper}>
                <View style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: `${C.primary}15` }]}>
                      <Ionicons name="document-text" size={20} color={C.primary} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>My Recent Research</Text>
                      <Text style={styles.cardSubtitle}>Latest publications and projects</Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityList}>
                    {recentMyResearch.length > 0 ? (
                      recentMyResearch.slice(0, 5).map((r: any) => (
                        <ActivityItem
                          key={r._id}
                          title={r.title}
                          subtitle={r.type || "Research Paper"}
                          time={new Date(r.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          type="research"
                          onPress={() => router.push("/faculty/research")}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyActivity}>
                        <Ionicons name="document-outline" size={32} color={C.subtle} />
                        <Text style={styles.emptyActivityText}>No research yet</Text>
                        <Text style={styles.emptyActivitySubtext}>Start by adding your first research paper</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Pending Reviews */}
              <View style={styles.activityCardWrapper}>
                <View style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: `${C.warning}15` }]}>
                      <Ionicons name="time" size={20} color={C.warning} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Pending Reviews</Text>
                      <Text style={styles.cardSubtitle}>{pendingSubs.length} items need attention</Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityList}>
                    {pendingSubs.length > 0 ? (
                      pendingSubs.slice(0, 5).map((s: any) => (
                        <ActivityItem
                          key={s._id}
                          title={s.title}
                          subtitle={`By ${s.author || "Student"}`}
                          time={new Date(s.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          type="pending"
                          onPress={() => router.push("/faculty/submissions")}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyActivity}>
                        <Ionicons name="checkmark-circle-outline" size={32} color={C.subtle} />
                        <Text style={styles.emptyActivityText}>All caught up!</Text>
                        <Text style={styles.emptyActivitySubtext}>No pending reviews at the moment</Text>
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
  badge,
  active,
  collapsed,
  onPress 
}: { 
  icon: string;
  activeIcon: string;
  label: string; 
  badge?: boolean;
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
        {badge && !active && (
          <View style={styles.badgeDot} />
        )}
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
  // Determine the arrow text based on the title
  const getArrowText = () => {
    switch (title.toLowerCase()) {
      case 'my research':
        return 'Manage';
      case 'student works':
        return 'See';
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
      case "research": return "document-text";
      case "pending": return "time";
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
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.warning,
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

  // Overview Section
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
  
  // 4 Container Row
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
  
  // Review Status Container
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

  // Metric Card
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

  // Donut Chart Styles (from your simpler design)
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

  // Actions Section
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

  // Recent Activity Section
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
});