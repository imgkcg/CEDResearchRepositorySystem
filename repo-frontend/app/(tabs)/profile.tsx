import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from "expo-router";
import api from '../../lib/api';
import { getToken, removeToken } from '../../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from "react-native";

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

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const contentWidth = width - sidebarWidth;
  
  // Determine if user is faculty or student based on role
  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';
  const isStudent = user?.role === 'student';
const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Navigation items - UPDATED to match student dashboard style
  const navItems = isFaculty ? [
    {
      id: 'dashboard',
 icon: 'grid-outline',
      activeIcon: 'grid',
      label: 'Dashboard',
      onPress: () => router.push("/faculty"),
      active: false,
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
      active: true,
      onPress: () => {},
    },
  ] : [
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
      label: 'My Research',
      onPress: () => router.push("/submissions"),
      active: false,
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
      active: true,
      onPress: () => {},
    },
  ];

  const fetchUserProfile = async () => {
    const tokenObj = await getToken();
    const bearer = tokenObj?.token || tokenObj?.user?.token;
    
    if (bearer) {
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${bearer}` }
        });
        setUser(res.data);
        
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        console.error("Profile fetch failed", err);
        Alert.alert("Error", "Failed to load profile data");
      }
    }
  };

  const fetchSubmissions = async () => {
    const tokenObj = await getToken();
    const bearer = tokenObj?.token || tokenObj?.user?.token;
    
    if (bearer) {
      try {
        if (isFaculty) {
          const res = await api.get('/faculty/my-research', {
            headers: { Authorization: `Bearer ${bearer}` }
          });
          setSubmissions(res.data || []);
        } else {
          const res = await api.get('/student/my-research', {
            headers: { Authorization: `Bearer ${bearer}` }
          });
          setSubmissions(res.data || []);
        }
      } catch (err) {
        console.error("Submissions fetch failed", err);
      }
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchUserProfile();
      await fetchSubmissions();
      setLoading(false);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchSubmissions()]);
    setRefreshing(false);
  };

const handleLogout = () => {
  console.log("🚀 Logout modal opened");
  setShowLogoutModal(true);
};








  const handleEditProfile = () => {
    router.push({
      pathname: "/EditProfileStud",
      params: { user: JSON.stringify(user) }
    });
  };

  const handleChangePassword = () => {
    router.push("/ChangePasswordStud");
  };

  // Calculate stats from submissions
  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending' || s.status === 'reviewing').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    approvalRate: submissions.length > 0 
      ? `${Math.round((submissions.filter(s => s.status === 'approved').length / submissions.length) * 100)}%`
      : "0%"
  };

  const InfoCard = ({ icon, label, value }: any) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconContainer, { backgroundColor: `${C.primary}10` }]}>
        <Ionicons name={icon} size={20} color={C.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  const ActionButton = ({ icon, label, onPress, color = C.primary }: any) => (
    <TouchableOpacity 
      style={[styles.actionButton, { borderColor: `${color}30` }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={color} />
    </TouchableOpacity>
  );

  const MetricCard = ({ icon, value, label, color }: any) => (
    <View style={[styles.metricCard, { marginRight: 12 }]}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  const metrics = [
    {
      id: 'total',
      icon: 'documents',
      value: stats.total,
      label: 'Total',
      color: C.primary,
    },
    {
      id: 'approved',
      icon: 'checkmark-circle',
      value: stats.approved,
      label: 'Approved',
      color: C.success,
    },
    {
      id: 'pending',
      icon: 'time',
      value: stats.pending,
      label: 'In Review',
      color: C.warning,
    },
    {
      id: 'rejected',
      icon: 'close-circle',
      value: stats.rejected,
      label: 'Rejected',
      color: C.error,
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Left Sidebar Navigation - Matching Student Dashboard */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Logo and Toggle */}
        <View style={styles.sidebarHeader}>
          {!sidebarCollapsed ? (
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="school" size={28} color={C.primary} />
              </View>
              <View>
                <Text style={styles.logoText}>
                  {isFaculty ? 'Faculty Portal' : 'Submission Hub'}
                </Text>
                <Text style={styles.logoSubtext}>Profile Management</Text>
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
            onPress={handleEditProfile}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons 
                  name="person-circle" 
                  size={44} 
                  color={C.primary} 
                />
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: C.success }]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.fullName || "User"}</Text>
              <Text style={styles.userRole}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Member"}
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
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={C.mute} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area - UPDATED: Fixed content width */}
      <View style={[styles.mainContent, { width: contentWidth }]}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavContent}>
            <View>
              <Text style={styles.welcomeText}>Profile Management</Text>
              <Text style={styles.userGreeting}>Welcome back, {user?.fullName || "User"}</Text>
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

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[C.primary]} 
              tintColor={C.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section - Matching Student Dashboard */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={C.primaryGradient}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Animated.View style={[styles.heroContent, { opacity: fadeAnim }]}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.heroAvatar, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                    <Ionicons 
                      name="person" 
                      size={56} 
                      color="rgba(255,255,255,0.9)" 
                    />
                  </View>
                </View>
                
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroName}>{user?.fullName || "User"}</Text>
                  <Text style={styles.heroEmail}>{user?.email}</Text>
                  
                  <View style={styles.roleBadge}>
                    <Ionicons 
                      name={isFaculty ? "school" : "person"} 
                      size={14} 
                      color="rgba(255,255,255,0.9)" 
                    />
                    <Text style={styles.roleText}>
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Member"}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </LinearGradient>
          </View>

        

          {/* Profile Information Section - Updated to match student dashboard card style */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <Text style={styles.sectionSubtitle}>Your account details</Text>
            </View>
            
            <View style={styles.infoCardsContainer}>
              <InfoCard 
                icon="mail-outline" 
                label="Email Address" 
                value={user?.email} 
              />
              <InfoCard 
                icon="call-outline" 
                label="Phone Number" 
                value={user?.phone} 
              />
              <InfoCard 
                icon="school-outline" 
                label="College/Department" 
                value={user?.college || user?.affiliation} 
              />
              <InfoCard 
                icon="business-outline" 
                label="Institution" 
                value={user?.affiliation || user?.college} 
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

          {/* Account Actions Section - Matching student dashboard style */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              <Text style={styles.sectionSubtitle}>Manage your account preferences</Text>
            </View>
            
            <View style={styles.actionsContainer}>
              <ActionButton 
                icon="create-outline" 
                label="Edit Profile" 
                onPress={handleEditProfile}
              />
              <ActionButton 
                icon="key-outline" 
                label="Change Password" 
                onPress={handleChangePassword}
              />
              
              {isFaculty && (
                <ActionButton 
                  icon="shield-outline" 
                  label="Faculty Settings" 
                  onPress={() => Alert.alert("Faculty Settings", "Faculty-specific settings will be available soon")}
                  color={C.secondary}
                />
              )}
            </View>
          </View>

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
        Logout
      </Text>
      <Text style={{ marginBottom: 20 }}>
        Are you sure you want to logout?
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
            console.log("✔ LOGOUT CONFIRMED — onPress is running");

            await removeToken();
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("token");

            console.log("✔ Token removed, routing to login...");
            setShowLogoutModal(false);
            router.replace("/login");
          }}
        >
          <Text style={{ color: "red" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

       

          {/* Footer */}
          
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

  // Main Content Styles - UPDATED: Fixed content width
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  centered: {
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

  // Hero Section - Matching Student Dashboard
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
    gap: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroName: {
    color: C.card,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONTS.heading,
    marginBottom: 4,
  },
  heroEmail: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: FONTS.body,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    color: C.card,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Metrics Section - Matching Student Dashboard
  metricsSection: {
    marginBottom: 32,
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
  metricsContainer: {
    paddingRight: 24,
    flexDirection: 'row',
  },
  metricCard: {
    width: 120,
    height: 120,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
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
    marginBottom: 8,
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

  // Section Styles - Updated to match student dashboard
  section: {
    marginBottom: 32,
  },
  infoCardsContainer: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
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
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: C.mute,
    fontFamily: FONTS.body,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: C.ink,
    fontWeight: '500',
    fontFamily: FONTS.subheading,
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Danger Zone - Updated to match student dashboard
  dangerZone: {
    gap: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${C.error}30`,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: C.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dangerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.subheading,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  versionText: {
    fontSize: 12,
    color: C.mute,
    fontFamily: FONTS.body,
    marginBottom: 4,
    textAlign: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: C.subtle,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
});