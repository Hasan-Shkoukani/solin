import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { setToken, setLoading } from "../store/authSlice";
import { RootState } from "../store/store";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://localhost:3000/api";

export default function Login() {
  const dispatch = useDispatch();
  const router = useRouter();
  const loading = useSelector((state: RootState) => state.auth.loading);
  const authToken = useSelector((state: RootState) => state.auth.token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (authToken) {
      router.replace("/main/main");
    }
  }, [authToken]);

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.token) {
        // Store the raw token without any modifications
        await AsyncStorage.setItem("userToken", response.data.token);
        dispatch(setToken(response.data.token));
        // router.replace("/main/main"); // handled by useEffect
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Login failed. Please try again.");
      dispatch(setLoading(false));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Image
          source={require("../../assets/images/Solin.png")}
          style={styles.image}
        />
        <Text style={styles.title}>Welcome Back :)</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/a-pages/signup")}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#00CFFF",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#232323",
    color: "#FFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: 260,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#00CFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    alignItems: "center",
    width: 260,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  linkText: {
    color: "#00CFFF",
    marginTop: 12,
    fontSize: 16,
  },
  image: {
    width: 130,
    height: 130,
    marginBottom: 30,
  },
});