// app/screens/SubmissionDashboard.tsx

import React, { useEffect, useRef, useState } from "react";
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

const DELETE_WINDOW_SEC = 600; // 10 minutes
const REVISE_WINDOW_SEC = 600; // 10 minutes

type SubmissionType = "draft" | "final";
type ResearchPaper = {
  _id: string;
  title: string;
  author: string;
  adviser?: string;
  student?: string;
  status: "pending" | "approved" | "rejected" | "reviewing";
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
  revisionCount?: number;
  lastUpdated?: string;
};

const STATUS_STYLES: Record<ResearchPaper["status"], { bg: string; fg: string; icon: any; label: string }> = {
  pending:  { bg: "#FEF3C7", fg: "#B45309", icon: "time-outline", label: "PENDING" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9", icon: "search-outline", label: "REVIEWING" },
  approved: { bg: "#DCFCE7", fg: "#065F46", icon: "checkmark-circle-outline", label: "APPROVED" },
  rejected: { bg: "#FEE2E2", fg: "#7F1D1D", icon: "close-circle-outline", label: "REJECTED" },
};

/* ---------- Status Badge ---------- */
function StatusBadge({ status }: { status: ResearchPaper["status"] }) {
  const s = STATUS_STYLES[status];
  return (
    <View style={[styles.statBadge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon as any} size={14} color={s.fg} />
      <Text style={[styles.statBadgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/* ---------- Type Badge ---------- */
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

/* ---------- Submission Header Badges with Timer ---------- */
function SubmissionHeaderBadges({
  submission,
  onRevise,
  onDelete,
}: {
  submission: ResearchPaper;
  onRevise: (p: ResearchPaper) => void;
  onDelete: (p: ResearchPaper) => void;
}) {
  const timerInfo = useActionTimers(submission);
  
  return (
    <View style={styles.headerBadges}>
      <TypeBadgeFS type={submission.submissionType} />
      <StatusBadge status={submission.status} />
      {submission.status === "reviewing" && timerInfo.canModify && (
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={12} color={C.mute} />
          <Text style={styles.timerBadgeText}>{timerInfo.minRemaining}</Text>
        </View>
      )}
      {submission.status === "reviewing" && !timerInfo.canModify && (
        <View style={[styles.statBadge, { backgroundColor: "#94A3B8", marginLeft: 8 }]}>
          <Ionicons name="lock-closed-outline" size={14} color="#fff" />
          <Text style={[styles.statBadgeText, { color: "#fff" }]}>LOCKED</Text>
        </View>
      )}
    </View>
  );
}

/* ---------- Submission Card Buttons ---------- */
function SubmissionCardButtons({
  submission,
  onRevise,
  onDelete,
  onViewFile,
  onViewDetails,
}: {
  submission: ResearchPaper;
  onRevise: (p: ResearchPaper) => void;
  onDelete: (p: ResearchPaper) => void;
  onViewFile: (p: ResearchPaper) => void;
  onViewDetails: () => void;
}) {
  const timerInfo = useActionTimers(submission);
  
  return (
    <>
      <View style={styles.researchFooter}>
        <Text style={styles.researchDate}>
          Submitted: {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : "—"}
        </Text>
        
        <View style={styles.actionButtons}>
          {/* Revise and Delete buttons (only for non-approved submissions) */}
          {submission.status !== "approved" && (
            <>
              <TouchableOpacity
                onPress={() => timerInfo.canModify && onRevise(submission)}
                style={[
                  styles.reviseButtonNew,
                  !timerInfo.canModify && styles.reviseButtonDisabled
                ]}
                disabled={!timerInfo.canModify}
              >
                <Ionicons name="create-outline" size={16} color={timerInfo.canModify ? C.primary : C.subtle} />
                <Text style={[styles.reviseButtonTextNew, !timerInfo.canModify && { color: C.subtle }]}>Revise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => timerInfo.canModify && onDelete(submission)}
                style={[
                  styles.deleteButtonNew,
                  !timerInfo.canModify && styles.deleteButtonDisabled
                ]}
                disabled={!timerInfo.canModify}
              >
                <Ionicons name="trash-outline" size={16} color={timerInfo.canModify ? C.error : C.subtle} />
                <Text style={[styles.deleteButtonTextNew, !timerInfo.canModify && { color: C.subtle }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}

          {submission.fileName ? (
            <TouchableOpacity onPress={() => onViewFile(submission)} style={styles.viewButton}>
              <Ionicons name="attach-outline" size={16} color={C.primary} />
              <Text style={styles.viewButtonText}>View File</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.viewButtonDisabled}>
              <Ionicons name="attach-outline" size={16} color={C.subtle} />
              <Text style={[styles.viewButtonText, { color: C.subtle }]}>No File</Text>
            </View>
          )}

          <TouchableOpacity 
            onPress={onViewDetails} 
            style={styles.detailsButton}
          >
            <Ionicons name="eye-outline" size={16} color={C.success} />
            <Text style={styles.detailsButtonText}>Full Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

/* ---------- Hook for Action Timers (Revise/Delete with 10-minute window) ---------- */
function useActionTimers(paper: ResearchPaper) {
  const [deleteRemaining, setDeleteRemaining] = React.useState(0);
  const [reviseRemaining, setReviseRemaining] = React.useState(0);

  React.useEffect(() => {
    const createdAt = new Date(paper.createdAt || "");
    const update = () => {
      const elapsed = (Date.now() - createdAt.getTime()) / 1000;
      setDeleteRemaining(Math.max(0, DELETE_WINDOW_SEC - elapsed));
      setReviseRemaining(Math.max(0, REVISE_WINDOW_SEC - elapsed));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [paper.createdAt]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const canModify = deleteRemaining > 0 || reviseRemaining > 0;
  const minRemaining = Math.min(deleteRemaining, reviseRemaining);

  return {
    canModify,
    minRemaining: fmt(minRemaining),
    reviseRemaining,
    deleteRemaining,
  };
}

/* ---------- UPDATED: Navigation Item (Same as Student Dashboard) ---------- */
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

/* ---------- UPDATED: Submission Detail Modal Content (Matching Faculty Structure) ---------- */
function SubmissionDetailContent({
  paper,
  onOpenFile
}: {
  paper: ResearchPaper;
  onOpenFile: () => void;
}) {
  const statusConfig = STATUS_STYLES[paper.status];
  const isFinal = (paper.submissionType || "draft") === "final";
  
  const normalizeKeywords = (kw?: string[] | string): string[] =>
    Array.isArray(kw)
      ? kw.map(String).map(s => s.trim()).filter(Boolean)
      : (kw || "").split(",").map(s => s.trim()).filter(Boolean);

  const keywords = normalizeKeywords(paper.keywords);

  return (
    <>
      {/* Paper Header - Matching Faculty Modal */}
      <View style={styles.modalPaperHeader}>
        <View style={styles.modalHeaderTop}>
          <View style={[styles.modalStatusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.fg} />
            <Text style={[styles.modalStatusText, { color: statusConfig.fg }]}>
              {paper.status.toUpperCase()}
            </Text>
          </View>
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
        </View>
        
        <Text style={styles.modalPaperTitle}>{paper.title}</Text>
      </View>

      {/* Author Information - Matching Faculty Modal */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Author Information</Text>
        <View style={styles.detailSectionContent}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.infoLabel}>Primary Author</Text>
              <Text style={styles.infoValue}>{paper.author}</Text>
            </View>
          </View>
          
          {paper.adviser && (
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Adviser</Text>
                <Text style={styles.infoValue}>{paper.adviser}</Text>
              </View>
            </View>
          )}
          
          {(paper.revisionCount || 0) > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Revisions</Text>
                <Text style={styles.infoValue}>{paper.revisionCount}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Submission Details - Matching Faculty Modal */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Submission Details</Text>
        <View style={styles.detailSectionContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.infoLabel}>Submitted Date</Text>
              <Text style={styles.infoValue}>
                {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : "—"}
              </Text>
            </View>
          </View>
          
          {paper.lastUpdated && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>
                  {new Date(paper.lastUpdated).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Abstract - Matching Faculty Modal */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Abstract</Text>
        <View style={styles.detailSectionContent}>
          <Text style={styles.abstractFullText}>{paper.abstract || "No abstract available."}</Text>
        </View>
      </View>

      {/* Keywords - Matching Faculty Modal */}
      {keywords.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Keywords</Text>
          <View style={styles.keywordsModalContainer}>
            {keywords.map((keyword) => (
              <View key={keyword} style={styles.keywordChipModal}>
                <Text style={styles.keywordTextModal}>#{keyword}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Faculty Feedback - Student Specific */}
      {paper.facultyComment && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Faculty Feedback</Text>
          <View style={styles.detailSectionContent}>
            <View style={styles.feedbackBox}>
              <Ionicons name="chatbox-ellipses" size={18} color={C.warning} style={{ marginRight: 10 }} />
              <Text style={styles.feedbackText}>{paper.facultyComment}</Text>
            </View>
          </View>
        </View>
      )}

      {/* File Attachment - Matching Faculty Modal */}
      {paper.fileName && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Attached File</Text>
          <View style={styles.detailSectionContent}>
            <TouchableOpacity style={styles.fileAttachmentModal} onPress={onOpenFile}>
              <View style={styles.fileIconModal}>
                <Ionicons name="document-attach-outline" size={20} color={C.primary} />
              </View>
              <View style={styles.fileInfoModal}>
                <Text style={styles.fileNameModal}>{paper.fileName}</Text>
                <Text style={styles.fileActionModal}>Tap to open file</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.subtle} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

export default function SubmissionDashboard() {
  const [submissions, setSubmissions] = useState<ResearchPaper[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ResearchPaper[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<ResearchPaper | null>(null);
  const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
    drafts: 0,
    averageReviewTime: "2.5 days",
    approvalRate: 0,
  });

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Revise modal state
  const [reviseModal, setReviseModal] = useState(false);
  const [reviseTarget, setReviseTarget] = useState<ResearchPaper | null>(null);
  const [reviseTitle, setReviseTitle] = useState("");
  const [reviseAdviser, setReviseAdviser] = useState("");
  const [reviseAbstract, setReviseAbstract] = useState("");
  const [reviseKeywords, setReviseKeywords] = useState("");
  const [reviseCoAuthors, setReviseCoAuthors] = useState("");
  const [reviseType, setReviseType] = useState<SubmissionType>("draft");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingRevise, setSavingRevise] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  // Navigation items - UPDATED to match student dashboard style
  const navItems = [
    {
      id: 'dashboard',
 icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      active: false,
      badge: false,
      onPress: () => router.push("/(tabs)"),
    },
    {
      id: 'submissions',
      icon: 'document-text-outline',
      activeIcon: 'document-text',
      label: 'My Research',
      active: true,
      badge: false,
      onPress: () => {},
    },
   
    {
      id: 'add',
      icon: 'add-circle-outline',
      activeIcon: 'add-circle',
      label: 'Add Research',
      active: false,
      badge: false,
      onPress: () => router.push("/add-research"),
    },

     {
      id: 'repository',
      icon: 'library-outline',
      activeIcon: 'library',
      label: 'Repository',
      active: false,
      badge: false,
      onPress: () => router.push("/repository"),
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      active: false,
      badge: false,
      onPress: () => router.push("/profile"),
    },
  ];
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
  const normalizeKeywords = (kw?: string[] | string): string[] =>
    Array.isArray(kw)
      ? kw.map(String).map(s => s.trim()).filter(Boolean)
      : (kw || "").split(",").map(s => s.trim()).filter(Boolean);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No authentication token found.");
      
      const res = await api.get("/student/my-research", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      
      const rows: ResearchPaper[] = res.data || [];
      const processed = rows.map((p) => ({
        ...p,
        submissionType: p.submissionType || (p.status === "approved" ? "final" : "draft"),
        status: p.status === "pending" ? "reviewing" : p.status,
        keywords: normalizeKeywords(p.keywords),
      }));
      
      setSubmissions(processed);
      setFilteredSubmissions(processed);

      // Calculate statistics (count original statuses before mapping)
      const total = processed.length;
      const pending = rows.filter(p => p.status === "pending").length;
      const reviewing = rows.filter(p => p.status === "reviewing" || p.status === "pending").length;
      const approved = processed.filter(p => p.status === "approved").length;
      const rejected = processed.filter(p => p.status === "rejected").length;
      const drafts = processed.filter(p => p.submissionType === "draft").length;
      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      setStats({
        total,
        pending,
        reviewing,
        approved,
        rejected,
        drafts,
        averageReviewTime: "2.5 days",
        approvalRate,
      });

    } catch (err) {
      console.error("❌ Failed to fetch submissions:", err);
      Alert.alert("Error", "Failed to load your submissions.");
    } finally {
      setLoading(false);
    }
  };

  // Open revise modal
  const openReviseModal = (paper: ResearchPaper) => {
    const coauth = (paper.coAuthors || []).join(", ");
    setReviseCoAuthors(coauth);

    const createdAt = new Date(paper.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > REVISE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only revise within 10 minutes after uploading.");
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

  // Submit revision
  const submitRevision = async () => {
    if (!reviseTarget) return;

    const createdAt = new Date(reviseTarget.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > REVISE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only revise within 10 minutes after uploading.");
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
        form.append("authors", reviseCoAuthors);
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
            authors: reviseCoAuthors,
          },
          { headers: { Authorization: `Bearer ${token?.token}` } }
        );
      }

      Alert.alert("✅ Success", "Revision submitted for approval.");
      setReviseModal(false);
      setReviseTarget(null);
      setSelectedFile(null);
      // Refresh submissions immediately
      await fetchSubmissions();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to revise paper.";
      Alert.alert("Error", msg);
    } finally {
      setSavingRevise(false);
    }
  };

  // Handle delete
  const handleDelete = async (paper: ResearchPaper) => {
    const createdAt = new Date(paper.createdAt || "");
    const minutesElapsed = (Date.now() - createdAt.getTime()) / 60000;
    if (minutesElapsed > DELETE_WINDOW_SEC / 60) {
      Alert.alert("⏰ Too Late", "You can only delete within 10 minutes after uploading.");
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
      Alert.alert("🗑️ Deleted", "Your submission has been removed successfully.");
      // Refresh submissions immediately
      await fetchSubmissions();
    } catch (err: any) {
      console.error("❌ Delete failed:", err?.response?.data || err);
      const msg = err?.response?.data?.error || "Failed to delete submission. Please try again.";
      Alert.alert("Error", msg);
    }
  };

  
  useEffect(() => {
          (async () => {
              setLoading(true);
              await fetchUserProfile(); // <<< CALL HERE
              await fetchSubmissions();
              setLoading(false);
          })();
      }, []);
  
      useFocusEffect(
          React.useCallback(() => {
              fetchUserProfile(); // <<< CALL HERE
              fetchSubmissions();
              return () => {};
          }, [])
      );

  // Apply filters
  useEffect(() => {
    let filtered = [...submissions];
    
    if (activeFilter !== "all") {
      filtered = filtered.filter(sub => sub.status === activeFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => 
        (sub.title || "").toLowerCase().includes(q) ||
        (sub.adviser || "").toLowerCase().includes(q) ||
        (sub.author || "").toLowerCase().includes(q)
      );
    }
    
    setFilteredSubmissions(filtered);
  }, [searchQuery, activeFilter, submissions]);

  // Function to open PDF file
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

  const filterOptions = [
    { id: "all", label: "All", icon: "layers" },
    { id: "pending", label: "Pending", icon: "time" },
    { id: "reviewing", label: "Reviewing", icon: "search" },
    { id: "approved", label: "Approved", icon: "checkmark" },
    { id: "rejected", label: "Rejected", icon: "close" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar Navigation - Same as Student Dashboard */}
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
        {/* Submission Detail Modal - Sidebar Visible (Matching Faculty) */}
        {selectedSubmission && (
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
                <Text style={styles.modalTitle}>Submission Details</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedSubmission(null)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <SubmissionDetailContent
                  paper={selectedSubmission}
                  onOpenFile={() => openStudentFile(selectedSubmission)}
                />
              </ScrollView>
            </View>
          </View>
        )}

        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Submission Management</Text>
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
          {/* Hero Section - Same as Student Dashboard */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={C.primaryGradient as any}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.heroContent}>
                <View>
                  <Text style={styles.heroTitle}>Submission Dashboard</Text>
                  <Text style={styles.heroSubtitle}>
                    Track, manage, and monitor all your research submissions in one place
                  </Text>
                </View>
                <Ionicons name="document-text" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Overview Section - 4 Containers in one row */}
          <View style={styles.metricsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Submission Overview</Text>
            </View>
            
            <View style={[
              styles.statsContainer,
              { 
                width: '100%',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                justifyContent: 'space-between',
                alignItems: 'stretch',
              }
            ]}>
              {/* Total Submissions - Matching Faculty Card */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="documents" size={22} color={C.primary} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.primary }]}>
                    {stats.total}
                  </Text>
                  <Text style={styles.metricLabel}>Total Submissions</Text>
                </View>
              </View>

              {/* In Review - Matching Faculty Card */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="time" size={22} color={C.warning} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.warning }]}>
                    {stats.pending + stats.reviewing}
                  </Text>
                  <Text style={styles.metricLabel}>In Review</Text>
                </View>
              </View>

              {/* Approved - Matching Faculty Card */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="checkmark-circle" size={22} color={C.success} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.success }]}>
                    {stats.approved}
                  </Text>
                  <Text style={styles.metricLabel}>Approved</Text>
                </View>
              </View>

              {/* Rejected - New Card */}
              <View style={styles.statItem}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="close-circle" size={22} color={C.error} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.error }]}>
                    {stats.rejected}
                  </Text>
                  <Text style={styles.metricLabel}>Rejected</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Submissions Section */}
          <View style={styles.submissionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Submissions</Text>
              <Text style={styles.sectionSubtitle}>View and manage all your research papers</Text>
            </View>

            {/* Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              {filterOptions.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterTab,
                    activeFilter === filter.id && styles.filterTabActive,
                    activeFilter === filter.id && {
                      backgroundColor: STATUS_STYLES[filter.id as ResearchPaper["status"]]?.bg || C.primary + "15",
                    }
                  ]}
                  onPress={() => setActiveFilter(filter.id)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={16} 
                    color={activeFilter === filter.id ? 
                      STATUS_STYLES[filter.id as ResearchPaper["status"]]?.fg || C.primary : 
                      C.subtle} 
                  />
                  <Text style={[
                    styles.filterTabText,
                    activeFilter === filter.id && styles.filterTabTextActive,
                    activeFilter === filter.id && {
                      color: STATUS_STYLES[filter.id as ResearchPaper["status"]]?.fg || C.primary,
                    }
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={C.subtle} />
              <TextInput
                placeholder="Search submissions by title, adviser, or author..."
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={C.subtle}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={C.subtle} />
                </TouchableOpacity>
              )}
            </View>

            {/* Submissions List */}
            <View style={styles.submissionsList}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <Text style={styles.loadingText}>Loading submissions...</Text>
                </View>
              ) : filteredSubmissions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color={C.border} />
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? "No matches found" : "No submissions yet"}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery 
                      ? "Try different search terms" 
                      : "Start by submitting your first research paper"}
                  </Text>
                </View>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TouchableOpacity
                    key={submission._id}
                    style={styles.submissionCard}
                    onPress={() => setSelectedSubmission(submission)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.submissionCardContent}>
                      <View style={styles.cardHeader}>
                        <View style={styles.researchIcon}>
                          <Ionicons name="document-text" size={20} color={C.primary} />
                        </View>
                        <View style={styles.researchTitleContainer}>
                          <Text style={styles.researchTitle} numberOfLines={2}>
                            {submission.title || "Untitled Submission"}
                          </Text>
                          <SubmissionHeaderBadges 
                            submission={submission}
                            onRevise={openReviseModal}
                            onDelete={handleDelete}
                          />
                        </View>
                      </View>

                      <View style={styles.authorRow}>
                        <Ionicons name="person-outline" size={16} color={C.mute} />
                        <Text style={styles.authorText}>{submission.author}</Text>
                        {" • "}
                        <Ionicons name="school-outline" size={16} color={C.mute} />
                        <Text style={styles.authorText}>{submission.adviser || "No adviser"}</Text>
                      </View>

                      {/* Abstract Preview */}
                      {submission.abstract && (
                        <Text style={styles.researchAbstract} numberOfLines={2}>
                          {submission.abstract}
                        </Text>
                      )}

                      {/* Keywords */}
                      {normalizeKeywords(submission.keywords).length > 0 && (
                        <View style={styles.keywordsContainer}>
                          {normalizeKeywords(submission.keywords).slice(0, 3).map((keyword) => (
                            <View key={keyword} style={styles.keywordTag}>
                              <Text style={styles.keywordText}>#{keyword}</Text>
                            </View>
                          ))}
                          {normalizeKeywords(submission.keywords).length > 3 && (
                            <View style={styles.keywordTag}>
                              <Text style={styles.keywordText}>+{normalizeKeywords(submission.keywords).length - 3}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <SubmissionCardButtons 
                        submission={submission}
                        onRevise={openReviseModal}
                        onDelete={handleDelete}
                        onViewFile={openStudentFile}
                        onViewDetails={() => setSelectedSubmission(submission)}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Revise Modal - Sidebar Visible (Matching View File Modal) */}
        {reviseModal && (
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              { 
                maxWidth: Math.min(contentWidth - 48, 1000),
                alignSelf: 'center',
                maxHeight: Dimensions.get('window').height * 0.95,
              }
            ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Revise Submission</Text>
                <TouchableOpacity 
                  onPress={() => setReviseModal(false)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.reviseForm}>
                  <View style={styles.reviseHelpBox}>
                    <Ionicons name="time-outline" size={18} color={C.warning} />
                    <Text style={styles.reviseHelp}>You can revise within 10 minutes after upload</Text>
                  </View>

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
                    <Text style={styles.formLabel}>Co-Authors / Members</Text>
                    <TextInput
                      value={reviseCoAuthors}
                      onChangeText={setReviseCoAuthors}
                      placeholder="e.g., Juan Dela Cruz, Maria Santos"
                      style={styles.formInput}
                      autoCapitalize="none"
                      autoCorrect={false}
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
                      autoCorrect={false}
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
                              opt === "draft" && active && { borderColor: C.warning, backgroundColor: `${C.warning}15` },
                              opt === "final" && active && { borderColor: C.success, backgroundColor: `${C.success}15` },
                            ]}
                          >
                            <Ionicons 
                              name={opt === "draft" ? "document-text-outline" : "cloud-upload-outline"} 
                              size={18} 
                              color={active ? (opt === "draft" ? "#D97706" : C.success) : C.subtle} 
                            />
                            <Text style={[
                              styles.typeOptionText,
                              active && { color: opt === "draft" ? "#92400E" : "#065F46", fontWeight: "800" }
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
                            {selectedFile ? `Selected: ${selectedFile.name}` : "Choose file (PDF, DOC, DOCX, PPT, PPTX)"}
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
            </View>
          </View>
        )}

        {/* FAB for new submission */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push("/add-research")}
        >
          <MaterialIcons name="add" size={32} color="#fff" />
        </TouchableOpacity>
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

  // Main Content Styles - UPDATED: Added position relative for modal
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

  // Metrics Section - UPDATED: Matching Faculty 3-card layout
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
    height: 120,
    flex: 1,
    minWidth: 0,
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

  // Submissions Section
  submissionsSection: {
    marginBottom: 32,
    width: '100%',
  },

  // Filter Tabs
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingRight: 24,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.surface,
    marginRight: 8,
    gap: 6,
  },
  filterTabActive: {
    borderWidth: 1,
  },
  filterTabText: {
    color: C.subtle,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
  filterTabTextActive: {
    fontWeight: '700',
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: C.ink,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },

  // Submissions List - UPDATED: Matching Faculty card style
  submissionsList: {
    gap: 12,
    width: '100%',
  },
  submissionCard: {
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
  submissionCardContent: {
    gap: 12,
  },
  cardHeader: {
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
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
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
  detailsButton: {
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
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
    fontFamily: FONTS.subheading,
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
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  finalBadge: {
    backgroundColor: '#d1fae5',
    borderColor: C.success,
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
    borderColor: C.warning,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  finalBadgeText: {
    color: '#065f46',
  },
  draftBadgeText: {
    color: '#92400e',
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: C.mute,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.inkLight,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: FONTS.heading,
  },
  emptyStateText: {
    fontSize: 14,
    color: C.mute,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.body,
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

  // Modal Styles - UPDATED: Matching Faculty Modal Structure
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
    padding: 15,
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

  // Detail Modal Content Styles - Matching Faculty
  modalPaperHeader: {
    marginBottom: 24,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  modalPaperTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 28,
    fontFamily: FONTS.heading,
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
    padding: 10,
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
  abstractFullText: {
    fontSize: 14,
    color: C.ink,
    lineHeight: 22,
    textAlign: 'justify',
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
  fileAttachmentModal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconModal: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfoModal: {
    flex: 1,
  },
  fileNameModal: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 4,
    fontFamily: FONTS.subheading,
  },
  fileActionModal: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${C.warning}15`,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: `${C.warning}30`,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    fontFamily: FONTS.body,
  },

  // Action Timers Styles - Updated to match viewButton/detailsButton style
  reviseButtonNew: {
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
  reviseButtonDisabled: {
    backgroundColor: C.surface,
    borderColor: C.border,
  },
  reviseButtonTextNew: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  deleteButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.error,
  },
  deleteButtonDisabled: {
    backgroundColor: C.surface,
    borderColor: C.border,
  },
  deleteButtonTextNew: {
    fontSize: 12,
    fontWeight: '600',
    color: C.error,
    fontFamily: FONTS.subheading,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  timerDisplayText: {
    fontSize: 12,
    color: C.mute,
    fontWeight: '600',
    fontFamily: FONTS.body,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  timerBadgeText: {
    fontSize: 10,
    color: C.mute,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },

  // Revise Modal Styles - Updated to match view file modal
  reviseForm: {
    padding: 0,
  },
  reviseHelpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${C.warning}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${C.warning}30`,
  },
  reviseHelp: {
    flex: 1,
    fontSize: 13,
    color: '#D97706',
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
    backgroundColor: C.surface,
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
    backgroundColor: C.surface,
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
    backgroundColor: C.surface,
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
    borderTopColor: C.borderLight,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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