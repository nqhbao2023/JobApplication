import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const Search = () => {
  const [keyword, setKeyword] = useState('');
  const router = useRouter();

const handleSearch = () => {
  if (!keyword.trim()) {
    console.warn("⚠️ Không thể tìm kiếm với chuỗi rỗng!");
    return;
  }

  console.log("🚀 Điều hướng với từ khóa:", keyword);

  router.push({
    pathname: "/(shared)/search",
    params: { q: keyword.trim() },
  });
};


  return (
    <View style={styles.searchbar}>
      <TextInput
        style={styles.input}
        placeholder="Tìm kiếm công việc"
        placeholderTextColor="#CCCCCC"
        value={keyword}
        onChangeText={setKeyword}
      />
      <TouchableOpacity style={styles.btnSearch} onPress={handleSearch}>
        <Ionicons name="search" color={'white'} size={30} />
      </TouchableOpacity>
    </View>
  );
};

export default Search;

const styles = StyleSheet.create({
  input: {
    borderWidth: 0,
    borderRadius: 12,
    flex: 1,
    backgroundColor: '#1674D1',
    paddingHorizontal: 10,
  },
  btnSearch: {
    borderRadius: 12,
    backgroundColor: '#F5A623',
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    // marginVertical: 20,
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
