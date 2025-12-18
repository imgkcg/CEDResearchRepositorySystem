// app/screens/faculty/submissions.tsx - UPDATED WITH "ADD FEEDBACK" BUTTON
import React, { useMemo, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator 
} from "react-native";
import { useMe } from "./useMe";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useFacultyData, normalizeType, ResearchPaper } from "./useFaculty";

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
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#2563eb",
};

const STATUS_CONFIG = {
  pending: { 
    color: C.warning, 
    bg: "#fef3c7", 
    icon: "time-outline",
    lightBg: "#fffbeb" 
  },
  approved: { 
    color: C.success, 
    bg: "#d1fae5", 
    icon: "checkmark-circle-outline",
    lightBg: "#ecfdf5" 
  },
  rejected: { 
    color: C.error, 
    bg: "#fee2e2", 
    icon: "close-circle-outline",
    lightBg: "#fef2f2" 
  },
};

type StatusFilter = "all" | "approved" | "rejected" | "pending";

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

export default function FacultySubmissions() {
  const { studentSubs, onRefresh, openFile, reviewSubmission } = useFacultyData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // NEW: Track which submissions have expanded feedback
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({});
  
  const { name } = useMe();
  
  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  // Navigation items
  const navItems = [
    {
      id: 'dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      onPress: () => router.push("/faculty"),
      active: false
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
      badge: studentSubs.filter(s => s.status === "pending").length > 0,
      onPress: () => {},
      active: true
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

  // Status counts
  const statusCounts = useMemo(() => ({
    approved: studentSubs.filter(s => s.status === "approved").length,
    rejected: studentSubs.filter(s => s.status === "rejected").length,
    pending: studentSubs.filter(s => s.status === "pending").length,
    all: studentSubs.length,
  }), [studentSubs]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return studentSubs.filter((sub) => {
      // Status filter
      const statusOk = statusFilter === "all" ? true : sub.status === statusFilter;
      if (!statusOk) return false;

      // Search filter
      if (!query) return true;

      const type = normalizeType(sub);
      const keywords = (sub.keywords || []).join(" ").toLowerCase();
      const coAuthors = (sub.coAuthors || []).join(" ").toLowerCase();

      return (
        sub.title.toLowerCase().includes(query) ||
        (sub.author || "").toLowerCase().includes(query) ||
        coAuthors.includes(query) ||
        sub.status.toLowerCase().includes(query) ||
        type.includes(query) ||
        keywords.includes(query)
      );
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
  }, [searchQuery, statusFilter, sortBy, studentSubs]);

  // NEW: Toggle feedback expansion
  const toggleFeedbackExpansion = (paperId: string) => {
    setExpandedFeedback(prev => ({
      ...prev,
      [paperId]: !prev[paperId]
    }));
  };

  const reviewPaper = async (paper: ResearchPaper, decision: "approved" | "rejected") => {
    await reviewSubmission(paper, decision, comments[paper._id] || "");
    setComments(prev => ({ ...prev, [paper._id]: "" }));
    // NEW: Collapse feedback after review
    setExpandedFeedback(prev => ({ ...prev, [paper._id]: false }));
    onRefresh();
    setSelectedPaper(null);
  };

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
                <Text style={styles.logoSubtext}>Student Works</Text>
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
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Submission Detail Modal */}
        {selectedPaper && (
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
                  onPress={() => setSelectedPaper(null)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <SubmissionDetailContent
                  paper={selectedPaper}
                  comment={comments[selectedPaper._id] || ""}
                  onCommentChange={(text) => setComments(prev => ({ ...prev, [selectedPaper._id]: text }))}
                  onApprove={() => reviewPaper(selectedPaper, "approved")}
                  onReject={() => reviewPaper(selectedPaper, "rejected")}
                  onOpenFile={() => openFile(selectedPaper)}
                />
              </ScrollView>
            </View>
          </View>
        )}

        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Student Works</Text>
              <Text style={styles.userGreeting}>Review Student Submissions</Text>
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
                  <Text style={styles.heroTitle}>Student Submissions</Text>
                  <Text style={styles.heroSubtitle}>
                    Review, approve, or reject student research papers with feedback
                  </Text>
                </View>
                <Ionicons name="people" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Stats Section */}
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
              {/* Total Submissions */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="documents" size={22} color={C.primary} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.primary }]}>
                    {statusCounts.all}
                  </Text>
                  <Text style={styles.metricLabel}>Total Submissions</Text>
                </View>
              </View>

              {/* Pending */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="time" size={22} color={C.warning} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.warning }]}>
                    {statusCounts.pending}
                  </Text>
                  <Text style={styles.metricLabel}>Pending Review</Text>
                </View>
              </View>

              {/* Approved */}
              <View style={styles.statItem}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="checkmark-circle" size={22} color={C.success} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.success }]}>
                    {statusCounts.approved}
                  </Text>
                  <Text style={styles.metricLabel}>Approved</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Search and Filter Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
                {/* Search input on left */}
                <View style={styles.searchInputContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search submissions..."
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
                  {/* Status Filter */}
                  <View style={styles.filterGroupHorizontal}>
                    <Ionicons name="filter" size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <View style={styles.filterButtons}>
                      {(["all", "pending", "approved", "rejected"] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setStatusFilter(type)}
                          style={[
                            styles.filterButton,
                            statusFilter === type && styles.filterButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.filterButtonText,
                            statusFilter === type && styles.filterButtonTextActive
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
                {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching submissions found" : "No student submissions yet"}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery ? "Try different search terms" : "Student submissions will appear here once uploaded"}
              </Text>
            </View>
          ) : (
            <View style={styles.submissionsList}>
              {filteredSubmissions.map((item) => {
                const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                const isFinal = normalizeType(item) === "final";
                const isPending = item.status === "pending";
                const isExpanded = expandedFeedback[item._id] || false;

                return (
                  <View key={item._id} style={styles.submissionCard}>
                    {/* Header with Status and Type */}
                    <View style={styles.cardHeader}>
                      <View style={styles.researchIcon}>
                        <Ionicons name="document-text" size={20} color="#2563eb" />
                      </View>
                      <View style={styles.researchTitleContainer}>
                        <Text style={styles.researchTitle}>{item.title}</Text>
                        <View style={styles.headerBadges}>
                          <StatusBadge 
                            status={item.status as keyof typeof STATUS_CONFIG} 
                            statusConfig={statusConfig} 
                          />
                          <TypeBadge isFinal={isFinal} />
                        </View>
                      </View>
                    </View>

                    {/* Author */}
                    <View style={styles.authorRow}>
                      <Ionicons name="person-outline" size={16} color={C.mute} />
                      <Text style={styles.authorText}>{item.author}</Text>
                    </View>

                    {/* Co-authors */}
                    {item.coAuthors && item.coAuthors.length > 0 && (
                      <View style={[styles.authorRow, { marginTop: 4 }]}>
                        <Ionicons name="people-outline" size={16} color={C.mute} />
                        <Text style={[styles.authorText, { fontStyle: 'italic' }]}>
                          Co-authors: {item.coAuthors.join(", ")}
                        </Text>
                      </View>
                    )}

                    {/* Abstract Preview */}
                    <Text style={styles.researchAbstract} numberOfLines={2}>
                      {item.abstract}
                    </Text>

                    {/* Keywords */}
                    {item.keywords && item.keywords.length > 0 && (
                      <View style={styles.keywordsContainer}>
                        {item.keywords.map((keyword) => (
                          <View key={keyword} style={styles.keywordTag}>
                            <Text style={styles.keywordText}>#{keyword}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.researchFooter}>
                      <Text style={styles.researchDate}>
                        Submitted: {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                      
                      <View style={styles.actionButtons}>
                        {item.fileName ? (
                          <TouchableOpacity onPress={() => openFile(item)} style={styles.viewButton}>
                            <Ionicons name="attach-outline" size={16} color="#2563EB" />
                            <Text style={styles.viewButtonText}>View File</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.viewButtonDisabled}>
                            <Ionicons name="attach-outline" size={16} color="#94A3B8" />
                            <Text style={[styles.viewButtonText, { color: "#94A3B8" }]}>No File</Text>
                          </View>
                        )}

                        {/* NEW: Add Feedback Button - Only for pending submissions */}
                        {isPending && (
                          <TouchableOpacity 
                            onPress={() => toggleFeedbackExpansion(item._id)} 
                            style={[
                              styles.feedbackButton,
                              isExpanded && styles.feedbackButtonActive
                            ]}
                          >
                            <Ionicons 
                              name={isExpanded ? "chatbubble-ellipses" : "chatbubble-outline"} 
                              size={16} 
                              color={isExpanded ? "#fff" : C.accent} 
                            />
                            <Text style={[
                              styles.feedbackButtonText,
                              isExpanded && styles.feedbackButtonTextActive
                            ]}>
                              {isExpanded ? "Hide Feedback" : "Add Feedback"}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                          onPress={() => setSelectedPaper(item)} 
                          style={styles.detailsButton}
                        >
                          <Ionicons name="eye-outline" size={16} color="#0f766e" />
                          <Text style={styles.detailsButtonText}>Full Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Feedback Input - Only show when expanded for pending submissions */}
                    {isPending && isExpanded && (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>Your Feedback</Text>
                        <View style={styles.commentBox}>
                          <TextInput
                            placeholder="Add comments, suggestions, or feedback…"
                            value={comments[item._id] || ""}
                            onChangeText={(text) => setComments(prev => ({ ...prev, [item._id]: text }))}
                            placeholderTextColor={C.subtle}
                            style={styles.commentInput}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                          />
                        </View>
                        
                        {/* Action Buttons */}
                        <View style={styles.reviewButtons}>
                          <TouchableOpacity
                            style={[styles.reviewButton, styles.approveButton]}
                            onPress={() => reviewPaper(item, "approved")}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                            <Text style={styles.reviewButtonText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.reviewButton, styles.rejectButton]}
                            onPress={() => reviewPaper(item, "rejected")}
                          >
                            <Ionicons name="close-circle" size={16} color="#ffffff" />
                            <Text style={styles.reviewButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

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

function StatusBadge({ 
  status, 
  statusConfig 
}: { 
  status: keyof typeof STATUS_CONFIG; 
  statusConfig: typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG];
}) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
      <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
      <Text style={[styles.statusText, { color: statusConfig.color }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
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

function SubmissionDetailContent({
  paper,
  comment,
  onCommentChange,
  onApprove,
  onReject,
  onOpenFile
}: {
  paper: ResearchPaper;
  comment: string;
  onCommentChange: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onOpenFile: () => void;
}) {
  const statusConfig = STATUS_CONFIG[paper.status as keyof typeof STATUS_CONFIG];
  const isFinal = normalizeType(paper) === "final";
  const isPending = paper.status === "pending";

  return (
    <>
      {/* Paper Header */}
      <View style={styles.modalPaperHeader}>
        <View style={styles.modalHeaderTop}>
          <View style={[styles.modalStatusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.modalStatusText, { color: statusConfig.color }]}>
              {paper.status.toUpperCase()}
            </Text>
          </View>
          <TypeBadge isFinal={isFinal} />
        </View>
        
        <Text style={styles.modalTitle}>{paper.title}</Text>
      </View>

      {/* Author Information */}
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
          
          {paper.coAuthors && paper.coAuthors.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Co-Authors</Text>
                <Text style={styles.infoValue}>{paper.coAuthors.join(", ")}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Abstract */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Abstract</Text>
        <View style={styles.detailSectionContent}>
          <Text style={styles.abstractFullText}>{paper.abstract}</Text>
        </View>
      </View>

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Keywords</Text>
          <View style={styles.keywordsModalContainer}>
            {paper.keywords.map((keyword) => (
              <View key={keyword} style={styles.keywordChipModal}>
                <Text style={styles.keywordTextModal}>#{keyword}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* File Attachment */}
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

      {/* Feedback Section - Only show for pending submissions */}
      {isPending && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Your Feedback</Text>
          <View style={styles.detailSectionContent}>
            <View style={styles.commentBoxModal}>
              <TextInput
                placeholder="Add detailed comments, suggestions, or feedback for the student…"
                value={comment}
                onChangeText={onCommentChange}
                placeholderTextColor={C.subtle}
                style={styles.commentInputModal}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons - Only show for pending submissions */}
      {isPending ? (
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalActionButton, styles.modalApproveButton]}
            onPress={onApprove}
          >
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.modalActionButtonText}>Approve Submission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalActionButton, styles.modalRejectButton]}
            onPress={onReject}
          >
            <Ionicons name="close-circle" size={18} color="#ffffff" />
            <Text style={styles.modalActionButtonText}>Reject Submission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.modalAlreadyReviewed}>
          {/* Status info for already reviewed submissions */}
        </View>
      )}
    </>
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

  // Metrics Section
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

  // Search and Filter Section
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

  // Submissions List
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
  },
  authorRow: {
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
  
  // NEW: Feedback Button Styles
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${C.accent}15`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.accent,
  },
  feedbackButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accentDark || '#d97706',
  },
  feedbackButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.accent,
    fontFamily: FONTS.subheading,
  },
  feedbackButtonTextActive: {
    color: '#ffffff',
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

  // Feedback Container
  feedbackContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  commentBox: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentInput: {
    fontSize: 14,
    color: C.ink,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: FONTS.body,
  },

  // Review Buttons
  reviewButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: C.success,
  },
  rejectButton: {
    backgroundColor: C.error,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: FONTS.subheading,
  },

  // Already Reviewed Section
  alreadyReviewed: {
    marginTop: 16,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  reviewedText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  reviewedMessage: {
    fontSize: 12,
    color: C.mute,
    lineHeight: 16,
    fontFamily: FONTS.body,
  },

  // Type Badge
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
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

  // Detail Modal Content Styles
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
  modalTitle: {
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
  commentBoxModal: {
    minHeight: 100,
  },
  commentInputModal: {
    fontSize: 14,
    color: C.ink,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: FONTS.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  modalApproveButton: {
    backgroundColor: C.success,
  },
  modalRejectButton: {
    backgroundColor: C.error,
  },
  modalActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: FONTS.subheading,
  },
  modalAlreadyReviewed: {
    marginTop: 16,
    padding: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  modalReviewedText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.subheading,
  },
  modalReviewedMessage: {
    fontSize: 13,
    color: C.inkLight,
    lineHeight: 18,
    fontFamily: FONTS.body,
  },
});