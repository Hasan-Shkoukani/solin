import React, { useRef, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "./store/store";

export default function Index() {
  const router = useRouter();
  const colorAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const authToken = useSelector((state: RootState) => state.auth.token);
  const loading = useSelector((state: RootState) => state.auth.loading);

  useEffect(() => {
    // Loop the background color animation
    Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 360,
        duration: 10000,
        useNativeDriver: false,
      })
    ).start();

    // Fade in the tagline
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 3000,
      delay: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (authToken) {
      router.replace("/main/main");
    } else {
      router.replace("/a-pages/login");
    }
  }, [authToken, loading]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 90, 180, 270, 360],
    outputRange: ["#00CFFF", "#66F0FF", "#FF69B4", "#33E1FF", "#00CFFF"],
  });

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/Solin.png")}
        style={styles.image}
      />
      <Animated.Text
        style={[
          styles.title,
          {
            color: backgroundColor,
          },
        ]}
      >
        Innovate Ideas
      </Animated.Text>

      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        Unlock your creativity and imagine the future.
      </Animated.Text>

      <Text style={styles.subheader}>
        Near East Engineering ReImagined
      </Text>

      <Animated.View style={[styles.button, { backgroundColor, marginTop: 30 }]}>
        <TouchableOpacity onPress={() => router.push("/a-pages/signup")}>
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 4,
    marginBottom: 10,
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
    color: "#333",
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 15,
  },
  subheader: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
    marginBottom: 10,
  },
  button: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
});
