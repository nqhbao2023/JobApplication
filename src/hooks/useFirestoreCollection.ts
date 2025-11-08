import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const useFirestoreCollection = <T>(collectionName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, collectionName));
      const items = snap.docs.map(d => ({ $id: d.id, ...d.data() })) as T[];
      setData(items);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error(`Error loading ${collectionName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [collectionName]);

  return { data, loading, error, reload: load };
};