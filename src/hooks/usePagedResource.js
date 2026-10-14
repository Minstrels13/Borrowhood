import { useCallback, useEffect, useRef, useState } from 'react';

export default function usePagedResource(fetchPage) {
  const [state, setState] = useState({ entries: [], total: 0, loading: true, error: '' });
  const generation = useRef(0);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++generation.current;
      setState((previous) => ({ ...previous, loading: true, error: '' }));
      try {
        const result = await fetchPage(offset);
        if (ticket !== generation.current) return;
        setState((previous) => ({
          ...result,
          entries: offset ? [...previous.entries, ...result.entries] : result.entries,
          loading: false,
          error: '',
        }));
      } catch (error) {
        if (ticket === generation.current)
          setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [fetchPage],
  );
  useEffect(() => {
    setState({ entries: [], total: 0, loading: true, error: '' });
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  return { ...state, refresh: () => load(), loadMore: () => load(state.entries.length) };
}
