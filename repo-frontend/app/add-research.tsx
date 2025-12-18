// app/screens/AddResearch.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getToken, removeToken } from "../lib/auth";
import api from "../lib/api";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

/** 🎨 Match Student Dashboard Theme - Green & Modern */
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
  
  // UI Elements
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  
  // Sidebar
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#10b981",
};

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

type SubType = "draft" | "final";

function normalizeKeywords(input: string): string[] {
  return input
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

// Helper function to normalize pasted text
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();
}

/* ---------- Navigation Item (Same as Student Dashboard) ---------- */
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

export default function AddResearch() {
  const params = useLocalSearchParams();
  const initialType: SubType =
    String(params?.submissionType || "").toLowerCase() === "final" ? "final" : "draft";

  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [adviser, setAdviser] = useState("");
  const [authorsInput, setAuthorsInput] = useState("");
  const [file, setFile] = useState<any>(null);
  const [submissionType, setSubmissionType] = useState<SubType>(initialType);
  const [submitting, setSubmitting] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
    const [user, setUser] = useState<any>(null);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (must match backend)
const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Navigation items
  const navItems = [
    {
      id: 'dashboard',
 icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      active: false,
      onPress: () => router.push("/(tabs)"),
    },
    {
      id: 'submissions',
      icon: 'document-text-outline',
      activeIcon: 'document-text',
      label: 'My Submissions',
      active: false,
      onPress: () => router.push("/(tabs)/submissions"),
    },
    {
      id: 'add',
      icon: 'add-circle-outline',
      activeIcon: 'add-circle',
      label: 'Add Research',
      active: true,
      onPress: () => {"/add-research"},
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

  const addKwFromInput = () => {
    const parts = normalizeKeywords(kwInput);
    if (!parts.length) return;
    setKeywords(prev => {
      const set = new Set(prev);
      parts.forEach(p => set.add(p));
      return Array.from(set);
    });
    setKwInput("");
  };

  const removeKw = (k: string) => setKeywords(prev => prev.filter(x => x !== k));

  const handleKwChange = (text: string) => {
    if (/[,|\n]$/.test(text)) {
      setKwInput(text.replace(/[,|\n]+$/g, ""));
      requestAnimationFrame(addKwFromInput);
    } else {
      setKwInput(text);
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
  const handleAbstractChange = (text: string) => {
    const lineBreaks = (text.match(/\n/g) || []).length;
    if (lineBreaks > 2) {
      setAbstract(normalizeText(text));
    } else {
      setAbstract(text);
    }
  };
useEffect(() => {
    fetchUserProfile();
  }, []);
const handleFilePick = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const selected = result.assets[0];

    // ✅ Frontend size validation (matches backend)
    if (selected.size && selected.size > MAX_FILE_SIZE) {
      Alert.alert(
        "File too large",
        "Please upload a PDF or DOCX file smaller than 25 MB."
      );
      return;
    }

    setFile(selected);
  } catch (err) {
    console.error("❌ File pick error:", err);
    Alert.alert("Error", "Failed to pick a file. Please try again.");
  }
};
const handleSubmit = async () => {
  const kwFinal = Array.from(
    new Set([
      ...keywords,
      ...normalizeKeywords(kwInput)
    ])
  );

  if (!title || !abstract || !file) {
    Alert.alert("Error", "Please fill in Title, Abstract, and attach a file.");
    return;
  }

  try {
    setSubmitting(true);
    const token = await getToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("abstract", abstract);
    formData.append("adviser", adviser);
    if (authorsInput.trim()) {
      formData.append("authors", authorsInput);
    }

    formData.append("submissionType", submissionType);

    if (kwFinal.length) formData.append("keywords", kwFinal.join(","));

    if (typeof file?.uri === "string" && file.uri.startsWith("data:")) {
      const arr = file.uri.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
      const bstr = globalThis.atob(arr[1]);
      const u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const blob = new Blob([u8], { type: mime });
      formData.append("file", blob as any, file.name || `upload.${mime.includes("pdf") ? "pdf" : "docx"}`);
    } else if (Platform.OS === "web" && typeof file?.uri === "string" && file.uri.startsWith("blob:")) {
      const resp = await fetch(file.uri);
      const blob = await resp.blob();
      const mime = file.mimeType || blob.type || "application/pdf";
      formData.append("file", blob as any, file.name || `upload.${mime.includes("pdf") ? "pdf" : "docx"}`);
    } else {
      formData.append("file", {
        uri: file.uri,
        name: file.name || "upload.pdf",
        type: file.mimeType || "application/pdf",
      } as any);
    }

    const res = await api.post("/student/upload", formData, {
      headers: { Authorization: `Bearer ${token.token}` },
    });

    console.log("✅ Upload success:", res.data);
    
    // Clear form
    setTitle("");
    setAbstract("");
    setAdviser("");
    setAuthorsInput("");
    setFile(null);
    setKwInput("");
    setKeywords([]);
    
    // Show success alert with navigation options
    setShowSuccessModal(true);


  } catch (err: any) {
    console.error("❌ Upload failed:", err?.response?.data || err);
    Alert.alert("Error", err?.response?.data?.error || "Upload failed. Please try again.");
  } finally {
    setSubmitting(false);
  }
};

  const kwHint = useMemo(
    () => (keywords.length ? `${keywords.length} keyword${keywords.length !== 1 ? 's' : ''} added` : "e.g., machine learning, gait analysis, EMG"),
    [keywords.length]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar Navigation - Matching Dashboard */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Logo and Toggle */}
        <View style={styles.sidebarHeader}>
          {!sidebarCollapsed ? (
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="school" size={28} color={C.primary} />
              </View>
              <View>
                <Text style={styles.logoText}>Research Hub</Text>
                <Text style={styles.logoSubtext}>Paper Submission</Text>
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

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Add Research</Text>
              <Text style={styles.userGreeting}>Submit new research paper</Text>
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
                  <Text style={styles.heroTitle}>
                    {submissionType === "final" ? "Submit Final Paper" : "Upload Draft Paper"}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {submissionType === "final" 
                      ? "Submit your final research paper for publishing and review"
                      : "Upload a draft for consultation and feedback from your adviser"
                    }
                  </Text>
                </View>
                <Ionicons name="document-text" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Submission Type Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Submission Type</Text>
              <Text style={styles.sectionSubtitle}>Choose between draft for consultation or final for publishing</Text>
              
              <View style={styles.toggleContainer}>
                {(["draft", "final"] as SubType[]).map((opt) => {
                  const active = submissionType === opt;
                  const isFinal = opt === "final";
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setSubmissionType(opt)}
                      style={[
                        styles.typeOption,
                        active && styles.typeOptionActive,
                        isFinal && active && { 
                          backgroundColor: `${C.success}15`, 
                          borderColor: C.success 
                        },
                        !isFinal && active && { 
                          backgroundColor: `${C.warning}15`, 
                          borderColor: C.warning 
                        },
                      ]}
                    >
                      <View style={styles.typeOptionIcon}>
                        <Ionicons 
                          name={isFinal ? "checkmark-done" : "create"} 
                          size={22} 
                          color={active ? (isFinal ? C.success : C.warning) : C.subtle} 
                        />
                      </View>
                      <View>
                        <Text style={[
                          styles.typeOptionTitle,
                          { color: active ? (isFinal ? C.success : "#92400E") : C.subtle }
                        ]}>
                          {isFinal ? "Final Paper" : "Draft Paper"}
                        </Text>
                        <Text style={styles.typeOptionDescription}>
                          {isFinal ? "For publishing" : "For consultation"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Research Details Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Research Details</Text>
              <Text style={styles.sectionSubtitle}>Enter your research information</Text>

              {/* Research Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Research Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your research title"
                  placeholderTextColor={C.subtle}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Abstract */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>
                    Abstract <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.charCount}>{abstract.length} characters</Text>
                </View>
                <Text style={styles.formHelper}>
                  Paste your abstract here. Text will be formatted automatically.
                </Text>
                <View style={styles.abstractContainer}>
                  <Text style={styles.abstractLabel}>ABSTRACT</Text>
                  <TextInput
                    style={styles.abstractInput}
                    placeholder="Write or paste your abstract here. The text will be displayed in a document-style format with proper formatting..."
                    placeholderTextColor={C.subtle}
                    value={abstract}
                    onChangeText={handleAbstractChange}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Adviser & Authors */}
              <View style={styles.twoColumn}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Adviser (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="adviser@msuiit.edu.ph"
                    placeholderTextColor={C.subtle}
                    value={adviser}
                    onChangeText={setAdviser}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>
                    Authors/Members <Text style={styles.formHelper}>(Separate with commas)</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Juan Dela Cruz, Maria Santos"
                    placeholderTextColor={C.subtle}
                    value={authorsInput}
                    onChangeText={setAuthorsInput}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Keywords Card */}
            <View style={styles.card}>
              <View style={styles.formLabelRow}>
                <View>
                  <Text style={styles.sectionTitle}>Keywords</Text>
                  <Text style={styles.sectionSubtitle}>{kwHint}</Text>
                </View>
                <View style={styles.keywordBadge}>
                  <Ionicons name="pricetags" size={16} color={C.primary} />
                  <Text style={styles.keywordBadgeText}>{keywords.length}</Text>
                </View>
              </View>

              <View style={styles.kwInputContainer}>
                <Ionicons name="add-circle-outline" size={24} color={C.primary} />
                <TextInput
                  style={styles.kwInput}
                  placeholder="Type keyword and press comma or enter..."
                  placeholderTextColor={C.subtle}
                  value={kwInput}
                  onChangeText={handleKwChange}
                  onSubmitEditing={addKwFromInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  blurOnSubmit={false}
                />
                <TouchableOpacity onPress={addKwFromInput} style={styles.addKwButton}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {keywords.length > 0 && (
                <View style={styles.kwChips}>
                  {keywords.map((k) => (
                    <View key={k} style={styles.kwChip}>
                      <Text style={styles.kwChipText}>#{k}</Text>
                      <TouchableOpacity 
                        onPress={() => removeKw(k)} 
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.removeKwButton}
                      >
                        <Ionicons name="close-circle" size={18} color={C.mute} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* File Attachment Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Attach Research File</Text>
              <Text style={styles.sectionSubtitle}>PDF or DOCX format only <Text style={styles.required}>*</Text></Text>
              
              <TouchableOpacity 
                style={[styles.fileUploadButton, file && styles.fileUploadButtonActive]} 
                onPress={handleFilePick} 
                disabled={submitting}
              >
                <View style={styles.fileUploadIcon}>
                  <Ionicons 
                    name={file ? "document-attach" : "cloud-upload-outline"} 
                    size={32} 
                    color={file ? C.success : C.primary} 
                  />
                </View>
                <View style={styles.fileUploadInfo}>
                  <Text style={[styles.fileUploadTitle, file && styles.fileUploadTitleActive]}>
                    {file ? file.name : "Choose File"}
                  </Text>
                  <Text style={styles.fileUploadSubtitle}>
                    {file ? "Tap to change file" : "Tap to browse your files"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={C.subtle} />
              </TouchableOpacity>
              
              {file && (
                <View style={styles.fileInfo}>
                  <Ionicons name="information-circle-outline" size={16} color={C.success} />
                  <Text style={styles.fileInfoText}>
                    File selected: {file.size ? `(${(file.size / 1024 / 1024).toFixed(2)} MB)` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {submissionType === "final" ? "Submit Final Paper" : "Upload Draft Paper"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
{/* ================= SUCCESS MODAL ================= */}
{showSuccessModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <View style={styles.modalIcon}>
        <Ionicons name="checkmark-circle" size={64} color={C.success} />
      </View>

      <Text style={styles.modalTitle}>Submission Successful</Text>

      <Text style={styles.modalMessage}>
        {submissionType === "final"
          ? "Your final research paper has been successfully submitted."
          : "Your draft has been uploaded successfully and is ready for review."}
      </Text>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.modalPrimary]}
          onPress={() => {
            setShowSuccessModal(false);
            router.push("/(tabs)/submissions");
          }}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.modalButtonText}>View Submissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.modalSecondary]}
          onPress={() => {
            setShowSuccessModal(false);
            // form already cleared
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color={C.primary} />
          <Text style={styles.modalSecondaryText}>Upload Another</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}

            <View style={{ height: 40 }} />
          </View>
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
  
  // Sidebar Styles (matching dashboard)
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

  // Form Container
  formContainer: {
    width: '100%',
    gap: 16,
  },

  // Card Styles
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
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
    marginBottom: 16,
  },

  // Type Selector
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 12,
  },
  typeOptionActive: {
    borderWidth: 2,
  },
  typeOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${C.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.subheading,
    marginBottom: 2,
  },
  typeOptionDescription: {
    fontSize: 13,
    color: C.subtle,
    fontFamily: FONTS.body,
  },

  // Form Elements
  formGroup: {
    marginBottom: 24,
  },
  formGroupHalf: {
    flex: 1,
    marginBottom: 24,
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formLabel: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginBottom: 8,
  },
  formHelper: {
    color: C.mute,
    fontSize: 13,
    fontFamily: FONTS.body,
    marginBottom: 12,
  },
  required: {
    color: C.error,
    fontWeight: '700',
  },
  charCount: {
    fontSize: 12,
    color: C.subtle,
    fontFamily: FONTS.body,
  },
  formInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
    fontFamily: FONTS.body,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 16,
  },

  // Abstract Container
  abstractContainer: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  abstractLabel: {
    backgroundColor: C.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    fontFamily: FONTS.subheading,
    textAlign: 'center',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  abstractInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: C.ink,
    fontFamily: FONTS.body,
    lineHeight: 22,
    minHeight: 180,
    textAlignVertical: 'top',
  },

  // Keywords
  keywordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${C.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
  },
  keywordBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    fontFamily: FONTS.subheading,
  },
  kwInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  kwInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    fontFamily: FONTS.body,
  },
  addKwButton: {
    backgroundColor: C.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kwChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  kwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${C.primary}08`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  kwChipText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: FONTS.subheading,
  },
  removeKwButton: {
    padding: 2,
  },

  // File Upload
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: C.surface,
  },
  fileUploadButtonActive: {
    borderColor: C.success,
    backgroundColor: `${C.success}08`,
    borderStyle: 'solid',
  },
  fileUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileUploadInfo: {
    flex: 1,
  },
  fileUploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 4,
    fontFamily: FONTS.subheading,
  },
  fileUploadTitleActive: {
    color: C.success,
  },
  fileUploadSubtitle: {
    fontSize: 13,
    color: C.mute,
    fontWeight: '500',
    fontFamily: FONTS.body,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: `${C.success}08`,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fileInfoText: {
    fontSize: 12,
    color: C.success,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Submit Button
  submitButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    marginTop: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    fontFamily: FONTS.subheading,
    letterSpacing: 0.3,
  },
  /* ================= SUCCESS MODAL ================= */

modalOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.45)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
},

modalCard: {
  width: "90%",
  maxWidth: 420,
  backgroundColor: C.card,
  borderRadius: 20,
  padding: 28,
  alignItems: "center",
  borderWidth: 1,
  borderColor: C.border,
  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
},

modalIcon: {
  marginBottom: 16,
},

modalTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: C.ink,
  fontFamily: FONTS.heading,
  marginBottom: 8,
  textAlign: "center",
},

modalMessage: {
  fontSize: 14,
  color: C.mute,
  fontFamily: FONTS.body,
  textAlign: "center",
  lineHeight: 20,
  marginBottom: 24,
},

modalActions: {
  width: "100%",
  gap: 12,
},

modalButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
},

modalPrimary: {
  backgroundColor: C.success,
},

modalButtonText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
  fontFamily: FONTS.subheading,
},

modalSecondary: {
  backgroundColor: `${C.primary}10`,
  borderWidth: 1,
  borderColor: `${C.primary}30`,
},

modalSecondaryText: {
  color: C.primary,
  fontSize: 15,
  fontWeight: "700",
  fontFamily: FONTS.subheading,
},

});