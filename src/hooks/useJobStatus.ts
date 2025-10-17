import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/config/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

export const useJobStatus = (jobId?: string) => {
  const [userId, setUserId] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);
  const [saveDocId, setSaveDocId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // ✅ Lấy user hiện tại
  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  }, []);

  // ✅ Kiểm tra job đã lưu chưa
  const checkIfSaved = useCallback(async () => {
    if (!userId || !jobId) return;
    setSaveLoading(true);
    try {
      const q = query(
        collection(db, "saved_jobs"),
        where("userId", "==", userId),
        where("jobId", "==", jobId)
      );
      const res = await getDocs(q);
      if (!res.empty) {
        setIsSaved(true);
        setSaveDocId(res.docs[0].id);
      } else {
        setIsSaved(false);
        setSaveDocId(null);
      }
    } catch (err) {
      console.error("checkIfSaved error:", err);
    } finally {
      setSaveLoading(false);
    }
  }, [userId, jobId]);

  // ✅ Lưu hoặc hủy lưu job
  const toggleSave = useCallback(async () => {
    if (!userId || !jobId) return;
    setSaveLoading(true);
    try {
      if (isSaved && saveDocId) {
        await deleteDoc(doc(db, "saved_jobs", saveDocId));
        setIsSaved(false);
        setSaveDocId(null);
      } else {
        const docRef = await addDoc(collection(db, "saved_jobs"), {
          userId,
          jobId,
          created_at: new Date().toISOString(),
        });
        setIsSaved(true);
        setSaveDocId(docRef.id);
      }
    } catch (err) {
      console.error("toggleSave error:", err);
    } finally {
      setSaveLoading(false);
    }
  }, [userId, jobId, isSaved, saveDocId]);

  // ✅ Gọi lần đầu
  useEffect(() => {
    checkIfSaved();
  }, [userId, jobId]);

  return { isSaved, saveLoading, toggleSave };
};
