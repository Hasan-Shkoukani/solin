import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  Image,
  Share,
  Modal,
  Platform
} from "react-native";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useRouter } from "expo-router";

const BASE_URL = "http://localhost:3000/api";

interface SharedUser {
  email: string;
  accessType: 'read' | 'edit';
  sharedAt: Date;
}

interface Solin {
  _id: string;
  title: string;
  description?: string;
  owner: string;
  sharedWith?: SharedUser[];
}

interface Testimonial {
  _id: string;
  author: string;
  content: string;
  picture?: string;
}

interface DecodedToken {
  id: string;
  _id?: string;
  username?: string;
  name?: string;
  user?: {
    username?: string;
    name?: string;
  };
  exp: number;
  iat: number;
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // For React Native
      // @ts-ignore - Clipboard API fallback
      if (Platform.select({
        ios: true,
        android: true,
        default: false
      })) {
        // @ts-ignore
        const Clipboard = require('react-native').Clipboard;
        Clipboard.setString(text);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Clipboard error:', error);
    return false;
  }
};

interface ShareModalProps {
  isVisible: boolean;
  shareLink: string;
  sharingEmail: string;
  onEmailChange: (email: string) => void;
  onShare: (email: string) => void;
  onClose: () => void;
  selectedSolin: Solin | null;
  sharedUsers: SharedUser[];
  onRemoveUser: (email: string) => void;
  router: ReturnType<typeof useRouter>;
  createNewSolin: () => Promise<string | null>;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isVisible,
  shareLink,
  sharingEmail,
  onEmailChange,
  onShare,
  onClose,
  selectedSolin,
  sharedUsers,
  onRemoveUser,
  router,
  createNewSolin,
}) => (
  <Modal
    visible={isVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Share Solin</Text>
        
        {/* Read-only link section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share for Viewing</Text>
          <Text style={styles.sectionDescription}>
            Anyone with this link can view the Solin (read-only access)
          </Text>
          <Text selectable style={styles.linkText}>
            {shareLink}
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
            onPress={async () => {
              const success = await copyToClipboard(shareLink);
              Alert.alert(
                success ? "Success" : "Error",
                success ? "Link copied to clipboard" : "Failed to copy link"
              );
            }}
          >
            <Text style={styles.modalButtonText}>Copy View-Only Link</Text>
          </TouchableOpacity>
        </View>

        {/* Edit access section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share for Editing</Text>
          <Text style={styles.sectionDescription}>
            Enter email to grant edit access:
          </Text>
          <TextInput
            style={styles.shareInput}
            placeholder="Enter email address"
            placeholderTextColor="#666"
            value={sharingEmail}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#007AFF', marginTop: 4 }]}
            onPress={() => onShare(sharingEmail)}
            disabled={!sharingEmail.trim()}
          >
            <Text style={styles.modalButtonText}>Share (Edit Access)</Text>
          </TouchableOpacity>
        </View>

        {/* Shared Users List */}
        {sharedUsers && sharedUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currently Shared With</Text>
            {sharedUsers.map((user, index) => (
              <View key={index} style={styles.sharedUserItem}>
                <Text style={styles.sharedUserEmail}>{user.email}</Text>
                <TouchableOpacity
                  style={styles.removeUserBtn}
                  onPress={() => onRemoveUser(user.email)}
                >
                  <Text style={styles.removeUserBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: '#666', marginTop: 16 }]}
          onPress={onClose}
        >
          <Text style={styles.modalButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

interface RenameModalProps {
  isVisible: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const RenameModal: React.FC<RenameModalProps> = ({
  isVisible,
  value,
  onValueChange,
  onSave,
  onCancel
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Rename Solin</Text>
        <TextInput
          style={styles.renameInput}
          value={value}
          onChangeText={onValueChange}
          placeholder="Enter new name"
          placeholderTextColor="#666"
          autoFocus
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.saveButton]}
            onPress={onSave}
          >
            <Text style={styles.modalButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function MySolins() {
  const router = useRouter();
  const authToken = useSelector((state: RootState) => state.auth.token);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const [userId, setUserId] = useState<string | null>(null);
  const [mySolins, setMySolins] = useState<Solin[]>([]);
  const [testimonials] = useState<Testimonial[]>([
    {
      _id: "t1",
      author: "Ilke Ileri",
      content: "Solin transformed how I organize my study materials. Highly recommended!",
      picture: require("../../assets/images/ilke.jpeg"),
    },
    {
      _id: "t2",
      author: "Rasheed AlSaadi",
      content:
        "Thanks to Solin, I finally have all my course notes, past exams, and plans in one place. It’s like having a study assistant in my pocket!",
      picture: require("../../assets/images/rash.jpeg"),
    },
  ]);

  const [editingSolinId, setEditingSolinId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const testimonialOpacity = useRef(new Animated.Value(0)).current;
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSolin, setSelectedSolin] = useState<Solin | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [sharingEmail, setSharingEmail] = useState('');
  const [selectedSolinForSharing, setSelectedSolinForSharing] = useState<Solin | null>(null);
  const [shareType, setShareType] = useState<'read' | 'edit'>('read');
  const [shareLink, setShareLink] = useState<string>("");
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  useEffect(() => {
    if (authToken) {
        try {
            const decoded: any = jwtDecode(authToken);
            setUserId(decoded.id || decoded._id);
            console.log('Decoded token in frontend:', decoded);
        } catch (error) {
            console.error('Token decode error:', error);
            setUserId(null);
        }
    }
  }, [authToken]);

  useEffect(() => {
    if (!loading && authToken && userId) {
      fetchData();
    }
  }, [loading, authToken, userId]);

  useEffect(() => {
    if (testimonials.length > 0) startTestimonialAnimation();
  }, []);

  useEffect(() => {
    if (!authToken && !loading) {
      router.replace("/a-pages/login");
    }
  }, [authToken, loading]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!authToken) return;
      try {
        const response = await axios.get(`${BASE_URL}/user/info`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setUsername(response.data.username || "Guest");
      } catch (error) {
        console.error('Failed to fetch username:', error);
        setUsername("Guest");
      }
    };

    fetchUsername();
  }, [authToken]);

  useEffect(() => {
    if (authToken && userId) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    if (!authToken || !userId) return;
    try {
      const myRes = await axios.get(`${BASE_URL}/documents/user/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMySolins(Array.isArray(myRes.data) ? myRes.data : []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch your Solins");
    }
  };

  const startTestimonialAnimation = () => {
    Animated.sequence([
      Animated.timing(testimonialOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(testimonialOpacity, {
        toValue: 0,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
      startTestimonialAnimation();
    });
  };

  const saveRename = async (solinId: string) => {
    if (!renameValue.trim()) {
      Alert.alert("Error", "Title cannot be empty");
      return;
    }

    try {
      const response = await axios.put(
        `${BASE_URL}/documents/${solinId}`,
        { 
          title: renameValue.trim()
        },
        { 
          headers: { 
            'Authorization': `Bearer ${authToken}`
          } 
        }
      );

      if (response.data.success) {
        setMySolins(prev =>
          prev.map(solin => 
            solin._id === solinId 
              ? { ...solin, title: renameValue.trim() }
              : solin
          )
        );
        setEditingSolinId(null);
        setRenameValue("");
      }
    } catch (error: any) {
      console.error("Rename error:", error);
      Alert.alert(
        "Error", 
        error.response?.data?.message || "Failed to rename Solin"
      );
    }
  };

  const cancelRename = () => {
    setEditingSolinId(null);
    setRenameValue("");
  };

  const confirmAndDeleteSolin = (solinId: string) => {
    setDeletingId(solinId);
  };

  const handleDelete = async (solinId: string) => {
    if (!authToken) {
      Alert.alert("Error", "You must be logged in to delete a Solin");
      return;
    }

    try {
      const response = await axios.delete(`${BASE_URL}/documents/${solinId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (response.status === 200 && response.data.success) {
        setMySolins(prevSolins => prevSolins.filter(solin => solin._id !== solinId));
        setDeletingId(null);
      } else {
        throw new Error(response.data.message || 'Failed to delete');
      }
    } catch (error: any) {
      console.error("Delete error:", error.response?.data || error);
      Alert.alert("Error", "Failed to delete Solin");
    }
  };

  const openSolin = (solinId: string) => {
    router.push(`/main/solinpage?solinId=${solinId}`);
  };

  const createNewSolin = async () => {
    if (!authToken) return null;
    try {
      const res = await axios.post(
        `${BASE_URL}/documents`,
        { title: "Untitled Solin" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setMySolins((prev) => [res.data, ...prev]);
      router.push(`/main/solinpage?solinId=${res.data._id}`);
      return res.data._id;
    } catch {
      Alert.alert("Error", "Failed to create new Solin.");
      return null;
    }
  };

  const openShareModal = (solin: Solin) => {
    setSelectedSolinForSharing(solin);
    setSharingEmail('');
    setShareType('read');
    setShareLink('');
    setIsShareModalVisible(true);
    const link = `https://yourdomain.com/main/solinpage?solinId=${solin._id}&access=read`;
    setShareLink(link);
  };

  const handleShareTypeChange = (type: 'read' | 'edit') => {
    setShareType(type);
    if (selectedSolinForSharing) {
      const link = `https://yourdomain.com/main/solinpage?solinId=${selectedSolinForSharing._id}&access=${type}`;
      setShareLink(link);
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Here's a Solin for you: ${shareLink}`,
        url: shareLink,
        title: "Check out this Solin"
      });
    } catch (error) {
      Alert.alert("Error", "Failed to open share dialog.");
    }
  };

  const handleShare = async (solinId: string, email: string) => {
    if (!email?.trim()) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/documents/${solinId}/share`,
        { 
          email: email.trim(),
          accessType: 'edit'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        Alert.alert("Success", `Edit access granted to ${email}`);
        fetchData();
        setIsShareModalVisible(false);
        setSharingEmail('');
        setSelectedSolinForSharing(null);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to share Solin"
      );
    }
  };

  const showManageAccess = (solin: Solin) => {
    if (!solin.sharedWith?.length) {
      Alert.alert("No Shared Access", "This Solin hasn't been shared with anyone yet.");
      return;
    }

    Alert.alert(
      "Manage Access",
      "Currently shared with:",
      [
        ...solin.sharedWith.map(share => ({
          text: `${share.email} (${share.accessType})`,
          onPress: () => showUserAccessOptions(solin._id, share.email)
        })),
        {
          text: "Close",
          style: "cancel"
        }
      ]
    );
  };

  const showUserAccessOptions = (solinId: string, email: string) => {
    Alert.alert(
      "Modify Access",
      `Modify access for ${email}`,
      [
        {
          text: "Change to Read-Only",
          onPress: () => updateAccess(solinId, email, 'read')
        },
        {
          text: "Change to Edit Access",
          onPress: () => updateAccess(solinId, email, 'edit')
        },
        {
          text: "Remove Access",
          style: "destructive",
          onPress: () => removeAccess(solinId, email)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const updateAccess = async (solinId: string, email: string, accessType: 'read' | 'edit') => {
    try {
      const response = await axios.put(
        `${BASE_URL}/documents/${solinId}/share`,
        { email, accessType },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.success) {
        Alert.alert("Success", `Updated access for ${email}`);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update access");
    }
  };

  const removeAccess = async (solinId: string, email: string) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/documents/${solinId}/share`,
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          data: { email }
        }
      );

      if (response.data.success) {
        Alert.alert("Success", `Removed access for ${email}`);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to remove access");
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!selectedSolinForSharing || !authToken) return;

    try {
      const isOwner = selectedSolinForSharing.owner === userId;
      let response;

      if (isOwner) {
        response = await axios.delete(
          `${BASE_URL}/documents/${selectedSolinForSharing._id}/share`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { email }
          }
        );
      } else {
        response = await axios.put(
          `${BASE_URL}/documents/${selectedSolinForSharing._id}/removeAccess`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }

      if (response.data.success) {
        Alert.alert("Success", "Access removed successfully");
        await fetchData();
        if (!isOwner) {
          setIsShareModalVisible(false);
          setSelectedSolinForSharing(null);
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to remove access"
      );
    }
  };

  const handleRemoveAccess = async (solinId: string) => {
    if (!authToken) return;
    try {
      await axios.put(
        `${BASE_URL}/documents/${solinId}/removeAccess`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setMySolins(prev => prev.filter(solin => solin._id !== solinId));
    } catch (error: any) {
      console.error("Remove access error:", error);
    }
  };

  const renderSolinItem = (solin: Solin, editable = false) => {
    const isOwner = solin.owner === userId;

    function handleRename(_id: string): void {
      setEditingSolinId(_id);
      const solin = mySolins.find(s => s._id === _id);
      setRenameValue(solin?.title || "");
      setIsRenameModalVisible(true);
    }

    return (
      <TouchableOpacity 
        key={solin._id} 
        style={styles.solinItem} 
        onPress={() => openSolin(solin._id)}
      >
        <View style={styles.solinHeader}>
          <Text style={styles.solinTitle}>{solin.title}</Text>
          {!isOwner && (
            <TouchableOpacity
              style={styles.unlinkButton}
              onPress={() => handleRemoveAccess(solin._id)}
            >
              <Text style={styles.unlinkButtonText}>Unlink</Text>
            </TouchableOpacity>
          )}
        </View>
        {editable && isOwner && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => openShareModal(solin)}
              style={[styles.buttonSmall, { backgroundColor: "#007AFF" }]}
            >
              <Text style={[styles.buttonTextSmall, { color: "#FFFFFF" }]}>
                {solin.sharedWith?.length ? `Shared (${solin.sharedWith.length})` : "Share"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleRename(solin._id)} 
              style={styles.buttonSmall}
            >
              <Text style={styles.buttonTextSmall}>Rename</Text>
            </TouchableOpacity>
            {deletingId === solin._id ? (
              <View style={styles.deleteConfirmContainer}>
                <TouchableOpacity
                  onPress={() => handleDelete(solin._id)}
                  style={[styles.buttonSmall, { backgroundColor: "#FF4444" }]}
                >
                  <Text style={[styles.buttonTextSmall, { color: "#FFFFFF" }]}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeletingId(null)}
                  style={[styles.buttonSmall, { backgroundColor: "#666" }]}
                >
                  <Text style={[styles.buttonTextSmall, { color: "#FFFFFF" }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => confirmAndDeleteSolin(solin._id)}
                style={[styles.buttonSmall, { backgroundColor: "#FF4444" }]}
              >
                <Text style={[styles.buttonTextSmall, { color: "#FFFFFF" }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const currentTestimonial = testimonials[currentTestimonialIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeText}>
          Welcome back, <Text style={styles.usernameText}>{username}</Text>
        </Text>
      </View>

      <View style={[styles.section, styles.mySolinsSection]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.sectionTitle}>My Solins</Text>
          <TouchableOpacity onPress={createNewSolin} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {Array.isArray(mySolins) && mySolins.length === 0 ? (
          <Text style={styles.emptyText}>You have no Solins yet.</Text>
        ) :
          mySolins.map((solin) => renderSolinItem(solin, true))
        }
      </View>

      <View style={styles.testimonialContainer}>
        <Animated.View style={{ opacity: testimonialOpacity }}>
          <View style={styles.testimonial}>
            {currentTestimonial.picture && (
              <Image
                source={
                  typeof currentTestimonial.picture === "string"
                    ? { uri: currentTestimonial.picture }
                    : currentTestimonial.picture
                }
                style={styles.testimonialImage}
              />
            )}
            <Text style={styles.testimonialContent}>"{currentTestimonial.content}"</Text>
            <Text style={styles.testimonialAuthor}>- {currentTestimonial.author}</Text>
          </View>
        </Animated.View>
      </View>

      <RenameModal
        isVisible={isRenameModalVisible}
        value={renameValue}
        onValueChange={setRenameValue}
        onSave={() => {
          if (editingSolinId) {
            saveRename(editingSolinId);
            setIsRenameModalVisible(false);
          }
        }}
        onCancel={() => {
          setIsRenameModalVisible(false);
          cancelRename();
        }}
      />
      <ShareModal
        isVisible={isShareModalVisible}
        shareLink={shareLink}
        sharingEmail={sharingEmail}
        onEmailChange={setSharingEmail}
        onShare={(email) => selectedSolinForSharing && handleShare(selectedSolinForSharing._id, email)}
        onClose={() => {
          setIsShareModalVisible(false);
          setSharingEmail('');
          setSelectedSolinForSharing(null);
        }}
        selectedSolin={selectedSolinForSharing}
        sharedUsers={selectedSolinForSharing?.sharedWith || []}
        onRemoveUser={handleRemoveUser}
        router={router}
        createNewSolin={createNewSolin}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", paddingHorizontal: 16, paddingTop: 20 },
  section: {
    marginBottom: 24,
  },
  mySolinsSection: {},
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  solinItem: {
    backgroundColor: "#1E1E1E",
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: "column",
    gap: 10,
  },
  solinHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  solinTitle: { color: "#FFF", fontSize: 18, flex: 1 },
  solinTitleInput: {
    flex: 1,
    backgroundColor: "#333",
    color: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#333",
    borderRadius: 6,
  },
  buttonTextSmall: {
    color: "#AAA",
    fontSize: 14,
  },
  emptyText: { color: "#666", fontStyle: "italic" },
  testimonialContainer: {
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    height: 180,
    alignItems: "center",
    marginHorizontal: 8,
    justifyContent: "center",
  },
  testimonial: { alignItems: "center" },
  testimonialImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  testimonialContent: {
    color: "#EEE",
    fontStyle: "italic",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
  },
  testimonialAuthor: { color: "#AAA", fontSize: 14 },
  createButton: {
    backgroundColor: "#333",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: { color: "#FFF", fontSize: 16 },
  deleteConfirmContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sharedBadge: {
    backgroundColor: "#007AFF",
    color: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 12,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  shareButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shareCount: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  shareCountText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  welcomeBanner: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
  },
  usernameText: {
    color: '#00CFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  shareInput: {
    height: 40,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDescription: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
  },
  linkText: {
    color: '#00CFFF',
    fontSize: 14,
    padding: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 8,
  },
  sharedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    marginBottom: 8,
  },
  sharedUserEmail: {
    color: '#FFF',
    fontSize: 14,
  },
  removeUserBtn: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeUserBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeAccessBtn: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  removeAccessBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unlinkButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  unlinkButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  editTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF4444',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  renameInput: {
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 16,
  },
});