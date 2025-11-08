import React from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { CompanyCard } from '@/components/admin/CompanyCard';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

type Company = {
  $id: string;
  corp_name?: string;
  nation?: string;
  image?: string;
};

const CompaniesScreen = () => {
  const { data: companies, loading, reload } = useFirestoreCollection<Company>('companies');

  const handleDelete = (companyId: string, name: string) => {
    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa company "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'companies', companyId));
            await reload();
            Alert.alert('Thành công', 'Đã xóa company');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa company');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner text="Đang tải danh sách companies..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={companies}
        renderItem={({ item }) => (
          <CompanyCard company={item} onDelete={handleDelete} />
        )}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="business-outline" message="Không có companies" />
        }
      />
    </View>
  );
};

export default CompaniesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  list: { padding: 16 },
});