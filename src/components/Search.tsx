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
        placeholder="Tìm kiếm công việc, công ty..."
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        value={keyword}
        onChangeText={setKeyword}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
        cursorColor="#FFFFFF"
        selectionColor="rgba(255, 255, 255, 0.3)"
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    height: 50,
  },
  btnSearch: {
    borderRadius: 12,
    backgroundColor: '#F5A623',
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchbar: {
    // marginVertical: 20,
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
