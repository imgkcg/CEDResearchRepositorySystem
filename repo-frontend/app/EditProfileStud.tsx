// app/screens/student/EditProfile.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import api from "../lib/api";
import { getToken, removeToken } from "../lib/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 🎨 EXACT SAME THEME AS STUDENT PROFILE - Green & Modern */
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
};

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

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

// NavItem Component - Same as student profile
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

// Info Card Component - Fixed with memoization
const InfoCard = React.memo(({ 
  icon, 
  label, 
  value, 
  editable = false, 
  onChangeText, 
  placeholder = "", 
  multiline = false 
}: any) => (
  <View style={styles.infoCard}>
    <View style={[styles.iconContainer, { backgroundColor: `${C.primary}10` }]}>
      <Ionicons name={icon} size={20} color={C.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={[styles.infoValue, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.subtle}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      ) : (
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  </View>
));

export default function StudentEditProfileScreen() {
  const { user: userParam } = useLocalSearchParams();
  
  // Parse the user object from params
  const initialUser = useMemo(() => {
    try {
      return userParam ? JSON.parse(userParam as string) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }, [userParam]);

  const [user, setUser] = useState<any>(initialUser);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Consolidated form state to minimize re-renders
  const [formData, setFormData] = useState({
    fullName: initialUser?.fullName || initialUser?.firstName || "",
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
    studentId: initialUser?.studentId || initialUser?.username || "",
    college: initialUser?.college || "",
    program: initialUser?.program || initialUser?.major || "",
    year: initialUser?.year || "",
    bio: initialUser?.bio || "",
  });

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;

  const fetchUserProfile = async () => {
    const tokenObj = await getToken();
    const bearer = tokenObj?.token || tokenObj?.user?.token;
    
    if (bearer) {
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${bearer}` }
        });
        setUser(res.data);
        // Update form fields with fresh data
        setFormData({
          fullName: res.data.fullName || res.data.firstName || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          studentId: res.data.studentId || res.data.username || "",
          college: res.data.college || "",
          program: res.data.program || res.data.major || "",
          year: res.data.year || "",
          bio: res.data.bio || "",
        });
      } catch (err) {
        console.error("Profile fetch failed", err);
        Alert.alert("Error", "Failed to load profile data");
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert("Validation Error", "Please enter your full name");
      return;
    }

    setSaving(true);

    try {
      const [firstName, ...rest] = formData.fullName.trim().split(" ");
      const lastName = rest.join(" ") || ".";

      const tokenObj = await getToken();
      const bearer = tokenObj?.token || tokenObj?.user?.token;

      const updateData: any = {
        firstName,
        lastName,
        phone: formData.phone,
        studentId: formData.studentId,
        college: formData.college,
        program: formData.program,
        year: formData.year,
        bio: formData.bio
      };

      const res = await api.put(
        "/auth/update",
        updateData,
        { headers: { Authorization: `Bearer ${bearer}` } }
      );

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1500);

    } catch (err: any) {
      console.error("Update error:", err.response?.data || err.message);
      Alert.alert(
        "Update Failed", 
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Navigation items - Student specific (exactly like student profile screen)
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
      onPress: () => router.push("/repository"),
      active: false
    },
    {
      id: 'profile',
      icon: 'person-outline',
      activeIcon: 'person',
      label: 'Profile',
      onPress: () => router.push("/profile"),
      active: true
    },
  ];

  // Action Card Component - Same as student profile screen
  const ActionCard = ({ icon, title, subtitle, onPress, color = C.primary }: any) => (
    <TouchableOpacity 
      style={[styles.actionCard, { borderColor: `${color}30` }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, { color }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  // Modal Components - Same as student profile screen
  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={60} color={C.success} />
          </View>
          <Text style={styles.modalTitle}>Profile Updated!</Text>
          <Text style={styles.modalMessage}>
            Your changes have been saved successfully.
          </Text>
        </View>
      </View>
    </Modal>
  );

  const LogoutModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconWrapper}>
          <Ionicons name="log-out-outline" size={40} color={C.error} />
        </View>
        <Text style={styles.modalTitle}>Sign Out?</Text>
        <Text style={styles.modalText}>
          You will be logged out from your account.
        </Text>
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={() => setShowLogoutModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.modalConfirmButton]}
            onPress={async () => {
              await removeToken();
              await AsyncStorage.removeItem("user");
              await AsyncStorage.removeItem("token");
              setShowLogoutModal(false);
              router.replace("/login");
            }}
          >
            <Text style={styles.modalConfirmText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed ? (
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Ionicons name="school" size={28} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.logoText}>Submission Hub</Text>
                  <Text style={styles.logoSubtext}>Edit Profile</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.collapsedLogo}>
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
        </View>
        
        <View style={[styles.mainContent, { width: contentWidth }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SuccessModal />
      {showLogoutModal && <LogoutModal />}
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar - Exactly like student profile screen */}
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
                <Text style={styles.logoSubtext}>Edit Profile</Text>
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

        {/* User Profile - Same as student profile screen */}
        {!sidebarCollapsed && (
          <TouchableOpacity 
            style={styles.userSection}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name="person-circle" size={44} color={C.primary} />
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: C.success }]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{formData.fullName || "Student"}</Text>
              <Text style={styles.userRole}>Student</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Main Navigation - Same as student profile screen */}
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

        {/* Bottom Section - Same as student profile screen */}
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

      {/* Main Content Area - Same structure as student profile screen */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Top Navigation Bar - Same as student profile screen */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Edit Profile</Text>
              <Text style={styles.userGreeting}>Update your student profile</Text>
            </View>
            
            <View style={styles.navbarActions}>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.back()}
              >
                <View style={styles.smallAvatar}>
                  <Ionicons name="arrow-back" size={18} color={C.primary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scroll Content - Same structure as student profile screen */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section - Same design as student profile screen */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={C.primaryGradient}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.heroContent}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarLarge}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                  <View style={styles.profileHeaderText}>
                    <Text style={styles.heroTitle}>Edit Student Profile</Text>
                    <Text style={styles.heroSubtitle}>
                      Update your personal and academic information
                    </Text>
                  </View>
                </View>
                <Ionicons name="settings" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Profile Information Section - Same as student profile screen but editable */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>Edit your details</Text>
            </View>
            
            <View style={styles.infoCardsContainer}>
              <InfoCard 
                icon="person-outline" 
                label="Full Name" 
                value={formData.fullName} 
                editable={true}
                onChangeText={(text: string) => setFormData({...formData, fullName: text})}
                placeholder="Enter your full name"
              />
              
              <InfoCard 
                icon="mail-outline" 
                label="Email" 
                value={formData.email}
              />
              
              <InfoCard 
                icon="call-outline" 
                label="Phone Number" 
                value={formData.phone}
                editable={true}
                onChangeText={(text: string) => setFormData({...formData, phone: text})}
                placeholder="Enter phone number"
              />
              
              <InfoCard 
                icon="id-card-outline" 
                label="Student ID" 
                value={formData.studentId}
                editable={true}
                onChangeText={(text: string) => setFormData({...formData, studentId: text})}
                placeholder="Enter your student ID"
              />
              
          
              <InfoCard 
                icon="document-text-outline" 
                label="Bio (Optional)" 
                value={formData.bio}
                editable={true}
                onChangeText={(text: string) => setFormData({...formData, bio: text})}
                placeholder="Tell us about yourself"
                multiline={true}
              />
            </View>
          </View>

          {/* Action Buttons Section - Same style as student profile screen */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Save Changes</Text>
            </View>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <LinearGradient
                  colors={saving ? [C.mute, C.subtle] : C.primaryGradient}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Ionicons name="close-circle-outline" size={20} color={C.inkLight} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Help Section - Same as student profile screen */}
            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={18} color={C.primary} />
              <Text style={styles.helpText}>
                Your information is secure and encrypted. Changes may take a few minutes to reflect across all systems.
              </Text>
            </View>
          </View>

          {/* System Info - Same as student profile screen */}
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>Version 1.0.0 • Academic Research Hub • Student Portal</Text>
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
  
  // Sidebar Styles - Same as student profile screen
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

  // Main Content Styles - Same as student profile screen
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingText: {
    marginTop: 12,
    color: C.mute,
    fontSize: 14,
    fontFamily: FONTS.body,
  },

  // Hero Section - Same as student profile screen
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  profileHeaderText: {
    flex: 1,
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

  // Section Styles - Same as student profile screen
  section: {
    marginBottom: 32,
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
  infoCardsContainer: {
    gap: 10,
  },

  // Info Card Styles - Same as student profile screen
  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: C.mute,
    marginBottom: 2,
    fontFamily: FONTS.body,
  },
  infoValue: {
    fontSize: 14,
    color: C.ink,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
    paddingVertical: 4,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },

  // Action Card Styles - Same as student profile screen
  actionsContainer: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONTS.subheading,
  },
  actionSubtitle: {
    fontSize: 12,
    color: C.mute,
    fontFamily: FONTS.body,
  },

  // Action Buttons
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.card,
    fontFamily: FONTS.heading,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    gap: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    backgroundColor: `${C.primary}08`,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
    alignItems: 'center',
    marginTop: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: C.inkLight,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },

  // System Info - Same as student profile screen
  systemInfo: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    alignItems: 'center',
  },
  systemInfoText: {
    color: C.subtle,
    fontSize: 12,
    fontFamily: FONTS.body,
  },

  // Modal Styles - Same as student profile screen
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalCard: {
    width: 320,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successIcon: {
    marginBottom: 16,
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.ink,
    fontFamily: FONTS.heading,
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalConfirmButton: {
    backgroundColor: C.error,
  },
  modalCancelText: {
    color: C.inkLight,
    fontSize: 14,
    fontFamily: FONTS.subheading,
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.subheading,
  },
});