import { useCallback, useEffect, useRef, useState } from 'react';
import { getRequest } from '../lib/requests';

export default function useRequest(id) {
  const [state, setState] = useState({ request: null, loading: true, error: '' });
  const generation = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const request = await getRequest(id);
      if (ticket === generation.current) setState({ request, loading: false, error: '' });
    } catch (error) {
      if (ticket === generation.current)
        setState((previous) => ({ ...previous, loading: false, error: error.message }));
    }
  }, [id]);
  useEffect(() => {
    setState({ request: null, loading: true, error: '' });
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  return { ...state, refresh: load };
}
