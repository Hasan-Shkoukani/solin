import React, { useState, useEffect } from "react";
import { View, Alert, Text, StyleSheet, TextInput, Button, TouchableOpacity, Image, Modal, ScrollView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";
import { RootState } from "../store/store";
import axios from "axios";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { all_courses } from "../main/courses";

const BASE_URL = "http://localhost:3000/api";

export default function Account() {
  const dispatch = useDispatch();
  const router = useRouter();
  const authToken = useSelector((state: RootState) => state.auth.token);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [courses, setCourses] = useState<string[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [allAvailableCourses] = useState<string[]>(all_courses);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [modalInitial, setModalInitial] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!authToken) return;
      try {
        const response = await axios.get(`${BASE_URL}/user/info`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setCurrentUsername(response.data.username);
        setProfileImage(response.data.profileImage);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchUserInfo();
  }, [authToken]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!authToken) return;
      try {
        const res = await axios.get(`${BASE_URL}/user/courses`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setCourses(res.data.courses || []);
        // Only set modal state on first load
        if (modalInitial && (res.data.courses || []).length === 0) {
          setSelectedCourses([]);
          setShowCourseModal(true);
          setModalInitial(false);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    };
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const handleChangeUsername = async () => {
    if (!username.trim()) return Alert.alert("Error", "Username cannot be empty.");
    setLoading(true);
    try {
      await axios.put(
        `${BASE_URL}/user/username`,
        { username },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      Alert.alert("Success", "Username updated!");
      setUsername("");
    } catch {
      Alert.alert("Error", "Failed to update username.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) return Alert.alert("Error", "Fill both password fields.");
    setLoading(true);
    try {
      await axios.put(
        `${BASE_URL}/user/password`,
        { password, newPassword },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      Alert.alert("Success", "Password updated!");
      setPassword("");
      setNewPassword("");
    } catch {
      Alert.alert("Error", "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/user`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      dispatch(logout());
      router.replace("/a-pages/login");
    } catch {
      Alert.alert("Error", "Failed to delete account.");
    } finally {
      setLoading(false);
      setIsDeleteModalVisible(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.log('Failed to clear AsyncStorage:', e);
    }
    dispatch(logout());
    router.replace("/a-pages/login");
  };

  const handleChangeProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);

        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('profileImage', blob, `profile-${Date.now()}.jpg`);

        try {
          const uploadResponse = await axios.put(
            `${BASE_URL}/user/profile-image`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'multipart/form-data',
              }
            }
          );

          if (uploadResponse.data.success) {
            setProfileImage(`${BASE_URL}${uploadResponse.data.profileImage}`);
            Alert.alert('Success', 'Profile picture updated!');
          }
        } catch (error: any) {
          console.error('Upload error:', error.response?.data || error);
          Alert.alert('Error', 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    } finally {
      setLoading(false);
    }
  };

  const updateCourses = async (newCourses: string[]) => {
    try {
      setLoading(true);
      await axios.put(`${BASE_URL}/user/courses`, { courses: newCourses }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Fetch updated courses from backend to ensure sync
      const res = await axios.get(`${BASE_URL}/user/courses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setCourses(res.data.courses || []);
      setShowCourseModal(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update courses.');
    } finally {
      setLoading(false);
    }
  };

  // --- Course Modal ---
  const CourseModal = () => {
    const [localSelected, setLocalSelected] = useState<string[]>(selectedCourses || []);
    const [search, setSearch] = useState("");
    useEffect(() => {
      if (showCourseModal) setLocalSelected(selectedCourses || []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCourseModal]);

    // Filter courses by search
    const filteredCourses = allAvailableCourses.filter(course =>
      course.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <Modal visible={showCourseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Select Your Courses</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView style={{ flexGrow: 0 }}>
              {filteredCourses.length === 0 ? (
                <Text style={{ color: "#aaa", textAlign: "center", marginVertical: 12 }}>No courses found.</Text>
              ) : (
                filteredCourses.map((course) => (
                  <TouchableOpacity
                    key={course}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    onPress={() => {
                      setLocalSelected(localSelected.includes(course)
                        ? localSelected.filter(c => c !== course)
                        : [...localSelected, course]
                      );
                    }}
                  >
                    <View style={{
                      width: 20, height: 20, borderWidth: 1, borderColor: '#00CFFF', marginRight: 8,
                      backgroundColor: localSelected.includes(course) ? '#00CFFF' : 'transparent'
                    }} />
                    <Text style={{ color: '#FFF' }}>{course}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Button
              title="Save Courses"
              onPress={async () => {
                setSelectedCourses(localSelected);
                await updateCourses(localSelected);
              }}
              disabled={loading}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // --- Delete Modal ---
  const DeleteModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete your account? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        alignItems: 'center',
        paddingBottom: 40,
        flexGrow: 1
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', alignItems: 'center' }}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image 
                source={{ 
                  uri: profileImage.includes('/uploads') 
                    ? `http://localhost:3000${profileImage}`
                    : profileImage 
                }} 
                style={styles.profileImage}
                resizeMode="cover" 
              />
            ) : (
              <View style={[styles.profileImage, styles.defaultProfileImage]}>
                <Text style={styles.defaultProfileText}>
                  {currentUsername?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.editImageButton}
              onPress={handleChangeProfileImage}
            >
              <Text style={styles.editImageText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{currentUsername}</Text>
        </View>

        <Text style={styles.title}>Account Settings</Text>
        <Text style={styles.text}>User settings and info will be here.</Text>

        {/* Change Username */}
        <Text style={styles.sectionTitle}>Change Username</Text>
        <TextInput
          style={styles.input}
          placeholder="New Username"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <Button title="Update Username" onPress={handleChangeUsername} disabled={loading} />

        {/* Change Password */}
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Current Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#888"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Button title="Update Password" onPress={handleChangePassword} disabled={loading} />

        {/* --- Courses Section --- */}
        <Text style={styles.sectionTitle}>Your Courses</Text>
        {courses.length === 0 ? (
          <Text style={{ color: '#aaa', marginBottom: 10 }}>No courses selected.</Text>
        ) : (
          courses.map((course, idx) => (
            <View key={course + idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: '#FFF', flex: 1 }}>{course}</Text>
            </View>
          ))
        )}
        <TouchableOpacity
          onPress={() => {
            setSelectedCourses(courses);
            setShowCourseModal(true);
          }}
          style={{ marginBottom: 20 }}
        >
          <Text style={{ color: '#00CFFF', textDecorationLine: 'underline' }}>
            Select from available courses
          </Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={loading}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <CourseModal />
      <DeleteModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    // Do NOT put alignItems here, it must go in contentContainerStyle
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#00CFFF", marginBottom: 10 },
  text: { color: "#aaa", fontSize: 16, textAlign: "center", marginBottom: 20 },
  sectionTitle: { color: "#00CFFF", fontWeight: "bold", marginTop: 24, marginBottom: 6, fontSize: 18 },
  input: {
    backgroundColor: "#232323",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    width: 220,
    borderWidth: 1,
    borderColor: "#333",
  },
  deleteBtn: {
    marginTop: 30,
    backgroundColor: "#ff6b6b",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  deleteText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  logoutBtn: {
    marginTop: 16,
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
  },
  defaultProfileImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 48,
    color: '#FFF',
    fontWeight: 'bold',
  },
  editImageButton: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  editImageText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalContentSmall: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    maxHeight: '80%', // allow modal to grow with content
    flexShrink: 1,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: "#232323",
    color: "#FFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
});
