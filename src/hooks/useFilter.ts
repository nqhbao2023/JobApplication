import { useState, useMemo } from 'react';

export const useFilter = <T, F extends string>(
  items: T[],
  filterFn: (item: T, filter: F) => boolean
) => {
  const [filter, setFilter] = useState<F>('all' as F);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => filterFn(item, filter));
  }, [items, filter, filterFn]);

  return { filter, setFilter, filtered };
};