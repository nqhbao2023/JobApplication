import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/config/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { pushNotificationService } from "@/services/pushNotification.service";

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
          savedAt: new Date(),
          created_at: new Date().toISOString(),
        });
        setIsSaved(true);
        setSaveDocId(docRef.id);

        // ✅ Schedule reminder notification (3 days later)
        try {
          const jobDoc = await getDoc(doc(db, "jobs", jobId));
          if (jobDoc.exists()) {
            const jobData = jobDoc.data();
            await pushNotificationService.scheduleSavedJobReminder(
              jobData.title || 'Công việc đã lưu',
              jobId
            );
          }
        } catch (notifErr) {
          console.log('Failed to schedule reminder:', notifErr);
        }
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
