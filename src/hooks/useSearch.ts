import { useState, useMemo } from 'react';

export const useSearch = <T>(items: T[], searchFields: (keyof T)[]) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    
    const lowerQuery = query.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [items, query, searchFields]);

  return { query, setQuery, filtered };
};