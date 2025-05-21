import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet, ScrollView, Modal, Dimensions
} from 'react-native';
import { databases, ID, databases_id } from '../lib/appwrite';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Định nghĩa các collection ID từ appwrite.ts
const collection_user_id = '67eb6f55003bab0d48d7';
const collection_job_id = '67e8c50d003e2f3390e9';
const collection_company_id = '67f61f400009809453a2';
const collection_jobtype_id = '67eb67ac002af299cf8b';
const collection_jobcategory_id = '67eb6bfc00221765d9e4';
const collection_applied_jobs_id = '67fe804c003af89aa92c';
const collection_notifications_id = '6822e49000277fcfb317';
const collection_saved_jobs_id = '67fba800002508632ee5';

// Định nghĩa kiểu cho các icon của Ionicons
const ionicIcons = [
  'home', 'person', 'briefcase', 'calendar', 'heart', 'star', 'settings', 'search',
  'mail', 'notifications', 'checkmark', 'close', 'trash', 'pencil', 'book', 'code',
  'globe', 'map', 'time', 'wallet', 'bulb', 'camera', 'chatbox', 'document',
] as const;

type IconName = typeof ionicIcons[number];

// Lấy chiều cao màn hình
const { height } = Dimensions.get('window');

const AdminScreen = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ icon_name?: IconName } & any>({});
  const [iconModalVisible, setIconModalVisible] = useState(false);

  // Lấy dữ liệu từ collection dựa trên tab hiện tại
  const fetchData = async () => {
    setLoading(true);
    try {
      let collectionId = '';
      switch (activeTab) {
        case 'users':
          collectionId = collection_user_id;
          break;
        case 'jobs':
          collectionId = collection_job_id;
          break;
        case 'companies':
          collectionId = collection_company_id;
          break;
        case 'job_types':
          collectionId = collection_jobtype_id;
          break;
        case 'job_categories':
          collectionId = collection_jobcategory_id;
          break;
        case 'applied_jobs':
          collectionId = collection_applied_jobs_id;
          break;
        case 'notifications':
          collectionId = collection_notifications_id;
          break;
        case 'saved_jobs':
          collectionId = collection_saved_jobs_id;
          break;
        default:
          return;
      }
      const response = await databases.listDocuments(databases_id, collectionId);
      setData(response.documents);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Hàm chuẩn hóa và lọc dữ liệu trước khi gửi
  const normalizeAndFilterFormData = (data: any, tab: string) => {
    const normalizedData = { ...data };
    // Loại bỏ các thuộc tính hệ thống
    Object.keys(normalizedData).forEach((key) => {
      if (key.startsWith('$') || key === 'created_at' || key === 'updated_at') {
        delete normalizedData[key];
      }
    });

    switch (tab) {
      case 'users':
        if (normalizedData.isAdmin) {
          normalizedData.isAdmin = normalizedData.isAdmin === 'true' || normalizedData.isAdmin === true;
        }
        if (normalizedData.isRecruiter) {
          normalizedData.isRecruiter = normalizedData.isRecruiter === 'true' || normalizedData.isRecruiter === true;
        }
        break;
      case 'jobs':
        if (normalizedData.salary) {
          normalizedData.salary = parseFloat(normalizedData.salary) || 0;
        }
        break;
      case 'applied_jobs':
        if (normalizedData.status) {
          normalizedData.status = normalizedData.status.toString();
        }
        break;
      case 'notifications':
        if (normalizedData.read) {
          normalizedData.read = normalizedData.read === 'true' || normalizedData.read === true;
        }
        break;
      default:
        break;
    }
    return normalizedData;
  };

  // Xử lý thêm mới
  const handleAdd = async () => {
    if (!Object.keys(formData).length) {
      Alert.alert('Lỗi', 'Vui lòng nhập dữ liệu');
      return;
    }

    try {
      setLoading(true);
      let collectionId = '';
      switch (activeTab) {
        case 'users':
          collectionId = collection_user_id;
          break;
        case 'jobs':
          collectionId = collection_job_id;
          break;
        case 'companies':
          collectionId = collection_company_id;
          break;
        case 'job_types':
          collectionId = collection_jobtype_id;
          break;
        case 'job_categories':
          collectionId = collection_jobcategory_id;
          break;
        case 'applied_jobs':
          collectionId = collection_applied_jobs_id;
          break;
        case 'notifications':
          collectionId = collection_notifications_id;
          break;
        case 'saved_jobs':
          collectionId = collection_saved_jobs_id;
          break;
        default:
          return;
      }

      // Chuẩn hóa và lọc dữ liệu trước khi gửi
      const normalizedData = normalizeAndFilterFormData(formData, activeTab);

      console.log('Dữ liệu gửi lên (thêm mới):', normalizedData); // Log dữ liệu để kiểm tra

      await databases.createDocument(databases_id, collectionId, ID.unique(), {
        ...normalizedData, // Chỉ gửi các thuộc tính tùy chỉnh
        created_at: new Date().toISOString(), // Gửi created_at nhưng sẽ bị Appwrite bỏ qua nếu không hợp lệ
      });
      Alert.alert('Thành công', 'Đã thêm mới thành công');
      setFormData({});
      setIsAdding(false);
      fetchData();
    } catch (error: any) {
      console.error('Lỗi khi thêm mới:', error.message, error.response);
      Alert.alert('Lỗi', `Không thể thêm mới: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý chỉnh sửa
  const handleEdit = async (id: string) => {
    try {
      setLoading(true);
      let collectionId = '';
      switch (activeTab) {
        case 'users':
          collectionId = collection_user_id;
          break;
        case 'jobs':
          collectionId = collection_job_id;
          break;
        case 'companies':
          collectionId = collection_company_id;
          break;
        case 'job_types':
          collectionId = collection_jobtype_id;
          break;
        case 'job_categories':
          collectionId = collection_jobcategory_id;
          break;
        case 'applied_jobs':
          collectionId = collection_applied_jobs_id;
          break;
        case 'notifications':
          collectionId = collection_notifications_id;
          break;
        case 'saved_jobs':
          collectionId = collection_saved_jobs_id;
          break;
        default:
          return;
      }

      // Chuẩn hóa và lọc dữ liệu trước khi gửi
      const normalizedData = normalizeAndFilterFormData(formData, activeTab);

      console.log('Dữ liệu gửi lên (chỉnh sửa):', normalizedData); // Log dữ liệu để kiểm tra

      await databases.updateDocument(databases_id, collectionId, id, {
        ...normalizedData, // Chỉ gửi các thuộc tính tùy chỉnh
      });
      Alert.alert('Thành công', 'Đã cập nhật thành công');
      setFormData({});
      setIsEditing(null);
      fetchData();
    } catch (error: any) {
      console.error('Lỗi khi cập nhật:', error.message, error.response);
      Alert.alert('Lỗi', `Không thể cập nhật: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa
  const handleDelete = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        onPress: async () => {
          try {
            setLoading(true);
            let collectionId = '';
            switch (activeTab) {
              case 'users':
                collectionId = collection_user_id;
                break;
              case 'jobs':
                collectionId = collection_job_id;
                break;
              case 'companies':
                collectionId = collection_company_id;
                break;
              case 'job_types':
                collectionId = collection_jobtype_id;
                break;
              case 'job_categories':
                collectionId = collection_jobcategory_id;
                break;
              case 'applied_jobs':
                collectionId = collection_applied_jobs_id;
                break;
              case 'notifications':
                collectionId = collection_notifications_id;
                break;
              case 'saved_jobs':
                collectionId = collection_saved_jobs_id;
                break;
              default:
                return;
            }

            await databases.deleteDocument(databases_id, collectionId, id);
            Alert.alert('Thành công', 'Đã xóa thành công');
            fetchData();
          } catch (error: any) {
            console.error('Lỗi khi xóa:', error.message, error.response);
            Alert.alert('Lỗi', 'Không thể xóa');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Hiển thị form thêm/chỉnh sửa
  const renderForm = () => {
    const fields: { [key: string]: string[] } = {
      users: ['name', 'email', 'phone', 'isAdmin', 'isRecruiter'],
      jobs: ['title', 'image', 'skills_required', 'responsibilities', 'salary', 'job_Description'],
      companies: ['corp_name', 'nation', 'corp_description', 'city', 'image', 'color'],
      job_types: ['type_name'],
      job_categories: ['category_name', 'icon_name', 'color'],
      applied_jobs: ['userId', 'jobId', 'status', 'cv_url'],
      notifications: ['userId', 'message', 'type', 'jobId', 'read'],
      saved_jobs: ['userId', 'jobId'],
    };

    return (
      <ScrollView style={styles.formContainer}>
        {fields[activeTab].map((field) => {
          if (activeTab === 'job_categories' && field === 'icon_name') {
            return (
              <TouchableOpacity
                key={field}
                style={styles.iconPicker}
                onPress={() => setIconModalVisible(true)}
              >
                <Text style={styles.iconPickerText}>
                  {formData.icon_name || 'Chọn icon'}
                </Text>
                {formData.icon_name && (
                  <Ionicons name={formData.icon_name} size={24} color="#333" style={styles.iconPreview} />
                )}
              </TouchableOpacity>
            );
          }

          return (
            <TextInput
              key={field}
              style={styles.input}
              placeholder={field}
              value={formData[field]?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, [field]: text })}
            />
          );
        })}
        <TouchableOpacity
          style={styles.button}
          onPress={() => (isEditing ? handleEdit(isEditing) : handleAdd())}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isEditing ? 'Cập nhật' : 'Thêm'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF3B30' }]}
          onPress={() => {
            setIsAdding(false);
            setIsEditing(null);
            setFormData({});
          }}
        >
          <Text style={styles.buttonText}>Hủy</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Modal chọn icon
  const renderIconModal = () => (
    <Modal visible={iconModalVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn Icon</Text>
          <FlatList
            data={ionicIcons}
            numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.iconItem}
                onPress={() => {
                  setFormData({ ...formData, icon_name: item });
                  setIconModalVisible(false);
                }}
              >
                <Ionicons name={item} size={30} color="#333" />
                <Text style={styles.iconName}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF3B30' }]}
            onPress={() => setIconModalVisible(false)}
          >
            <Text style={styles.buttonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Hiển thị danh sách
  const renderItem = ({ item }: { item: any }) => {
    let displayFields: string[] = [];
    switch (activeTab) {
      case 'users':
        displayFields = ['name', 'email', 'isAdmin', 'isRecruiter'];
        break;
      case 'jobs':
        displayFields = ['title', 'salary', 'job_Description'];
        break;
      case 'companies':
        displayFields = ['corp_name', 'city', 'nation'];
        break;
      case 'job_types':
        displayFields = ['type_name'];
        break;
      case 'job_categories':
        displayFields = ['category_name', 'icon_name', 'color'];
        break;
      case 'applied_jobs':
        displayFields = ['userId', 'jobId', 'status'];
        break;
      case 'notifications':
        displayFields = ['userId', 'message', 'type', 'read'];
        break;
      case 'saved_jobs':
        displayFields = ['userId', 'jobId'];
        break;
      default:
        displayFields = [];
    }

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          {displayFields.map((field) => (
            <View key={field} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field}: </Text>
              <Text
                style={styles.fieldValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {field === 'icon_name' && item[field] ? (
                  <Ionicons name={item[field]} size={20} color="#333" />
                ) : (
                  item[field]?.toString() || 'N/A'
                )}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => {
              // Lọc các thuộc tính hệ thống trước khi gán vào formData
              const filteredItem = Object.keys(item).reduce((acc, key) => {
                if (!key.startsWith('$') && key !== 'created_at' && key !== 'updated_at') {
                  acc[key] = item[key];
                }
                return acc;
              }, {} as any);
              setFormData(filteredItem);
              setIsEditing(item.$id);
            }}
          >
            <Ionicons name="pencil" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.$id)}>
            <Ionicons name="trash" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trang Admin</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <ScrollView horizontal style={styles.tabContainer} contentContainerStyle={{ flexGrow: 1 }}>
        {['users', 'jobs', 'companies', 'job_types', 'job_categories', 'applied_jobs', 'notifications', 'saved_jobs'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab);
              setIsAdding(false);
              setIsEditing(null);
              setFormData({});
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Nút thêm mới */}
      {!isAdding && !isEditing && (
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Text style={styles.buttonText}>Thêm mới</Text>
        </TouchableOpacity>
      )}

      {/* Form thêm/chỉnh sửa */}
      {(isAdding || isEditing) && renderForm()}

      {/* Modal chọn icon */}
      {renderIconModal()}

      {/* Danh sách dữ liệu */}
      {!isAdding && !isEditing && (
        <FlatList
          style={styles.listContainer}
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có dữ liệu</Text>}
          refreshing={loading}
          onRefresh={fetchData}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  logoutButton: { alignSelf: 'flex-end', marginBottom: 10 },
  logoutText: { color: '#FF3B30', fontSize: 16 },
  tabContainer: { 
    flexDirection: 'row', 
    marginBottom: 10,
    maxHeight: 50,
  },
  tab: { 
    padding: 10, 
    marginRight: 10, 
    borderRadius: 10, 
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 16 },
  activeTabText: { color: '#fff' },
  addButton: { 
    backgroundColor: '#4CAF50', 
    padding: 10, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 10,
    width: '100%',
  },
  formContainer: { marginBottom: 10, maxHeight: height * 0.4 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 10,
    marginBottom: 10, fontSize: 16
  },
  button: {
    backgroundColor: '#007AFF', padding: 10, borderRadius: 10,
    alignItems: 'center', marginBottom: 10
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  itemContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    height: 100,
  },
  itemContent: { 
    flex: 1, 
    width: '70%',
  },
  fieldRow: { 
    flexDirection: 'row', 
    marginBottom: 2, 
    height: 20,
    alignItems: 'center',
  },
  fieldLabel: { 
    fontWeight: 'bold', 
    color: '#333', 
    width: 100,
    fontSize: 14,
  },
  fieldValue: { 
    fontSize: 14, 
    flex: 1, 
    color: '#555',
  
  },
  actions: { 
    flexDirection: 'row', 
    gap: 10, 
    alignItems: 'center', 
  },
  listContainer: { 
    flex: 1, 
    maxHeight: height * 0.5,
  },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#888' },
  iconPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  iconPickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  iconPreview: {
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconItem: {
    alignItems: 'center',
    margin: 10,
    width: '22%',
  },
  iconName: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default AdminScreen;