import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

type AdminCard = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  count?: number;
};

const AdminDashboard = () => {
  const adminCards: AdminCard[] = [
    {
      title: "Users",
      icon: "people-outline",
      route: "/(admin)/users",
      color: "#3b82f6",
    },
    {
      title: "Jobs",
      icon: "briefcase-outline",
      route: "/(admin)/jobs",
      color: "#10b981",
    },
    {
      title: "Companies",
      icon: "business-outline",
      route: "/(admin)/companies",
      color: "#f59e0b",
    },
    {
      title: "Analytics",
      icon: "bar-chart-outline",
      route: "/(admin)/analytics",
      color: "#8b5cf6",
    },
  ];

  const renderCard = (card: AdminCard) => (
    <TouchableOpacity
      key={card.title}
      style={styles.card}
      onPress={() => router.push(card.route as any)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[card.color, card.color + "dd"]}
        style={styles.cardGradient}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={card.icon} size={32} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>{card.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>👋 Xin chào Admin</Text>
        <Text style={styles.subtitle}>Quản lý hệ thống Job4S</Text>
      </View>

      <View style={styles.grid}>
        {adminCards.map(renderCard)}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push("/(admin)/users")}
        >
          <Ionicons name="person-add-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Thêm User mới</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push("/(admin)/jobs" as any)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Thêm Job mới</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  card: {
    width: "47%",
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  cardCount: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.9,
  },
  quickActions: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
});