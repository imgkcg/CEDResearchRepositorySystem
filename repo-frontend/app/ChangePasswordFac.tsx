// app/screens/faculty/ChangePin.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import api from "../lib/api";
import { getToken, removeToken } from "../lib/auth";

/** 🎨 Professional Academic Theme - Exact match with faculty profile */
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
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  sidebarBg: "#ffffff",
  sidebarActive: "#f1f5f9",
  sidebarText: "#64748b",
  sidebarTextActive: "#2563eb",
};

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

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

// NavItem Component - Same as faculty profile
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

// PIN Input Field Component - Same as staff
const PinInputField = React.memo(
  ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    showPin, 
    toggleShow,
    editable = true 
  }: any) => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputWrapper, !editable && styles.disabledInput]}>
          <View style={styles.inputIcon}>
            <Ionicons name="lock-closed" size={20} color={editable ? C.primary : C.mute} />
          </View>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={C.subtle}
            secureTextEntry={!showPin}
            keyboardType="number-pad"
            maxLength={6}
            editable={editable}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={toggleShow}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPin ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={C.mute}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

export default function FacultyChangePinScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // PIN states
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  // Show PIN states
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      } catch (err) {
        console.error("Profile fetch failed", err);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const handleChangePin = async () => {
    // Validation
    if (!oldPin || !newPin || !confirmPin) {
      Alert.alert("Validation Error", "All fields are required.");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("Validation Error", "New PINs do not match.");
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      Alert.alert("Validation Error", "New PIN must be exactly 6 digits.");
      return;
    }

    if (oldPin === newPin) {
      Alert.alert("Validation Error", "New PIN must be different from old PIN.");
      return;
    }

    setSaving(true);

    try {
      const tokenObj = await getToken();
      const bearer = tokenObj?.token || tokenObj?.user?.token;

      const res = await api.put(
        "/auth/change-password",
        { oldPin, newPin },
        { headers: { Authorization: `Bearer ${bearer}` } }
      );

      // Show success modal
      setShowSuccessModal(true);
      
      // Clear fields
      setOldPin("");
      setNewPin("");
      setConfirmPin("");

      // Auto logout after successful PIN change for security
      setTimeout(() => {
        setShowSuccessModal(false);
        Alert.alert(
          "Security Notice",
          "For security reasons, you will be logged out. Please login again with your new PIN.",
          [
            {
              text: "OK",
              onPress: async () => {
                await removeToken();
                router.replace("/login");
              }
            }
          ]
        );
      }, 2000);

    } catch (err: any) {
      console.error("PIN change error:", err.response?.data || err.message);
      Alert.alert(
        "Update Failed", 
        err.response?.data?.error || "Failed to change PIN. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Navigation items - Faculty specific (exactly like faculty profile screen)
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

  // Modal Components - Same as faculty profile screen
  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconWrapper}>
            <Ionicons name="checkmark-circle" size={40} color={C.success} />
          </View>
          <Text style={styles.modalTitle}>PIN Updated!</Text>
          <Text style={styles.modalText}>
            Your security PIN has been changed successfully.
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
          You will be logged out from your faculty account.
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

  return (
    <View style={styles.container}>
      <SuccessModal />
      {showLogoutModal && <LogoutModal />}
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar - Exactly like faculty profile screen */}
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
                <Text style={styles.logoSubtext}>Change PIN</Text>
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

        {/* User Profile - Same as faculty profile screen */}
        {!sidebarCollapsed && (
          <TouchableOpacity 
            style={styles.userSection}
            onPress={() => router.push("/faculty/profile")}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name="person-circle" size={44} color={C.primary} />
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: C.success }]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.fullName || "Professor"}</Text>
              <Text style={styles.userRole}>Faculty</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Main Navigation - Same as faculty profile screen */}
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

        {/* Bottom Section - Same as faculty profile screen */}
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

      {/* Main Content Area - Same structure as faculty profile screen */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Top Navigation Bar - Same as faculty profile screen */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Change PIN</Text>
              <Text style={styles.userGreeting}>Update your security PIN</Text>
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

        {/* Scroll Content - Same structure as faculty profile screen */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section - Same design as faculty profile screen */}
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
                    <Ionicons name="shield-checkmark" size={40} color="#fff" />
                  </View>
                  <View style={styles.profileHeaderText}>
                    <Text style={styles.heroTitle}>Security PIN</Text>
                    <Text style={styles.heroSubtitle}>
                      Change your 6-digit security PIN
                    </Text>
                  </View>
                </View>
                <Ionicons name="lock-closed" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* PIN Form Section - Same structure */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Change Security PIN</Text>
              <Text style={styles.sectionSubtitle}>Update your account PIN</Text>
            </View>
            
            <View style={styles.formCard}>
              <PinInputField
                label="Current PIN"
                value={oldPin}
                onChangeText={setOldPin}
                placeholder="Enter current 6-digit PIN"
                showPin={showOldPin}
                toggleShow={() => setShowOldPin((v) => !v)}
              />

              <View style={styles.divider} />

              <PinInputField
                label="New PIN"
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new 6-digit PIN"
                showPin={showNewPin}
                toggleShow={() => setShowNewPin((v) => !v)}
              />

              <PinInputField
                label="Confirm New PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new 6-digit PIN"
                showPin={showConfirmPin}
                toggleShow={() => setShowConfirmPin((v) => !v)}
              />

              {/* Security Requirements - Same as staff */}
              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>PIN Requirements</Text>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                  <Text style={styles.requirementText}>Must be exactly 6 digits</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                  <Text style={styles.requirementText}>Use numbers only (0-9)</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="alert-circle" size={16} color={C.warning} />
                  <Text style={styles.requirementText}>Avoid sequential numbers</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="alert-circle" size={16} color={C.warning} />
                  <Text style={styles.requirementText}>Don't reuse old PINs</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons - Same style as faculty profile screen */}
          <View style={styles.section}>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleChangePin}
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
                      <Text style={styles.saveButtonText}>Updating...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Update PIN</Text>
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

            {/* Security Notice - Same style */}
            <View style={styles.securityNotice}>
              <Ionicons name="information-circle-outline" size={18} color={C.warning} />
              <Text style={styles.securityNoticeText}>
                For security, you'll be logged out after changing PIN. Login again with new PIN.
              </Text>
            </View>
          </View>

          {/* System Info - Same as faculty profile screen */}
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>Academic Research Hub • Faculty Portal • Security</Text>
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
  
  // Sidebar Styles - Same as faculty profile screen
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

  // Main Content Styles - Same as faculty profile screen
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

  // Hero Section - Same as faculty profile screen
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

  // Section Styles - Same as faculty profile screen
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

  // Form Styles - Same as staff
  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 20,
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
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkLight,
    fontFamily: FONTS.subheading,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 12,
    gap: 12,
    minHeight: 52,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    fontFamily: FONTS.body,
    paddingVertical: 14,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledInput: {
    backgroundColor: C.borderLight,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: 4,
  },

  // Requirements Card - Same as staff
  requirementsCard: {
    backgroundColor: `${C.primary}05`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONTS.subheading,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: C.inkLight,
    fontFamily: FONTS.body,
    flex: 1,
  },

  // Action Buttons - Same style as faculty profile screen
  actionButtonsContainer: {
    gap: 12,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
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

  // Security Notice - Same style
  securityNotice: {
    flexDirection: 'row',
    backgroundColor: `${C.warning}08`,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: `${C.warning}20`,
    alignItems: 'center',
    marginTop: 16,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 13,
    color: C.inkLight,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },

  // System Info - Same as faculty profile screen
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

  // Modal Styles - Same as faculty profile screen
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
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${C.success}15`,
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
  modalText: {
    fontSize: 14,
    color: C.mute,
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: 20,
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