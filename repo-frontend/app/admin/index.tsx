import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getToken, removeToken } from "../../lib/auth";
import api from "../../lib/api";
import { LinearGradient } from "expo-linear-gradient";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type NewUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  role: "faculty" | "staff";
};

const ROLES = ["student", "staff", "faculty"] as const;
const CREATE_USER_ROLES = ["faculty", "staff"] as const;
const EMAIL_REGEX = /^[\w.-]+@g\.msuiit\.edu\.ph$/i;
const PIN_REGEX = /^\d{6}$/;

const ROLE_COLORS = {
  student: { bg: "#dbeafe", text: "#1e40af", icon: "school-outline" },
  staff: { bg: "#fef3c7", text: "#92400e", icon: "briefcase-outline" },
  faculty: { bg: "#ddd6fe", text: "#5b21b6", icon: "book-outline" },
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newUser, setNewUser] = useState<NewUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    pin: "",
    role: "faculty",
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No token found");

      const res = await api.get("/admin/users", {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      if (Array.isArray(res.data)) setUsers(res.data);
      else if (Array.isArray(res.data.users)) setUsers(res.data.users);
      else console.warn("⚠️ Unexpected response:", res.data);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
      Alert.alert("Error", "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedUser(null);
    setNewRole("");
  };

  const updateUserRole = async () => {
    if (!selectedUser || !newRole) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No token found");

      await api.put(
        `/admin/users/${selectedUser._id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token.token}` } }
      );

      Alert.alert("✅ Success", "Role updated successfully.");
      closeEditModal();
      fetchUsers();
    } catch (err: any) {
      console.error("❌ Role update failed:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to update role."
      );
    } finally {
      setSubmitting(false);
    }
  };

const confirmDelete = (user: User) => {
  console.log("🗑️ Delete pressed for", user.email);
  // For web testing only
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`Delete user: ${user.email}?`);
    if (confirmed) deleteUser(user._id);
    return;
  }

  Alert.alert(
    "Delete User",
    `Are you sure you want to delete "${user.email}"? This action cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteUser(user._id) },
    ]
  );
};



const deleteUser = async (id: string) => {
  console.log("🛰️ Attempting delete:", id);

  try {
    const token = await getToken();
    if (!token?.token) throw new Error("No token found");

    const res = await api.delete(`/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token.token}` },
    });

    console.log("✅ Delete response:", res.data);
    Alert.alert("✅ Success", "User deleted successfully.");
    fetchUsers();
  } catch (err: any) {
    console.error("❌ Delete user failed:", err.response?.data || err);
    Alert.alert(
      "Error",
      err.response?.data?.error || "Failed to delete user."
    );
  }
};


  const validateForm = (): string | null => {
    const { firstName, lastName, email, pin } = newUser;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !pin.trim())
      return "All fields are required.";
    if (!PIN_REGEX.test(pin)) return "PIN must be exactly 6 digits.";
    if (!EMAIL_REGEX.test(email))
      return "Only @g.msuiit.edu.ph emails are allowed.";
    return null;
  };

  const createUser = async () => {
    const error = validateForm();
    if (error) return Alert.alert("Validation Error", error);

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No token found");

      await api.post("/admin/create-user", newUser, {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      Alert.alert("✅ Success", `${newUser.role} account created successfully.`);
      closeModal();
      fetchUsers();
    } catch (err: any) {
      console.error("❌ Create user failed:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create user."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      pin: "",
      role: "faculty",
    });
  };

  const logout = useCallback(async () => {
    try {
      await removeToken();
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.replace("/login");
    } catch (err) {
      console.error("❌ Logout error:", err);
      Alert.alert("Error", "Failed to log out.");
    }
  }, []);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        const token = await getToken();
        if (!token?.token) {
          await removeToken();
          router.replace("/login");
          return;
        }

        await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token.token}` },
        });

        await fetchUsers();
      } catch (err) {
        console.error("❌ Invalid/expired token, redirecting", err);
        await removeToken();
        router.replace("/login");
      }
    };

    verifyAndFetch();
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={["#1e40af", "#3b82f6", "#60a5fa"]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#1e40af", "#3b82f6"]} style={styles.header}>
        <View style={styles.headerContent}>
  <View>
    <Text style={styles.headerTitle}>User Management</Text>
    <Text style={styles.headerSubtitle}>{users.length} total users</Text>
  </View>

  <View style={styles.headerButtons}>
    <TouchableOpacity
      style={styles.repoBtn}
      onPress={() => router.push("/repository")}
    >
      <Ionicons name="book-outline" size={20} color="#fff" />
      <Text style={styles.repoBtnText}>View Repository</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
      <Ionicons name="log-out-outline" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
</View>


        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#64748b"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* User List */}
      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const roleColor =
              ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] ||
              ROLE_COLORS.student;
            return (
              <View style={styles.userCard}>
                <View style={styles.userHeader}>
                  <LinearGradient
                    colors={[roleColor.text, roleColor.text + "dd"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {item.firstName[0]}
                      {item.lastName[0]}
                    </Text>
                  </LinearGradient>

                  <View style={styles.userInfo}>
                    <Text style={styles.name}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.email}>{item.email}</Text>
                    <View
                      style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}
                    >
                      <Ionicons
                        name={roleColor.icon as any}
                        size={14}
                        color={roleColor.text}
                      />
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: roleColor.text },
                        ]}
                      >
                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Action Buttons */}
                <View style={styles.actionsFooter}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={20} color="#2563eb" />
                    <Text style={styles.editText}>Edit Role</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No users match your search"
                  : "No users found"}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.fabGradient}>
          <Ionicons name="person-add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add User Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={["#1e40af", "#3b82f6"]} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Ionicons name="person-add-outline" size={24} color="#fff" />
                <Text style={styles.modalTitle}>Add New User</Text>
              </View>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {[
                { label: "First Name", icon: "person-outline", key: "firstName" },
                { label: "Last Name", icon: "person-outline", key: "lastName" },
                { label: "Email Address", icon: "mail-outline", key: "email" },
              ].map(({ label, icon, key }) => (
                <View key={key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name={icon as any} size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      placeholder={`Enter ${label.toLowerCase()}`}
                      style={styles.input}
                      value={(newUser as any)[key]}
                      onChangeText={(t) => setNewUser({ ...newUser, [key]: key === "email" ? t.toLowerCase() : t })}
                      editable={!submitting}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize={key === "email" ? "none" : "words"}
                      keyboardType={key === "email" ? "email-address" : "default"}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter 6-digit PIN"
                    style={styles.input}
                    value={newUser.pin}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={6}
                    onChangeText={(t) => setNewUser({ ...newUser, pin: t })}
                    editable={!submitting}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>Select Role</Text>
              <View style={styles.roleRow}>
                {CREATE_USER_ROLES.map((r) => {
                  const color = ROLE_COLORS[r];
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleOption,
                        newUser.role === r && {
                          backgroundColor: color.bg,
                          borderColor: color.text,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setNewUser({ ...newUser, role: r })}
                      disabled={submitting}
                    >
                      <Ionicons
                        name={color.icon as any}
                        size={28}
                        color={newUser.role === r ? color.text : "#94a3b8"}
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          newUser.role === r && { color: color.text, fontWeight: "700" },
                        ]}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.disabledBtn]}
                onPress={createUser}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? ["#94a3b8", "#64748b"] : ["#3b82f6", "#2563eb"]}
                  style={styles.saveBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      <Text style={styles.saveBtnText}>Create User</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Role Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <LinearGradient colors={["#1e40af", "#3b82f6"]} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Ionicons name="create-outline" size={24} color="#fff" />
                <Text style={styles.modalTitle}>Edit User Role</Text>
              </View>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.editModalBody}>
              {selectedUser && (
                <>
                  <View style={styles.userInfoSection}>
                    <Text style={styles.editUserName}>
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Text>
                    <Text style={styles.editUserEmail}>{selectedUser.email}</Text>
                  </View>

                  <Text style={styles.sectionLabel}>Select New Role</Text>
                  <View style={styles.roleColumn}>
                    {ROLES.map((r) => {
                      const color = ROLE_COLORS[r];
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleOptionLarge,
                            newRole === r && {
                              backgroundColor: color.bg,
                              borderColor: color.text,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => setNewRole(r)}
                          disabled={submitting}
                        >
                          <Ionicons
                            name={color.icon as any}
                            size={32}
                            color={newRole === r ? color.text : "#94a3b8"}
                          />
                          <Text
                            style={[
                              styles.roleOptionTextLarge,
                              newRole === r && { color: color.text, fontWeight: "700" },
                            ]}
                          >
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, submitting && styles.disabledBtn]}
                    onPress={updateUserRole}
                    disabled={submitting}
                  >
                    <LinearGradient
                      colors={submitting ? ["#94a3b8", "#64748b"] : ["#3b82f6", "#2563eb"]}
                      style={styles.saveBtnGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={22} color="#fff" />
                          <Text style={styles.saveBtnText}>Update Role</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal} disabled={submitting}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, color: "#fff", fontSize: 16, fontWeight: "600" },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#dbeafe", marginTop: 4 },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: "#1e293b" },
  listContainer: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  userHeader: { flexDirection: "row", alignItems: "center" },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 1 },
  userInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 16 },
  actionsFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  editText: { color: "#1e40af", fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteText: { color: "#b91c1c", fontWeight: "700" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: "#94a3b8", fontSize: 16, marginTop: 16, fontWeight: "500" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  editModalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalHeaderContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  modalBody: { padding: 24 },
  editModalBody: { padding: 24 },
  userInfoSection: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  editUserName: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  editUserEmail: { fontSize: 14, color: "#64748b" },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#1e293b" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  roleColumn: { gap: 12, marginBottom: 24 },
  roleOption: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  roleOptionLarge: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleOptionText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  roleOptionTextLarge: { fontSize: 16, fontWeight: "600", color: "#64748b" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  saveBtnGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 17, letterSpacing: 0.5 },
  cancelBtn: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelBtnText: { color: "#64748b", fontWeight: "700", fontSize: 16 },

headerButtons: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

repoBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.15)",
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginRight: 10,
},

repoBtnText: {
  color: "#fff",
  fontWeight: "600",
  marginLeft: 6,
  fontSize: 14,
},


});