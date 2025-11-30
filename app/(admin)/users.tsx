import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { SearchBar } from '@/components/base/SearchBar';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { UserCard } from '@/components/admin/UserCard';
import { FilterTabs } from '@/components/admin/FilterTabs';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useSearch } from '@/hooks/useSearch';
import { useFilter } from '@/hooks/useFilter';

type User = {
  $id: string;
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  phone?: string;
  created_at?: string;
  disabled?: boolean;
  disabledAt?: string;
  disabledReason?: string;
};

type RoleFilter = 'all' | 'admin' | 'employer' | 'candidate' | 'disabled';

const UsersScreen = () => {
  const { data: users, loading, reload } = useFirestoreCollection<User>('users');
  const { query, setQuery, filtered: searchResults } = useSearch(users, ['name', 'email', 'phone']);
  
  const { filter: roleFilter, setFilter: setRoleFilter, filtered: filteredUsers } = useFilter<User, RoleFilter>(
    searchResults,
    (user, filter) => {
      if (filter === 'all') return true;
      if (filter === 'disabled') return user.disabled === true;
      if (filter === 'admin') return user.isAdmin === true;
      return user.role === filter;
    }
  );

  const handleViewDetail = (userId: string) => {
    router.push({ pathname: '/(admin)/user-detail', params: { userId } } as any);
  };

  const handleToggleDisable = (userId: string, userName: string, user: User) => {
    // Ngăn admin tự disable chính mình
    const currentUserId = auth.currentUser?.uid;
    if (userId === currentUserId) {
      Alert.alert('Không thể thực hiện', 'Bạn không thể vô hiệu hóa chính tài khoản của mình!');
      return;
    }

    const isCurrentlyDisabled = user.disabled === true;
    const action = isCurrentlyDisabled ? 'kích hoạt lại' : 'vô hiệu hóa';
    
    // Cảnh báo khi disable admin khác
    const isAdminUser = user.isAdmin === true;
    const warningMessage = isAdminUser && !isCurrentlyDisabled
      ? `⚠️ CẢNH BÁO: "${userName}" là ADMIN!\n\nBạn có chắc chắn muốn vô hiệu hóa tài khoản admin này?`
      : `Bạn có chắc muốn ${action} tài khoản "${userName}"?`;

    Alert.alert(
      isCurrentlyDisabled ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản',
      warningMessage,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isCurrentlyDisabled ? 'Kích hoạt' : 'Vô hiệu hóa',
          style: isCurrentlyDisabled ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isCurrentlyDisabled) {
                // Kích hoạt lại
                await updateDoc(doc(db, 'users', userId), {
                  disabled: false,
                  disabledAt: null,
                  disabledReason: null,
                  enabledAt: new Date().toISOString(),
                  enabledBy: currentUserId,
                });
                Alert.alert('Thành công', `Đã kích hoạt lại tài khoản "${userName}"`);
              } else {
                // Vô hiệu hóa
                await updateDoc(doc(db, 'users', userId), {
                  disabled: true,
                  disabledAt: new Date().toISOString(),
                  disabledBy: currentUserId,
                  disabledReason: 'Bị vô hiệu hóa bởi admin',
                });
                Alert.alert('Thành công', `Đã vô hiệu hóa tài khoản "${userName}"`);
              }
              await reload();
            } catch (error) {
              console.error('Error toggling user status:', error);
              Alert.alert('Lỗi', `Không thể ${action} tài khoản`);
            }
          },
        },
      ]
    );
  };

  // Đếm số user theo trạng thái
  const disabledCount = users.filter(u => u.disabled === true).length;
  const activeCount = users.length - disabledCount;

  if (loading) return <LoadingSpinner text="Đang tải danh sách users..." />;

  return (
    <View style={styles.container}>
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          ℹ️ Admin chỉ có thể xem và quản lý trạng thái tài khoản. User tự đăng ký qua ứng dụng.
        </Text>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm theo tên, email, sđt..."
      />

      <FilterTabs
        options={['all', 'admin', 'employer', 'candidate', 'disabled'] as const}
        active={roleFilter}
        onChange={setRoleFilter}
        labels={{
          all: 'Tất cả',
          admin: 'Admin',
          employer: 'Employer',
          candidate: 'Candidate',
          disabled: `Đã khóa (${disabledCount})`,
        }}
      />

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Hiển thị {filteredUsers.length} / {users.length} users • 
          <Text style={styles.activeText}> {activeCount} hoạt động</Text> • 
          <Text style={styles.disabledText}> {disabledCount} bị khóa</Text>
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => (
          <UserCard 
            user={item} 
            onView={handleViewDetail} 
            onToggleDisable={handleToggleDisable} 
          />
        )}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="people-outline" message="Không tìm thấy users" />
        }
      />
    </View>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  stats: { paddingHorizontal: 16, paddingVertical: 12 },
  statsText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeText: { color: '#10B981' },
  disabledText: { color: '#EF4444' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
});