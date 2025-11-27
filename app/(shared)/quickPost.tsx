import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import QuickPostForm from '@/components/QuickPostForm';

export default function QuickPostScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'candidate_seeking' | 'employer_seeking' }>();
  
  // mode = 'candidate_seeking' → Candidate đăng tin tìm việc
  // mode = 'employer_seeking' hoặc undefined → Đăng tin tuyển dụng
  return <QuickPostForm mode={mode || 'employer_seeking'} />;
}
