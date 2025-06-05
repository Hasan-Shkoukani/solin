import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // Animation logic (copied from login)
  const colorAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 360,
        duration: 10000,
        useNativeDriver: false,
      })
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      delay: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 90, 180, 270, 360],
    outputRange: ["#00CFFF", "#66F0FF", "#FF69B4", "#33E1FF", "#00CFFF"],
  });

  const handleSignup = async () => {
    try {
      await axios.post("http://localhost:3000/api/auth/register", {
        email,
        name,
        password,
      });
      Alert.alert("Success", "Account created! Please log in.");
      router.push("/a-pages/login");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Signup failed.";
      Alert.alert("Error", msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#121212" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.animatedBorder,
            { borderColor, shadowColor: borderColor },
          ]}
        >
          <Text style={styles.title}>Sign Up</Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
            Create your Solin account
          </Animated.Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/a-pages/login")}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: "#00CFFF", textAlign: "center" }}>
              Already have an account? Log in
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  animatedBorder: {
    borderWidth: 2,
    borderRadius: 18,
    padding: 28,
    backgroundColor: "#181818",
    width: 320,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    color: "#FFF",
    backgroundColor: "#232323",
  },
  button: {
    backgroundColor: "#00CFFF",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});
