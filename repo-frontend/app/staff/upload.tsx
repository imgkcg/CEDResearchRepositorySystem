// app/screens/staff/upload.tsx - UPDATED TO MATCH FACULTY MODAL
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Dimensions,
  StatusBar,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../lib/api";
import { getToken } from "../../lib/auth";
import { router } from "expo-router";

/** 🎨 Professional Academic Theme - Matching Staff Dashboard */
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
  info: "#3b82f6",
  
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#2563eb",
};

const { width, height } = Dimensions.get("window");
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

type ApprovedItem = {
  _id: string;
  title?: string;
  author?: string;
  coAuthors?: string[];
  updatedAt?: string;
  fileName?: string;
  visibility?: string;
  embargoUntil?: string | null;
  keywords?: string[] | string;
  abstract?: string;
  year?: string | number;
};

export default function StaffUploadScreen() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [approvedList, setApprovedList] = useState<ApprovedItem[]>([]);
  const [selected, setSelected] = useState<ApprovedItem | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coAuthors, setCoAuthors] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState<any>(null);
  // Fields
  const [file, setFile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [keywords, setKeywords] = useState("");
  const [abstract, setAbstract] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  const fetchApproved = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("Authentication token not found.");
      const res = await api.get("/faculty/approved-list", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      setApprovedList(res.data || []);
    } catch (err: any) {
      console.error("❌ Fetch approved list failed:", err);
      Alert.alert("Error", "Failed to load approved research.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);
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
  // Filter approved list based on search
  const filteredApprovedList = useMemo(() => {
    if (!searchQuery.trim()) return approvedList;
    
    const query = searchQuery.toLowerCase();
    return approvedList.filter(item => {
      return (
        (item.title?.toLowerCase().includes(query)) ||
        (item.author?.toLowerCase().includes(query)) ||
        (item.coAuthors?.some(author => author.toLowerCase().includes(query))) ||
        (Array.isArray(item.keywords) && 
          item.keywords.some(keyword => keyword.toLowerCase().includes(query))) ||
        (typeof item.keywords === 'string' && 
          item.keywords.toLowerCase().includes(query))
      );
    });
  }, [approvedList, searchQuery]);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setFile(result.assets[0]);
    } catch (err) {
      console.error("❌ File pick error:", err);
      Alert.alert("Error", "Failed to pick file. Try again.");
    }
  };

  const filePartFromPickerAsset = async (asset: any): Promise<any> => {
    const fallbackName = (asset?.name && String(asset.name)) || "document.pdf";
    const ensuredName = fallbackName.toLowerCase().endsWith(".pdf")
      ? fallbackName
      : `${fallbackName}.pdf`;

    if (Platform.OS === "web") {
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      const pdfBlob = blob.type === "application/pdf" ? blob : blob.slice(0, blob.size, "application/pdf");
      return new File([pdfBlob], ensuredName, { type: "application/pdf" });
    }

    return {
      uri: asset.uri,
      name: ensuredName,
      type: asset.mimeType || "application/pdf",
    } as any;
  };

  const isNonEmpty = (v: any) =>
    typeof v === "string" ? v.trim().length > 0 : v !== undefined && v !== null;

  const openModal = async (paper?: ApprovedItem) => {
    if (paper) {
      setManualMode(false);
      setSelected(paper);
      setSourceId(paper._id);
      setFile(null);

      // Prefill from list item
      setTitle(paper.title || "");
      setAuthor(paper.author || "");
      setCoAuthors(paper.coAuthors?.join(", ") || "");
      setYear(isNonEmpty(paper.year) ? String(paper.year) : "");
      setKeywords(
        Array.isArray(paper.keywords)
          ? paper.keywords.join(", ")
          : (typeof (paper as any).keywords === "string" ? (paper as any).keywords : "")
      );
      setAbstract(isNonEmpty(paper.abstract) ? (paper.abstract as string) : "");

      // Fetch detail
      try {
        const token = await getToken();
        const { data } = await api.get(`/faculty/approved/${paper._id}`, {
          headers: { Authorization: `Bearer ${token?.token}` },
        });

        if (Array.isArray(paper.coAuthors) && paper.coAuthors.length) {
          setCoAuthors(paper.coAuthors.join(", "));
        } else {
          setCoAuthors("");
        }

        if (isNonEmpty(data?.title)) setTitle(data.title);
        if (isNonEmpty(data?.author)) setAuthor(data.author);
        if (isNonEmpty(data?.year)) setYear(String(data.year));
        if (Array.isArray(data?.keywords) && data.keywords.length) {
          setKeywords(data.keywords.join(", "));
        } else if (typeof data?.keywords === "string" && data.keywords.trim()) {
          setKeywords(data.keywords);
        }
        if (isNonEmpty(data?.abstract)) setAbstract(data.abstract);
      } catch (err) {
        console.error("❌ approved/:id fetch failed", err);
      }
    } else {
      // Manual upload
      setManualMode(true);
      setSelected(null);
      setSourceId(null);
      setFile(null);
      setTitle("");
      setAuthor("");
      setCoAuthors("");
      setYear("");
      setKeywords("");
      setAbstract("");
    }
  };

  const viewApproved = async () => {
    try {
      if (!sourceId) return;
      const token = await getToken();
      const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
      const res = await fetch(`${base}/research/file/${sourceId}/signed`, {
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
        Alert.alert("PDF Link", url);
      }
    } catch (e: any) {
      console.error("❌ Signed link error:", e);
      Alert.alert("Error", e?.message || "Failed to open file.");
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !author.trim()) {
      Alert.alert("Error", "Please fill the Title and Author fields.");
      return;
    }

    try {
      setUploading(true);
      const token = await getToken();

      if (!manualMode && sourceId) {
        const res = await api.post(
          "/research/upload-from-approved",
          { sourceId, title, author, coAuthors, year, keywords, abstract },
          { headers: { Authorization: `Bearer ${token.token}` } }
        );

        setApprovedList((prev) => prev.filter((x) => x._id !== sourceId));

        Alert.alert("✅ Success", "Faculty-approved file attached successfully!", [
          {
            text: "OK",
            onPress: () => {
              const createdId = String(res?.data?._id || "");
              // After staff attaches/imports the faculty-approved FINAL, open Publishing for metadata/taxonomy.
              if (createdId) {
                router.replace({ pathname: "/staff/publishing", params: { id: createdId } });
              } else {
                router.replace("/staff/publishing");
              }
            },
          },
        ]);
      } else {
        if (!file) {
          Alert.alert("Error", "Please attach a PDF file for manual upload.");
          return;
        }

        const filePart = await filePartFromPickerAsset(file);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("author", author);
        formData.append("coAuthors", coAuthors);
        formData.append("year", year);
        formData.append("keywords", keywords);
        formData.append("abstract", abstract);
        formData.append("file", filePart);

        const res = await api.post("/research/upload", formData, {
          headers: { Authorization: `Bearer ${token.token}` },
        });

        Alert.alert("✅ Success", "Legacy research uploaded successfully!", [
          { text: "OK", onPress: () => router.replace("/staff") },
        ]);
      }

      // Reset
      setSelected(null);
      setManualMode(false);
      setSourceId(null);
      setFile(null);
      setTitle("");
      setAuthor("");
      setCoAuthors("");
      setYear("");
      setKeywords("");
      setAbstract("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to upload research.";
      console.error("❌ Upload failed:", err?.response?.data || err);
      Alert.alert("Error", msg);
    } finally {
      setUploading(false);
    }
  };

  // Navigation items matching staff dashboard
  const navItems = [
    {
      id: 'dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      onPress: () => router.push("/staff"),
    },
    {
      id: 'upload',
      icon: 'cloud-upload-outline',
      activeIcon: 'cloud-upload',
      label: 'Upload PDFs',
      active: true,
      onPress: () => {},
    },
    {
      id: 'publishing',
      icon: 'pricetags-outline',
      activeIcon: 'pricetags',
      label: 'Publishing',
      onPress: () => router.push("/staff/publishing"),
    },
    {
      id: 'repository',
      icon: 'library-outline',
      activeIcon: 'library',
      label: 'Repository',
      onPress: () => router.push("/repository/staff"),
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      onPress: () => router.push("/staff/profile"),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ color: C.mute, marginTop: 10 }}>Loading approved research...</Text>
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
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Upload Modal - EXACTLY LIKE FACULTY PAGE */}
        {(selected || manualMode) && (
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              { 
                maxWidth: Math.min(contentWidth - 48, 800),
                alignSelf: 'center',
                maxHeight: Dimensions.get('window').height * 0.85,
              }
            ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {manualMode ? "Upload Legacy Research" : "Upload Faculty-Approved PDF"}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSelected(null);
                    setManualMode(false);
                    setSourceId(null);
                    setFile(null);
                    setCoAuthors("");
                  }} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={C.mute} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* PDF Preview */}
                {!manualMode && sourceId && (
                  <TouchableOpacity 
                    style={styles.viewPdfButton}
                    onPress={viewApproved}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.viewPdfText}>Preview Approved PDF</Text>
                  </TouchableOpacity>
                )}

                {/* File Picker for manual mode */}
                {manualMode && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.label}>PDF File *</Text>
                    <TouchableOpacity 
                      style={styles.filePicker}
                      onPress={handleFilePick}
                    >
                      <View style={styles.filePickerContent}>
                        <Ionicons name="cloud-upload-outline" size={24} color={C.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.filePickerTitle}>
                            {file ? "File Selected" : "Select PDF File"}
                          </Text>
                          <Text style={styles.filePickerSubtitle}>
                            {file ? file.name : "Click to choose a PDF document"}
                          </Text>
                        </View>
                        <Ionicons 
                          name={file ? "checkmark-circle" : "chevron-forward"} 
                          size={20} 
                          color={file ? C.success : C.subtle} 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Metadata Form */}
                <Text style={styles.label}>Title *</Text>
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

                <Text style={styles.label}>Author *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter author name"
                    style={styles.input}
                    value={author}
                    onChangeText={setAuthor}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Co-Authors</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="people-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="Separate names with commas"
                    style={styles.input}
                    value={coAuthors}
                    onChangeText={setCoAuthors}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.label}>Year</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="calendar-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                      <TextInput
                        placeholder="e.g., 2024"
                        style={styles.input}
                        value={year}
                        onChangeText={setYear}
                        keyboardType="numeric"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>Keywords</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="pricetags-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    placeholder="e.g., biomechanics, gait, EMG"
                    style={styles.input}
                    value={keywords}
                    onChangeText={setKeywords}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <Text style={styles.label}>Abstract</Text>
                <View style={[styles.inputWrap, { height: 140, alignItems: "flex-start" }]}>
                  <Ionicons name="create-outline" size={20} color="#64748b" style={{ marginTop: 12, marginRight: 10 }} />
                  <TextInput
                    placeholder="Enter abstract/summary"
                    style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                    value={abstract}
                    onChangeText={setAbstract}
                    multiline
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    disabled={uploading}
                    onPress={handleUpload}
                    style={[styles.modalPrimaryButton, uploading && { opacity: 0.6 }]}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={18} color="#fff" />
                        <Text style={styles.modalPrimaryButtonText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelected(null);
                      setManualMode(false);
                      setSourceId(null);
                      setFile(null);
                      setCoAuthors("");
                    }}
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
              <Text style={styles.welcomeText}>Upload Research</Text>
              <Text style={styles.userGreeting}>
                Upload faculty-approved or legacy research papers
              </Text>
            </View>
            
            <View style={styles.navbarActions}>
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
                  <Text style={styles.heroTitle}>Upload Research</Text>
                  <Text style={styles.heroSubtitle}>
                    Add faculty-approved papers or upload legacy research to the repository
                  </Text>
                </View>
                <Ionicons name="cloud-upload" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* LEGACY RESEARCH UPLOAD SECTION - MOVED BEFORE FACULTY-APPROVED */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Legacy Research Upload</Text>
              <Text style={styles.sectionSubtitle}>
                Upload research papers that were accepted before the system existed
              </Text>
            </View>
            
            <View style={styles.manualUploadCard}>
              <View style={styles.manualIcon}>
                <Ionicons name="archive-outline" size={32} color={C.primary} />
              </View>
              <View style={styles.manualContent}>
                <Text style={styles.manualTitle}>Upload Legacy PDF</Text>
                <Text style={styles.manualDescription}>
                  For research papers that were previously accepted but need to be added to the digital repository
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.manualButton}
                onPress={() => openModal()}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.manualButtonText}>Upload Legacy Paper</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FACULTY-APPROVED RESEARCH SECTION - MOVED AFTER LEGACY */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Faculty-Approved Research</Text>
              <Text style={styles.sectionSubtitle}>
                Select from approved faculty submissions to add to the repository
              </Text>
            </View>

            {/* SEARCH BAR FOR FACULTY-APPROVED RESEARCH */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Search approved research..."
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
              {searchQuery && (
                <Text style={styles.searchResults}>
                  {filteredApprovedList.length} result{filteredApprovedList.length !== 1 ? 's' : ''} found
                </Text>
              )}
            </View>

            {filteredApprovedList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color={C.subtle} />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No matching research found" : "No approved research available"}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery 
                    ? "Try different search terms" 
                    : "Faculty-approved papers will appear here once they're ready for publishing"}
                </Text>
              </View>
            ) : (
              <View style={styles.researchGrid}>
                {filteredApprovedList.map((r) => (
                  <TouchableOpacity 
                    key={r._id} 
                    style={styles.researchCard}
                    onPress={() => openModal(r)}
                  >
                    <View style={styles.researchIcon}>
                      <Ionicons name="document-text" size={20} color={C.primary} />
                    </View>
                    <View style={styles.researchContent}>
                      <Text style={styles.researchTitle} numberOfLines={2}>
                        {r.title || "Untitled"}
                      </Text>
                      <Text style={styles.researchAuthor}>
                        {r.author || "Unknown author"}
                      </Text>
                      
                      {!!r.coAuthors?.length && (
                        <Text style={styles.researchCoAuthors}>
                          Co-authors: {r.coAuthors.join(", ")}
                        </Text>
                      )}
                      
                      <View style={styles.researchFooter}>
                        <View style={styles.badge}>
                          <Ionicons name="checkmark-circle" size={12} color={C.success} />
                          <Text style={styles.badgeText}>Approved</Text>
                        </View>
                        <Text style={styles.researchDate}>
                          {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

  // Section Styles
  section: {
    marginBottom: 32,
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 16,
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

  // Search Container
  searchContainer: {
    marginBottom: 20,
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
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.ink,
    fontFamily: FONTS.body,
  },
  searchResults: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    textAlign: 'right',
  },

  // Research Grid
  researchGrid: {
    gap: 12,
  },
  researchCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    gap: 12,
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
  researchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchContent: {
    flex: 1,
  },
  researchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONTS.subheading,
    marginBottom: 4,
  },
  researchAuthor: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    marginBottom: 4,
  },
  researchCoAuthors: {
    fontSize: 12,
    color: C.subtle,
    fontStyle: 'italic',
    fontFamily: FONTS.body,
    marginBottom: 8,
  },
  researchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${C.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.success,
    fontFamily: FONTS.subheading,
  },
  researchDate: {
    fontSize: 12,
    color: C.subtle,
    fontFamily: FONTS.body,
  },

  // Empty State
  emptyState: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
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

  // Manual Upload Card
  manualUploadCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  manualIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualContent: {
    flex: 1,
  },
  manualTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    marginBottom: 6,
  },
  manualDescription: {
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },
  manualButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Modal Styles - EXACTLY LIKE FACULTY PAGE
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
    justifyContent: 'flex-end',
  },
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

  // File Picker
  filePicker: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONTS.subheading,
    marginBottom: 2,
  },
  filePickerSubtitle: {
    fontSize: 12,
    color: C.mute,
    fontFamily: FONTS.body,
  },

  // View PDF Button
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  viewPdfText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },
});