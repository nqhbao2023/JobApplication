// app/(admin)/quick-posts-pending.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { auth } from '@/config/firebase';
import { API_BASE_URL } from '@/config/api';

const API_URL = API_BASE_URL;

interface QuickPost {
  id: string;
  title: string;
  description: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    zalo?: string;
    facebook?: string;
  };
  metadata?: {
    ip: string;
    userAgent: string;
    timestamp: string;
  };
  spamScore?: number;
  createdAt: any;
}

const QuickPostsPending = () => {
  const [posts, setPosts] = useState<QuickPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingPosts = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.get(`${API_URL}/api/quick-posts/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(response.data.jobs || []);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      Alert.alert('Error', 'Failed to load pending posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const handleApprove = async (postId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.patch(
        `${API_URL}/api/quick-posts/${postId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Job approved and published!');
      fetchPendingPosts();
    } catch (error) {
      console.error('Error approving post:', error);
      Alert.alert('Error', 'Failed to approve job');
    }
  };

  const handleReject = async (postId: string) => {
    Alert.alert(
      'Reject Job',
      'Are you sure you want to reject this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await auth.currentUser?.getIdToken();
              await axios.patch(
                `${API_URL}/api/quick-posts/${postId}/reject`,
                { reason: 'Admin rejected' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Success', 'Job rejected');
              fetchPendingPosts();
            } catch (error) {
              console.error('Error rejecting post:', error);
              Alert.alert('Error', 'Failed to reject job');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: QuickPost }) => {
    const spamColor = 
      (item.spamScore || 0) >= 50 ? '#EF4444' :
      (item.spamScore || 0) >= 30 ? '#F59E0B' : '#10B981';

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.spamBadge, { backgroundColor: spamColor }]}>
            <Text style={styles.spamScore}>{item.spamScore || 0}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.contactLabel}>Contact:</Text>
          {item.contactInfo?.phone && (
            <Text style={styles.contactText}>📞 {item.contactInfo.phone}</Text>
          )}
          {item.contactInfo?.email && (
            <Text style={styles.contactText}>📧 {item.contactInfo.email}</Text>
          )}
        </View>

        {/* Metadata */}
        {item.metadata && (
          <View style={styles.metadata}>
            <Text style={styles.metaText}>IP: {item.metadata.ip}</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              UA: {item.metadata.userAgent.substring(0, 40)}...
            </Text>
            <Text style={styles.metaText}>
              {new Date(item.metadata.timestamp).toLocaleString('vi-VN')}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A80F0" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Quick Posts ({posts.length})</Text>
        <TouchableOpacity onPress={fetchPendingPosts}>
          <Ionicons name="refresh" size={24} color="#4A80F0" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPendingPosts} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No pending posts</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  spamBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spamScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  contactSection: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 2,
  },
  metadata: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});

export default QuickPostsPending;
