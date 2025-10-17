import React, { useEffect, useState } from 'react';
import CandidateHome from '../screens/candidateHome';
import RecruiterHome from '../screens/employerHome';
import EmployerHome from '../screens/employerHome';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { View, Text, ActivityIndicator } from 'react-native';
export default function Index() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then((snap) => {
      const data = snap.data();
      setRole(data?.role ?? "candidate");
    });
  }, []);

  if (!role)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A80F0" />
      </View>
    );

  return role === "employer" ? <EmployerHome /> : <CandidateHome />;
}
