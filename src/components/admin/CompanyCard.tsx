import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Card } from '../base/Card';
import { IconButton } from '../base/IconButton';
import { Ionicons } from '@expo/vector-icons';

type Company = {
  $id: string;
  corp_name?: string;
  nation?: string;
  image?: string;
};

type CompanyCardProps = {
  company: Company;
  onDelete: (companyId: string, name: string) => void;
};

export const CompanyCard = ({ company, onDelete }: CompanyCardProps) => {
  return (
    <Card>
      <View style={styles.container}>
        <Image
          style={styles.image}
          source={{ uri: company.image || 'https://via.placeholder.com/60' }}
          contentFit="cover"
        />
        <View style={styles.info}>
          <Text style={styles.name}>{company.corp_name || 'N/A'}</Text>
            <View style={styles.nationRow}>
    <Ionicons name="globe-outline" size={14} color="#64748b" />
    <Text style={styles.nation}>{company.nation || 'Việt Nam'}</Text>
            </View>     
           </View>
        <IconButton
          icon="trash-outline"
          color="#ef4444"
          onPress={() => onDelete(company.$id, company.corp_name || '')}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 16,
  },
  info: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  nation: {
    fontSize: 14,
    color: '#64748b',
  },
  nationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});