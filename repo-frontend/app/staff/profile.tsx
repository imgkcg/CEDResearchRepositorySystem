// app/screens/staff/profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import api from "../../lib/api";
import { getToken, removeToken } from "../../lib/auth";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/** 🎨 Professional Academic Theme - Match with staff dashboard */
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

// NavItem Component - Same as staff dashboard
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

export default function StaffProfileScreen() {
  const [user, setUser] = useState<any>(null);
 const [loading, setLoading] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;
const [showLogoutModal, setShowLogoutModal] = useState(false);

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
        Alert.alert("Error", "Failed to load profile data");
      }
    }
  };

 useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const run = async () => {
      setLoading(true);
      await fetchUserProfile();
      setLoading(false);
    };

    run();

    return () => { isActive = false };
  }, [])
);


  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await removeToken();
            router.replace("/login");
          },
        },
      ]
    );
  };

  // Edit Profile function
  const handleEditProfile = () => {
    router.push({
   pathname: "/staff/EditProfile",
  params: { user: JSON.stringify(user) }
});

  };

  // Change Password function
  const handleChangePassword = () => {
    router.push("/ChangePassword");
  };

  // Navigation items - Staff specific
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
      onPress: () => {},
      active: true
    },
  ];

  // Info Card Component
  const InfoCard = ({ icon, label, value }: any) => (
    <View style={styles.infoCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${C.primary}10` }]}>
        <Ionicons name={icon} size={20} color={C.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  // Action Card Component
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

    const LogoutModal = () => (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Ionicons name="log-out-outline" size={38} color={C.error} style={{ marginBottom: 10 }} />

      <Text style={styles.modalTitle}>Sign Out?</Text>
      <Text style={styles.modalMessage}>
        You will be logged out from your staff account.
      </Text>

      <View style={styles.modalActions}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.modalCancel]}
          onPress={() => setShowLogoutModal(false)}
        >
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modalButton, styles.modalConfirm]}
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
  if (loading) {
    return (
      <View style={styles.container}>


        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed ? (
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Ionicons name="library" size={28} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.logoText}>Staff Portal</Text>
                  <Text style={styles.logoSubtext}>Profile</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.collapsedLogo}>
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
      {showLogoutModal && <LogoutModal />}
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar */}
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
                <Text style={styles.logoSubtext}>Profile</Text>
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
            onPress={handleEditProfile}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name="person-circle" size={44} color={C.primary} />
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: C.success }]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.fullName || user?.firstName || "Staff Member"}</Text>
              <Text style={styles.userRole}>Staff</Text>
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
               onPress={() => setShowLogoutModal(true)}

          >
            <Ionicons name="log-out-outline" size={20} color={C.mute} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Profile</Text>
              <Text style={styles.userGreeting}>{user?.fullName || user?.firstName || "Staff Member"}</Text>
            </View>
            
            <View style={styles.navbarActions}>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={handleEditProfile}
              >
                <View style={styles.smallAvatar}>
                  <Ionicons name="person" size={18} color={C.primary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scroll Content */}
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
                <View style={styles.profileHeader}>
                  <View style={styles.avatarLarge}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                  <View style={styles.profileHeaderText}>
                    <Text style={styles.heroTitle}>Profile Settings</Text>
                    <Text style={styles.heroSubtitle}>
                      Manage your account information and security
                    </Text>
                  </View>
                </View>
                <Ionicons name="settings" size={40} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Stats Section */}
          <View style={styles.metricsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Overview</Text>
            </View>
            
            <View style={styles.statsContainer}>
              {/* Role */}
              <View style={[styles.statItem, { marginRight: 12 }]}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: `${C.primary}15` }]}>
                    <Ionicons name="briefcase" size={22} color={C.primary} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.primary }]}>
                    Staff
                  </Text>
                  <Text style={styles.metricLabel}>Role</Text>
                </View>
              </View>

              {/* Member Since */}
              <View style={styles.statItem}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: `${C.secondary}15` }]}>
                    <Ionicons name="calendar" size={22} color={C.secondary} />
                  </View>
                  <Text style={[styles.metricValue, { color: C.secondary }]}>
                    {user?.createdAt ? new Date(user.createdAt).getFullYear() : "N/A"}
                  </Text>
                  <Text style={styles.metricLabel}>Member Since</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Profile Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.infoCardsContainer}>
              <InfoCard 
                icon="person-outline" 
                label="Full Name" 
                value={user?.fullName || user?.firstName} 
              />
              <InfoCard 
                icon="mail-outline" 
                label="Email" 
                value={user?.email} 
              />
               <InfoCard 
              icon="call-outline" 
              label="Phone Number" 
              value={user?.phone} 
            />
              <InfoCard 
                icon="id-card-outline" 
                label="Staff ID" 
                value={user?.staffId || user?.employeeId || "Not provided"} 
              />
              <InfoCard 
                icon="business-outline" 
                label="Department" 
                value={user?.department || user?.affiliation || "Records Office"} 
              />
              <InfoCard 
                icon="calendar-outline" 
                label="Member Since" 
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : '--'}
              />
            </View>
          </View>

          {/* Account Actions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
            </View>
            
            <View style={styles.actionsContainer}>
              <ActionCard
                icon="create-outline"
                title="Edit Profile"
                subtitle="Update your personal information"
                onPress={handleEditProfile}
                color={C.primary}
              />
              <ActionCard
                icon="key-outline"
                title="Change Password"
                subtitle="Update your account password"
                onPress={handleChangePassword}
                color={C.secondary}
              />
              <ActionCard
              icon="log-out-outline"
              title="Sign Out"
              subtitle="Logout from your account"
              onPress={() => setShowLogoutModal(true)}
              color={C.error}
            />

            </View>
          </View>

          {/* System Info */}
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>Research Repository • Staff Portal</Text>
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
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
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
    fontSize: 16,
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

  // Section Styles
  section: {
    marginBottom: 32,
  },
  infoCardsContainer: {
    gap: 10,
  },
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
  },
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

  // System Info
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

modalBox: {
  width: 340,
  backgroundColor: "#fff",
  padding: 24,
  borderRadius: 16,
  alignItems: "center",
  elevation: 10,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
},

modalTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: C.ink,
  marginBottom: 8,
},

modalMessage: {
  fontSize: 14,
  color: C.mute,
  textAlign: "center",
  marginBottom: 20,
  lineHeight: 20,
},

modalActions: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  gap: 12,
},

modalButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
},

modalCancel: {
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.border,
},

modalCancelText: {
  color: C.inkLight,
  fontSize: 14,
  fontWeight: "600",
},

modalConfirm: {
  backgroundColor: C.error,
},

modalConfirmText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "700",
},

});