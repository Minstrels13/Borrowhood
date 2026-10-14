import { useCallback, useEffect, useRef, useState } from 'react';
import { getItemRequests } from '../lib/requests';

const initial = { item: null, requests: [], total: 0, pending_count: 0, loading: true, error: '' };

export default function useItemRequests(itemId, userId, filter) {
  const scope = `${itemId}:${userId}:${filter}`;
  const [state, setState] = useState({ ...initial, scope });
  const generation = useRef(0);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++generation.current;
      setState((previous) => ({
        ...(previous.scope === scope ? previous : initial),
        scope,
        loading: true,
        error: '',
      }));
      try {
        const result = await getItemRequests(itemId, filter, offset);
        if (ticket !== generation.current) return;
        setState((previous) => ({
          ...result,
          scope,
          requests: offset ? [...previous.requests, ...result.requests] : result.requests,
          loading: false,
          error: '',
        }));
      } catch (error) {
        if (ticket === generation.current)
          setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [itemId, filter, scope],
  );
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const current = state.scope === scope ? state : initial;
  return { ...current, refresh: () => load(), loadMore: () => load(current.requests.length) };
}
