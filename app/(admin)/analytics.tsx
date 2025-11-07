import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

type Stats = {
  totalUsers: number;
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
};

const AnalyticsScreen = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalJobs: 0,
    totalCompanies: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersSnap, jobsSnap, companiesSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "companies")),
        getDocs(collection(db, "job_categories")),
      ]);

      setStats({
        totalUsers: usersSnap.size,
        totalJobs: jobsSnap.size,
        totalCompanies: companiesSnap.size,
        totalCategories: categoriesSnap.size,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    icon: keyof typeof Ionicons.glyphMap; 
    color: string;
  }) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[color, color + "dd"]}
        style={styles.statGradient}
      >
        <View style={styles.statIcon}>
          <Ionicons name={icon} size={28} color="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>📊 Tổng quan hệ thống</Text>
      
      <View style={styles.statsGrid}>
        <StatCard
          title="Users"
          value={stats.totalUsers}
          icon="people"
          color="#3b82f6"
        />
        <StatCard
          title="Jobs"
          value={stats.totalJobs}
          icon="briefcase"
          color="#10b981"
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          icon="business"
          color="#f59e0b"
        />
        <StatCard
          title="Categories"
          value={stats.totalCategories}
          icon="apps"
          color="#8b5cf6"
        />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <Text style={styles.infoText}>
          Dữ liệu được cập nhật theo thời gian thực từ Firestore
        </Text>
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
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
  statGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "center",
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  statTitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});

