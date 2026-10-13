import { useCallback, useEffect, useRef, useState } from 'react';
import { getItems } from '../lib/items';

export default function useItems(options) {
  const key = JSON.stringify(options);
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: '' });
  const generation = useRef(0);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++generation.current;
      setState((previous) => ({ ...previous, loading: true, error: '' }));
      try {
        const result = await getItems({ ...JSON.parse(key), offset });
        if (ticket !== generation.current) return;
        setState((previous) => ({
          items: offset ? [...previous.items, ...result.items] : result.items,
          total: result.total,
          loading: false,
          error: '',
        }));
      } catch (error) {
        if (ticket === generation.current)
          setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [key],
  );
  useEffect(() => {
    setState({ items: [], total: 0, loading: true, error: '' });
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  return { ...state, retry: () => load(), loadMore: () => load(state.items.length) };
}
