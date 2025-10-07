// app/(tabs)/RecruiterHome.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const RecruiterHome = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recruiter Dashboard</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(events)/addJob')}>
          <Ionicons name="add-circle-outline" size={32} color="#4A80F0" />
          <Text style={styles.cardText}>Post a Job</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(events)/myJobs')}>
          <Ionicons name="briefcase-outline" size={32} color="#4A80F0" />
          <Text style={styles.cardText}>My Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(events)/applications')}>
          <Ionicons name="people-outline" size={32} color="#4A80F0" />
          <Text style={styles.cardText}>Applications</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecruiterHome;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9FB', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  cardText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
});
