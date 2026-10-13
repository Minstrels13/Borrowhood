import { useCallback, useEffect, useRef, useState } from 'react';
import { getRequests } from '../lib/requests';

export default function useRequests(userId, role) {
  const [state, setState] = useState({ requests: [], total: 0, loading: true, error: '' });
  const generation = useRef(0);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++generation.current;
      setState((previous) => ({ ...previous, loading: true, error: '' }));
      try {
        const result = await getRequests(userId, role, offset);
        if (ticket === generation.current)
          setState((previous) => ({
            requests: offset ? [...previous.requests, ...result.requests] : result.requests,
            total: result.total,
            loading: false,
            error: '',
          }));
      } catch (error) {
        if (ticket === generation.current)
          setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [userId, role],
  );
  useEffect(() => {
    setState({ requests: [], total: 0, loading: true, error: '' });
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  return { ...state, retry: () => load(), loadMore: () => load(state.requests.length) };
}
