import React, { useEffect, useState } from 'react';
import CandidateHome from '../screens/candidateHome';
import RecruiterHome from '../screens/employerHome';
import EmployerHome from '../screens/employerHome';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { View, Text, ActivityIndicator } from 'react-native';

export default function Index() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, 'users', user.uid);
          const snap = await getDoc(docRef);

          if (snap.exists()) {
            const userData = snap.data();
            console.log("🔥 User data from Firestore:", userData);

            if (userData.role) {
              setRole(userData.role);
            } else {
              // Nếu chưa có role thì mặc định candidate
              await updateDoc(docRef, { role: 'candidate' });
              setRole('candidate');
            }
          } else {
            console.log("⚠️ User không tồn tại trong Firestore");
            setRole('candidate'); // fallback
          }
        }
      } catch (err) {
        console.log("❌ Fetch role error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  // Khi đang loading
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text>Đang tải...</Text>
      </View>
    );
  }

  // Nếu không tìm thấy role
  if (!role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Không tìm thấy role cho user này</Text>
      </View>
    );
  }

  // Điều hướng theo role
if (role === 'employer') return <EmployerHome />;
return <CandidateHome />;

}
