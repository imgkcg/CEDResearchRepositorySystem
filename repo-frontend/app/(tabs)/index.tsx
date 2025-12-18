// app/screens/StudentRepository.tsx - UPDATED: REMOVED SEARCH, CHANGED PENDING TO DRAFTS
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, Pressable, Dimensions, Platform, Alert,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getToken, removeToken } from "../../lib/auth";
import api from "../../lib/api";
import { LinearGradient } from "expo-linear-gradient";


const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

/** 🎨 Student Theme - Green & Modern */
const C = {
  // Primary Colors - Student Green
  primary: "#10b981",
  primaryDark: "#059669",
  primaryLight: "#34d399",
  primaryGradient: ["#10b981", "#059669"],
  
  // Secondary Colors
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  
  // Neutral Colors (same as faculty for consistency)
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
  sidebarTextActive: "#10b981",
};

// Font configuration (SAME AS FACULTY)
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

const DELETE_WINDOW_SEC = 300;
const REVISE_WINDOW_SEC = 300;

type SubmissionType = "draft" | "final";
type ResearchPaper = {
  _id: string;
  title: string;
  author: string;
  adviser?: string;
  student?: string;
  status: "pending" | "approved" | "rejected";
  facultyComment?: string;
  abstract?: string;
  createdAt?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  submissionType?: SubmissionType;
  coAuthors?: string[];
  keywords?: string[] | string;
  year?: string | number;
};

const STATUS_STYLES: Record<ResearchPaper["status"], { bg: string; fg: string; icon: any }> = {
  pending:  { bg: "#FEF3C7", fg: "#B45309", icon: "time-outline" },
  approved: { bg: "#DCFCE7", fg: "#065F46", icon: "checkmark-circle-outline" },
  rejected: { bg: "#FEE2E2", fg: "#7F1D1D", icon: "close-circle-outline" },
};

function StatusBadge({ status }: { status: ResearchPaper["status"] }) {
  const s = STATUS_STYLES[status];
  return (
    <View style={[styles.statBadge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon as any} size={14} color={s.fg} />
      <Text style={[styles.statBadgeText, { color: s.fg }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function TypeBadgeFS({ type }: { type: SubmissionType | undefined }) {
  const isFinal = (type || "draft") === "final";
  return (
    <View style={[
      styles.typeBadge, 
      { 
        backgroundColor: isFinal ? `${C.success}15` : `${C.warning}15`,
        borderColor: isFinal ? C.success : C.warning 
      }
    ]}>
      <Text style={{ 
        color: isFinal ? C.success : "#92400E", 
        fontWeight: "800", 
        fontSize: 10,
        fontFamily: FONTS.subheading,
      }}>
        {isFinal ? "FINAL" : "DRAFT"}
      </Text>
    </View>
  );
}

/* ---------- Review Status Donut (like faculty) ---------- */
function ReviewStatusDonut({ 
  pending,
  approved,
  rejected,
  pctPending,
  pctApproved,
  pctRejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
  pctPending: number;
  pctApproved: number;
  pctRejected: number;
}) {
  return (
    <View style={styles.donutWrap}>
      <View style={styles.donutOuter}>
        <View style={styles.donutInner} />
      </View>
      <View style={styles.donutLegend}>
        <Legend color={C.warning} label={`Pending (${pending}, ${pctPending}%)`} />
        <Legend color={C.success} label={`Approved (${approved}, ${pctApproved}%)`} />
        <Legend color={C.error} label={`Rejected (${rejected}, ${pctRejected}%)`} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/* ---------- Reusable Components (matching faculty) ---------- */

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
      <View style={[styles.metricIcon, { backgroundColor: C.surface }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
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
      case 'add research':
        return 'Upload';
      case 'my research':
        return 'View';
      case 'public repository':
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
  type: "research" | "pending" | "feedback";
  onPress: () => void;
}) {
  const getIcon = () => {
    switch (type) {
      case "research": return "document-text";
      case "pending": return "time";
      case "feedback": return "chatbubble-ellipses";
      default: return "document-outline";
    }
  };

  const getColor = () => {
    switch (type) {
      case "research": return C.primary;
      case "pending": return C.warning;
      case "feedback": return C.accent;
      default: return C.inkLight;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.activityItem}>
      <View style={[styles.activityItemIcon, { backgroundColor: `${getColor()}10` }]}>
        <Ionicons name={getIcon()} size={16} color={getColor()} />
      </View>
      <View style={styles.activityItemContent}>
        <Text style={styles.activityItemTitle}>{title}</Text>
        <Text style={styles.activityItemSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.activityItemTime}>{time}</Text>
    </TouchableOpacity>
  );
}

export default function StudentRepository() {
  const [myPapers, setMyPapers] = useState<ResearchPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Review status data for donut chart
  const [reviewStats, setReviewStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    drafts: 0, // Added drafts count
    total: 0,
    pctPending: 0,
    pctApproved: 0,
    pctRejected: 0,
  });

  const [reviseModal, setReviseModal] = useState(false);
  const [reviseTarget, setReviseTarget] = useState<ResearchPaper | null>(null);
  const [reviseTitle, setReviseTitle] = useState("");
  const [reviseAdviser, setReviseAdviser] = useState("");
  const [reviseAbstract, setReviseAbstract] = useState("");
  const [reviseKeywords, setReviseKeywords] = useState("");
  const [reviseType, setReviseType] = useState<SubmissionType>("draft");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingRevise, setSavingRevise] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
const [showLogoutModal, setShowLogoutModal] = useState(false);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Navigation items
  const navItems = [
    {
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
         onPress: () => router.push("/(tabs)/submissions"),
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
      onPress: () => router.push("/repository"),
      active: false
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

  const normalizeKeywords = (kw?: string[] | string): string[] =>
    Array.isArray(kw)
      ? kw.map(String).map(s => s.trim()).filter(Boolean)
      : (kw || "").split(",").map(s => s.trim()).filter(Boolean);

const logout = async () => {
  await removeToken();

  if (Platform.OS === "web") {
    window.location.href = "/login"; // Force exit from (tabs)
  } else {
    router.dismissAll();             // Clear entire navigation stack
    router.replace("/login");        // Go to login
  }
};

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

  const fetchMyResearch = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No authentication token found.");
      const res = await api.get("/student/my-research", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      const rows: ResearchPaper[] = res.data || [];
      const withType = rows.map((p) => ({
        ...p,
        submissionType: p.submissionType || (p.status === "approved" ? "final" : "draft"),
        keywords: normalizeKeywords(p.keywords),
      }));
      setMyPapers(withType);

      // Calculate review stats for donut chart
      const pending = rows.filter(p => p.status === "pending").length;
      const approved = rows.filter(p => p.status === "approved").length;
      const rejected = rows.filter(p => p.status === "rejected").length;
      const drafts = rows.filter(p => p.submissionType === "draft" || !p.submissionType).length;
      const total = rows.length || 1;
      
      setReviewStats({
        pending,
        approved,
        rejected,
        drafts, // Store drafts count
        total: rows.length,
        pctPending: Math.round((pending / total) * 100),
        pctApproved: Math.round((approved / total) * 100),
        pctRejected: Math.round((rejected / total) * 100),
      });
    } catch (err) {
      console.error("❌ Failed to fetch student research:", err);
      Alert.alert("Error", "Failed to load your submissions.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchUserProfile(); // <<< CALL HERE
            await fetchMyResearch();
            setLoading(false);
        })();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            fetchUserProfile(); // <<< CALL HERE
            fetchMyResearch();
            return () => {};
        }, [])
    );

  // Calculate approval rate correctly
  const calculateApprovalRate = () => {
    const approved = reviewStats.approved || 0;
    const rejected = reviewStats.rejected || 0;
    
    const totalEvaluated = approved + rejected;
    if (totalEvaluated === 0) return 0;
    
    const approvalRate = (approved / totalEvaluated) * 100;
    return Math.round(approvalRate);
  };

  // Recent lists (data only) - like faculty
  const recentResearch = useMemo(
    () =>
      [...(myPapers || [])]
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [myPapers]
  );

  const pendingSubs = useMemo(
    () =>
      (myPapers || [])
        .filter((s: any) => s.status === "pending")
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [myPapers]
  );

  // Get papers with faculty feedback
  const papersWithFeedback = useMemo(
    () =>
      (myPapers || [])
        .filter((p: any) => p.facultyComment)
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [myPapers]
  );

  // Stats for the overview section (Review Status + 3 metrics)
  // CHANGED: "Pending" to "Drafts"
  const statsData = [
    {
      id: 'myResearch',
      icon: 'book',
      value: reviewStats.total,
      label: 'My Research',
      color: C.primary,
      onPress: () => {},
    },
    {
      id: 'drafts',
      icon: 'document-text', // Changed icon from 'time' to 'document-text'
      value: reviewStats.drafts,
      label: 'Drafts', // Changed from 'Pending' to 'Drafts'
      color: C.warning,
      onPress: () => {},
    },
    {
      id: 'approvalRate',
      icon: 'trending-up',
      value: `${calculateApprovalRate()}%`,
      label: 'Approval Rate',
      color: C.accent,
    },
  ];

  // Quick Access Actions
  const quickAccessActions = [
    {
      title: "Add Research",
      description: "Upload new research paper or project",
      icon: "add-circle",
      color: C.primary,
      onPress: () => router.push("/add-research"),
    },
    {
      title: "My Research",
      description: "View and manage your submissions",
      icon: "document-text",
      color: C.secondary,
      onPress: () => router.push("/(tabs)/submissions"),
    },
    {
      title: "Public Repository",
      description: "Browse approved research database",
      icon: "earth",
      color: C.accent,
      onPress: () => router.push("/repository"),
    },
  ];

  const openReviseModal = (paper: ResearchPaper) => {
    const createdAt = new Date(paper.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > REVISE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only revise within 5 minutes after uploading.");
      return;
    }
    setReviseTarget(paper);
    setReviseTitle(paper.title || "");
    setReviseAdviser(paper.adviser || "");
    setReviseAbstract(paper.abstract || "");
    const kw = normalizeKeywords(paper.keywords).join(", ");
    setReviseKeywords(kw);
    setReviseType(paper.submissionType || (paper.status === "approved" ? "final" : "draft"));
    setSelectedFile(null);
    setReviseModal(true);
  };

  const submitRevision = async () => {
    if (!reviseTarget) return;

    const createdAt = new Date(reviseTarget.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > REVISE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only revise within 5 minutes after uploading.");
      setReviseModal(false);
      return;
    }

    try {
      setSavingRevise(true);
      const token = await getToken();
      const keywordsCsv = normalizeKeywords(reviseKeywords).join(",");

      if (selectedFile && Platform.OS === "web") {
        const form = new FormData();
        form.append("title", reviseTitle || "");
        form.append("adviser", reviseAdviser || "");
        form.append("abstract", reviseAbstract || "");
        form.append("submissionType", reviseType);
        form.append("keywords", keywordsCsv);
        form.append("file", selectedFile);
        await api.put(`/student/revise/${reviseTarget._id}`, form, {
          headers: { Authorization: `Bearer ${token?.token}` },
        });
      } else {
        await api.put(
          `/student/revise/${reviseTarget._id}`,
          {
            title: reviseTitle || reviseTarget.title,
            adviser: reviseAdviser || "",
            abstract: reviseAbstract || "",
            submissionType: reviseType,
            keywords: keywordsCsv,
          },
          { headers: { Authorization: `Bearer ${token?.token}` } }
        );
      }

      Alert.alert("✅ Success", "Revision submitted for approval.");
      setReviseModal(false);
      setReviseTarget(null);
      fetchMyResearch();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to revise paper.";
      Alert.alert("Error", msg);
    } finally {
      setSavingRevise(false);
    }
  };

  const handleDelete = async (paper: ResearchPaper) => {
    const createdAt = new Date(paper.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > DELETE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only delete a draft within 5 minutes after uploading.");
      return;
    }

    const confirmDelete =
      Platform.OS === "web"
        ? window.confirm(`Are you sure you want to delete "${paper.title}"?`)
        : true;
    if (!confirmDelete) return;

    try {
      const token = await getToken();
      await api.delete(`/student/delete/${paper._id}`, {
        headers: { Authorization: `Bearer ${token?.token}` },
      });
      Alert.alert("🗑️ Deleted", "Your draft has been removed successfully.");
      fetchMyResearch();
    } catch (err: any) {
      console.error("❌ Delete failed:", err?.response?.data || err);
      const msg = err?.response?.data?.error || "Failed to delete draft. Please try again.";
      Alert.alert("Error", msg);
    }
  };

  async function openStudentFile(item: ResearchPaper) {
    const tokenObj = await getToken();
    const token = tokenObj?.token;
    if (!token) return Alert.alert("Session expired", "Please sign in again.");

    const apiBase = (api.defaults.baseURL || "").replace(/\/+$/, "");
    const base = /^https?:\/\//i.test(apiBase)
      ? apiBase
      : `${window.location.origin}${apiBase.startsWith("/") ? "" : "/"}${apiBase}`;

    if (item.status === "approved") {
      try {
        const signed = await api.get(`${base}/research/file/${item._id}/signed`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const signedUrl = signed.data?.url;
        if (!signedUrl) throw new Error("No signed URL");
        window.open(signedUrl, "_blank");
        return;
      } catch (err) {
        console.error("Signed link fetch failed:", err);
        Alert.alert("Error", "Failed to fetch signed link.");
        return;
      }
    }

    const finalUrl = `${base}/student/file/${item._id}?token=${encodeURIComponent(token)}&t=${Date.now()}`;
    window.open(finalUrl, "_blank");
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
                <Ionicons name="school" size={28} color={C.primary} />
              </View>
              <View>
                <Text style={styles.logoText}>Student Hub</Text>
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
  onPress={() => setShowLogoutModal(true)}
>

            <Ionicons name="log-out-outline" size={20} color={C.mute} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </View>
{/* Logout Confirmation Modal */}
<Modal
  animationType="fade"
  transparent={true}
  visible={showLogoutModal}
  onRequestClose={() => setShowLogoutModal(false)}
>
  <View style={{
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <View style={{
      backgroundColor: "white",
      padding: 20,
      borderRadius: 12,
      width: 300
    }}>
      <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: "600" }}>
        Sign Out
      </Text>

      <Text style={{ marginBottom: 20 }}>
        Are you sure you want to sign out?
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <TouchableOpacity 
          onPress={() => setShowLogoutModal(false)}
          style={{ marginRight: 20 }}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={async () => {
            setShowLogoutModal(false);
            await removeToken();

            if (Platform.OS === "web") {
              window.location.href = "/login";
            } else {
              router.dismissAll();
              router.replace("/login");
            }
          }}
        >
          <Text style={{ color: "red" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Dashboard</Text>
              <Text style={styles.userGreeting}>Welcome back, Student</Text>
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
                  <Text style={styles.heroTitle}>Student Research Hub</Text>
                  <Text style={styles.heroSubtitle}>
                    Manage your research submissions, track progress, and access repository
                  </Text>
                </View>
                <Ionicons name="rocket" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Overview Section - Matching faculty layout */}
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
                  
                  {reviewStats.total > 0 ? (
                    <ReviewStatusDonut
                      pending={reviewStats.pending}
                      approved={reviewStats.approved}
                      rejected={reviewStats.rejected}
                      pctPending={reviewStats.pctPending}
                      pctApproved={reviewStats.pctApproved}
                      pctRejected={reviewStats.pctRejected}
                    />
                  ) : (
                    <View style={styles.noDataContainerSmall}>
                      <Ionicons name="stats-chart-outline" size={32} color={C.subtle} />
                      <Text style={styles.noDataTextSmall}>No submissions yet</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 3 Stats Containers - CHANGED: Pending to Drafts */}
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

          {/* Quick Access Section */}
          <View style={styles.actionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <Text style={styles.sectionSubtitle}>Navigate to key features</Text>
            </View>
            
            <View style={styles.actionsGrid}>
              {quickAccessActions.map((action, index) => (
                <View key={action.title} style={styles.actionCardWrapper}>
                  <ActionCard
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    color={action.color}
                    onPress={action.onPress}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* REMOVED: Search Container Section */}

          {/* Recent Activity - Like Faculty */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.sectionSubtitle}>Latest submissions and feedback</Text>
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
                      <Text style={styles.cardTitle}>Recent Submissions</Text>
                      <Text style={styles.cardSubtitle}>Latest research papers and projects</Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityList}>
                    {recentResearch.length > 0 ? (
                      recentResearch.slice(0, 5).map((paper: any) => (
                        <ActivityItem
                          key={paper._id}
                          title={paper.title}
                          subtitle={paper.adviser || "No adviser"}
                          time={new Date(paper.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          type="research"
                          onPress={() => setSelectedPaper(paper)}
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

              {/* Pending Reviews & Feedback */}
              <View style={styles.activityCardWrapper}>
                <View style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: `${C.warning}15` }]}>
                      <Ionicons name="time" size={20} color={C.warning} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Pending & Feedback</Text>
                      <Text style={styles.cardSubtitle}>
                        {pendingSubs.length} pending, {papersWithFeedback.length} with feedback
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityList}>
                    {pendingSubs.length > 0 || papersWithFeedback.length > 0 ? (
                      <>
                        {pendingSubs.slice(0, 3).map((paper: any) => (
                          <ActivityItem
                            key={`pending-${paper._id}`}
                            title={paper.title}
                            subtitle="Awaiting review"
                            time={new Date(paper.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            type="pending"
                            onPress={() => setSelectedPaper(paper)}
                          />
                        ))}
                        {papersWithFeedback.slice(0, 2).map((paper: any) => (
                          <ActivityItem
                            key={`feedback-${paper._id}`}
                            title={paper.title}
                            subtitle="Faculty feedback available"
                            time={new Date(paper.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            type="feedback"
                            onPress={() => setSelectedPaper(paper)}
                          />
                        ))}
                      </>
                    ) : (
                      <View style={styles.emptyActivity}>
                        <Ionicons name="checkmark-circle-outline" size={32} color={C.subtle} />
                        <Text style={styles.emptyActivityText}>All caught up!</Text>
                        <Text style={styles.emptyActivitySubtext}>No pending reviews or feedback</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* FAB for adding new research */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push("/add-research")}
        >
          <MaterialIcons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal 
        visible={!!selectedPaper} 
        animationType="slide" 
        transparent
        onRequestClose={() => setSelectedPaper(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle} numberOfLines={2}>
                {selectedPaper?.title || "Research Details"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedPaper(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.detailsModalBody} 
              contentContainerStyle={styles.detailsModalContent}
            >
              {selectedPaper && (
                <>
                  <View style={styles.badgesRow}>
                    <StatusBadge status={selectedPaper.status || "pending"} />
                    <TypeBadgeFS type={selectedPaper.submissionType} />
                  </View>

                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={18} color={C.mute} />
                      <Text style={styles.infoLabel}>Author:</Text>
                      <Text style={styles.infoValue}>{selectedPaper.author || "—"}</Text>
                    </View>
                    
                    {selectedPaper.adviser && (
                      <View style={styles.infoRow}>
                        <Ionicons name="school" size={18} color={C.mute} />
                        <Text style={styles.infoLabel}>Adviser:</Text>
                        <Text style={styles.infoValue}>{selectedPaper.adviser}</Text>
                      </View>
                    )}

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar" size={18} color={C.mute} />
                      <Text style={styles.infoLabel}>Submitted:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPaper.createdAt ? new Date(selectedPaper.createdAt).toLocaleDateString() : "—"}
                      </Text>
                    </View>
                  </View>

                  {normalizeKeywords(selectedPaper.keywords).length > 0 && (
                    <View style={styles.keywordsSection}>
                      <Text style={styles.sectionTitle}>Keywords</Text>
                      <View style={styles.keywordContainer}>
                        {normalizeKeywords(selectedPaper.keywords).map((k, i) => (
                          <View key={`modal-kw-${i}`} style={styles.keywordTag}>
                            <Text style={styles.keywordTagText}>#{k}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.abstractSection}>
                    <Text style={styles.sectionTitle}>Abstract</Text>
                    <View style={styles.abstractBox}>
                      <Text style={styles.abstractText} selectable>
                        {selectedPaper.abstract || "No abstract available."}
                      </Text>
                    </View>
                  </View>

                  {selectedPaper.facultyComment && (
                    <View style={styles.feedbackSection}>
                      <Text style={styles.sectionTitle}>Faculty Feedback</Text>
                      <View style={styles.feedbackBox}>
                        <Ionicons name="chatbox-ellipses" size={20} color="#D97706" />
                        <Text style={styles.feedbackText}>{selectedPaper.facultyComment}</Text>
                      </View>
                    </View>
                  )}

                  {selectedPaper.fileName && (
                    <TouchableOpacity 
                      style={styles.viewPdfButton} 
                      onPress={() => openStudentFile(selectedPaper)}
                    >
                      <Ionicons name="document-text" size={20} color="#fff" />
                      <Text style={styles.viewPdfButtonText}>Open PDF Document</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Revise Modal */}
      <Modal visible={reviseModal} transparent animationType="fade" onRequestClose={() => setReviseModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReviseModal(false)}>
          <Pressable style={styles.reviseModalContent} onPress={() => {}}>
            <View style={styles.reviseModalHeader}>
              <Text style={styles.reviseModalTitle}>Revise Submission</Text>
              <TouchableOpacity onPress={() => setReviseModal(false)}>
                <Ionicons name="close" size={24} color={C.mute} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviseScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.reviseForm}>
                <Text style={styles.reviseHelp}>⏰ You can revise within 5 minutes after upload</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput 
                    value={reviseTitle} 
                    onChangeText={setReviseTitle} 
                    placeholder="Enter research title" 
                    style={styles.formInput} 
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Adviser</Text>
                  <TextInput 
                    value={reviseAdviser} 
                    onChangeText={setReviseAdviser} 
                    placeholder="Enter adviser name" 
                    style={styles.formInput} 
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Keywords (comma-separated)</Text>
                  <TextInput
                    value={reviseKeywords}
                    onChangeText={setReviseKeywords}
                    placeholder="e.g., machine learning, AI, education"
                    style={styles.formInput}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Abstract</Text>
                  <TextInput
                    value={reviseAbstract}
                    onChangeText={setReviseAbstract}
                    placeholder="Enter abstract"
                    style={[styles.formInput, styles.textArea]}
                    multiline
                    numberOfLines={6}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Submission Type</Text>
                  <View style={styles.typeSelector}>
                    {(["draft", "final"] as const).map((opt) => {
                      const active = reviseType === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => setReviseType(opt)}
                          style={[
                            styles.typeOption,
                            active && styles.typeOptionActive,
                            opt === "draft" && active && { 
                              borderColor: C.warning, 
                              backgroundColor: `${C.warning}15` 
                            },
                            opt === "final" && active && { 
                              borderColor: C.success, 
                              backgroundColor: `${C.success}15` 
                            },
                          ]}
                        >
                          <Ionicons 
                            name={opt === "draft" ? "document-text-outline" : "cloud-upload-outline"} 
                            size={18} 
                            color={active ? (opt === "draft" ? "#D97706" : "#059669") : C.subtle} 
                          />
                          <Text style={[
                            styles.typeOptionText,
                            active && { 
                              color: opt === "draft" ? "#92400E" : "#065F46", 
                              fontWeight: "800" 
                            }
                          ]}>
                            {opt.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Replace File (optional)</Text>
                  {Platform.OS === "web" ? (
                    <>
                      <input
                        ref={webFileInputRef as any}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setSelectedFile(f ?? null);
                        }}
                      />
                      <TouchableOpacity 
                        style={styles.filePickerButton} 
                        onPress={() => webFileInputRef.current?.click()}
                      >
                        <Ionicons name="cloud-upload-outline" size={20} color={C.primary} />
                        <Text style={styles.filePickerText}>
                          {selectedFile ? `Selected: ${selectedFile.name}` : "Choose file"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.filePickerButton}
                      onPress={() =>
                        Alert.alert(
                          "Replace File",
                          "On mobile, use the Add Research screen to re-upload."
                        )
                      }
                    >
                      <Ionicons name="information-circle-outline" size={20} color={C.mute} />
                      <Text style={styles.filePickerText}>Use Add Research to re-upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.reviseModalFooter}>
              <TouchableOpacity
                style={[styles.reviseSaveButton, savingRevise && { opacity: 0.6 }]}
                onPress={submitRevision}
                disabled={savingRevise}
              >
                {savingRevise ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.reviseSaveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.reviseCancelButton} 
                onPress={() => setReviseModal(false)}
              >
                <Text style={styles.reviseCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: C.bg,
  },
  
  // Sidebar Styles (matching faculty)
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

  // Main Content Styles (matching faculty)
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

  // Hero Section (matching faculty)
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

  // Overview Section (matching faculty layout)
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
  
  // 4 Container Row (matching faculty)
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
  
  // Review Status Container (matching faculty)
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

  // Donut Chart Styles (from faculty)
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
    borderColor: C.warning,
    borderRightColor: C.success,
    borderBottomColor: C.error,
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
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: C.mute,
    fontWeight: "600",
    fontSize: 12,
    fontFamily: FONTS.subheading,
  },

  // No Data State (matching faculty)
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

  // Metric Card (matching faculty)
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

  // Quick Access Section (matching faculty)
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

  // REMOVED: Search Container Styles

  // Recent Activity Section (matching faculty)
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

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: C.primary,
    borderRadius: 60,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // Badges
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  // Details Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModal: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '85%',
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 12,
    fontFamily: FONTS.heading,
  },
  closeButton: {
    padding: 4,
  },
  detailsModalBody: {
    flex: 1,
  },
  detailsModalContent: {
    padding: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  infoSection: {
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.inkLight,
    minWidth: 80,
    fontFamily: FONTS.subheading,
  },
  infoValue: {
    fontSize: 14,
    color: C.ink,
    flex: 1,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },
  keywordsSection: {
    marginBottom: 16,
  },
  keywordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: `${C.primary}08`,
    borderColor: C.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  keywordTagText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
  abstractSection: {
    marginBottom: 16,
  },
  abstractBox: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  abstractText: {
    fontSize: 14,
    color: C.inkLight,
    lineHeight: 22,
    textAlign: 'justify',
    fontFamily: FONTS.body,
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackBox: {
    backgroundColor: `${C.warning}15`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${C.warning}30`,
    flexDirection: 'row',
    gap: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  viewPdfButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FONTS.subheading,
  },

  // Revise Modal
  reviseModalContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    width: width > 500 ? 500 : '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  reviseModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  reviseModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    fontFamily: FONTS.heading,
  },
  reviseScrollView: {
    maxHeight: 400,
  },
  reviseForm: {
    padding: 20,
  },
  reviseHelp: {
    fontSize: 13,
    color: '#D97706',
    backgroundColor: `${C.warning}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkLight,
    marginBottom: 8,
    fontFamily: FONTS.subheading,
  },
  formInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
    fontFamily: FONTS.body,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
    gap: 6,
  },
  typeOptionActive: {
    borderWidth: 2,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.subtle,
    fontFamily: FONTS.subheading,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  filePickerText: {
    fontSize: 14,
    color: C.inkLight,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },
  reviseModalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  reviseSaveButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reviseSaveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FONTS.subheading,
  },
  reviseCancelButton: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviseCancelButtonText: {
    color: C.inkLight,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FONTS.subheading,
  },
});