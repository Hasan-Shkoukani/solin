import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";

import MySolins from "./mysolins";
import About from "./aboutus";
import Account from "./account";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";

const BASE_URL = "http://localhost:3000/api";

export default function Main({ navigation }: any) {
  const [page, setPage] = useState<"solins" | "about" | "account" | "calendar">("solins");
  const authToken = useSelector((state: RootState) => state.auth.token);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!loading && !authToken) {
      dispatch(logout());
      router.replace("/a-pages/login");
    }
  }, [authToken, loading]);

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const interpolateColor = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#00CFFF", "#FF00F7", "#00CFFF"],
  });

  const createNewSolin = async () => {
    if (!authToken) {
      Alert.alert("Error", "You must be logged in to create a Solin.");
      return;
    }
    setCreating(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/documents`,
        { title: "Untitled Solin" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const newSolinId = response.data._id;
      router.push(`/main/solinpage?solinId=${newSolinId}`);
    } catch (error) {
      Alert.alert("Error", "Failed to create new Solin.");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const renderPage = () => {
    switch (page) {
      case "solins":
        return (
          <View style={{ flex: 1 }}>
            <MySolins />
          </View>
        );
      case "calendar":
        // Lazy load to avoid circular import if needed
        const CalendarPage = require("./calendar").default;
        return <CalendarPage />;
      case "about":
        return <About />;
      case "account":
        return <Account />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Animated.Text style={[styles.header, { color: interpolateColor }]}>
          SOLIN-BOARD
        </Animated.Text>
        <Animated.View
          style={[styles.animatedBorder, { backgroundColor: interpolateColor }]}
        />
      </View>

      <View style={styles.pageContainer}>{renderPage()}</View>

      <Animated.View
        style={[styles.animatedBorder, { backgroundColor: interpolateColor }]}
      />
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setPage("solins")}>
          <Text style={[styles.navItem, page === "solins" && styles.active]}>
            📂
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPage("calendar")}>
          <Text style={[styles.navItem, page === "calendar" && styles.active]}>
            📅
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPage("about")}>
          <Text style={[styles.navItem, page === "about" && styles.active]}>
            🧠
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPage("account")}>
          <Text style={[styles.navItem, page === "account" && styles.active]}>
            ⚙️
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  head: {
    backgroundColor: "#1e1e1e",
  },
  header: {
    fontSize: 36,
    fontWeight: "bold",
    padding: 20,
    textAlign: "center",
  },
  animatedBorder: {
    height: 3,
    width: "100%",
  },
  pageContainer: { flex: 1 },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    paddingBottom: 75,
    backgroundColor: "#1e1e1e",
  },
  navItem: {
    color: "#aaa",
    fontSize: 16,
  },
  active: {
    color: "#00CFFF",
    fontWeight: "bold",
  },
  calendarBtn: {
    backgroundColor: "#00CFFF",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  calendarBtnText: {
    color: "#181818",
    fontWeight: "bold",
    fontSize: 18,
  },
});
