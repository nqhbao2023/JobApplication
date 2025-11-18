import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Button } from '@/components/base/Button';
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
};

type RoleFilter = 'all' | 'admin' | 'employer' | 'candidate';

const UsersScreen = () => {
  const { data: users, loading, reload } = useFirestoreCollection<User>('users');
  const { query, setQuery, filtered: searchResults } = useSearch(users, ['name', 'email', 'phone']);
  
  const { filter: roleFilter, setFilter: setRoleFilter, filtered: filteredUsers } = useFilter<User, RoleFilter>(
    searchResults,
    (user, filter) => {
      if (filter === 'admin') return user.isAdmin === true;
      return user.role === filter;
    }
  );

  const handleEdit = (userId: string) => {
    router.push({ pathname: '/(admin)/user-detail', params: { userId } } as any);
  };

  const handleDelete = (userId: string, name: string, user: User) => {
    // Ngăn admin tự xóa chính mình
    const currentUserId = auth.currentUser?.uid;
    if (userId === currentUserId) {
      Alert.alert('Không thể xóa', 'Bạn không thể xóa chính tài khoản của mình!');
      return;
    }

    // Cảnh báo khi xóa admin khác
    const isAdminUser = user.isAdmin === true;
    const warningMessage = isAdminUser
      ? `⚠️ CẢNH BÁO: "${name}" là ADMIN!\n\nBạn có chắc chắn muốn xóa tài khoản admin này?`
      : `Bạn có chắc muốn xóa user "${name}"?`;

    Alert.alert('Xác nhận', warningMessage, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', userId));
            await reload();
            Alert.alert('Thành công', 'Đã xóa user');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa user');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner text="Đang tải danh sách users..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Tạo User"
          icon="person-add"
          variant="success"
          onPress={() => router.push('/(admin)/user-create')}
          fullWidth
        />
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm theo tên, email, sđt..."
      />

      <FilterTabs
        options={['all', 'admin', 'employer', 'candidate'] as const}
        active={roleFilter}
        onChange={setRoleFilter}
        labels={{
          all: 'Tất cả',
          admin: 'Admin',
          employer: 'Employer',
          candidate: 'Candidate',
        }}
      />

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Hiển thị {filteredUsers.length} / {users.length} users
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => (
          <UserCard user={item} onEdit={handleEdit} onDelete={handleDelete} />
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
  header: { padding: 16, paddingBottom: 0 },
  stats: { paddingHorizontal: 16, paddingVertical: 12 },
  statsText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
});