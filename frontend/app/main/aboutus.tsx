import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from "react-native";

export default function About() {
  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image 
            source={require("../../assets/images/Solin.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>About Solin</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.text}>
            Solin is designed to revolutionize how students organize and share their study materials.
            We believe in making knowledge sharing seamless and collaborative, helping students
            achieve their academic goals together.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureList}>
            {[
              "Create and organize study materials",
              "Share notes with classmates",
              "Collaborate in real-time",
              "Control access permissions",
              "Search across all your content",
              "Mobile-friendly interface"
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <View style={styles.teamContainer}>
            <View style={styles.teamMember}>
              <Image 
                source={require("../../assets/images/pikachu.jpg")}
                style={styles.avatar}
              />
              <Text style={styles.memberName}>Hasan Shkoukani</Text>
              <Text style={styles.memberRole}>Engineer</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:hasanshkoukani19@gmail.com')}
          >
            <Text style={styles.contactButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00CFFF",
    marginBottom: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  text: {
    color: "#aaa",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "left",
  },
  featureList: {
    marginLeft: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureDot: {
    color: "#00CFFF",
    fontSize: 20,
    marginRight: 10,
  },
  featureText: {
    color: "#aaa",
    fontSize: 16,
  },
  teamContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  teamMember: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  memberRole: {
    color: "#aaa",
    fontSize: 14,
  },
  contactButton: {
    backgroundColor: "#00CFFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  contactButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
});
