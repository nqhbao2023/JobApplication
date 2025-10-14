import { View, Text, StyleSheet } from "react-native";

export default function EmployerHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👔 Trang Nhà Tuyển Dụng</Text>
      <Text style={styles.sub}>Đây là màn hình chính dành cho Recruiter.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: { fontSize: 22, fontWeight: "700", color: "#1e293b" },
  sub: { fontSize: 14, color: "#64748b", marginTop: 8 },
});
