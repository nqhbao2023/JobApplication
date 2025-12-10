/**
 * CV Preview Screen (Shared)
 * 
 * View CV template in read-only mode
 * Used by:
 * - Employers viewing candidate's CV from quick post
 * - Candidates previewing their CV before submission
 */

import React from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import CVTemplateViewer from '@/components/CVTemplateViewer';
import { CVData } from '@/types/cv.types';

export default function CVPreviewScreen() {
  const params = useLocalSearchParams();
  
  // Parse cvData from params
  let cvData: CVData | null = null;
  try {
    if (params.cvData && typeof params.cvData === 'string') {
      cvData = JSON.parse(params.cvData);
      console.log('📄 CVPreviewScreen: Loaded CV data:', {
        fullName: cvData?.personalInfo.fullName,
        type: cvData?.type,
        hasEducation: cvData?.education?.length || 0,
        hasSkills: cvData?.skills?.length || 0,
      });
    }
  } catch (error) {
    console.error('❌ CVPreviewScreen: Failed to parse cvData:', error);
    Alert.alert('Lỗi', 'Không thể tải dữ liệu CV');
  }

  if (!cvData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center' }}>
          Không tìm thấy dữ liệu CV
        </Text>
      </View>
    );
  }

  return (
    <CVTemplateViewer
      visible={true}
      onClose={() => router.back()}
      cvData={cvData}
    />
  );
}
