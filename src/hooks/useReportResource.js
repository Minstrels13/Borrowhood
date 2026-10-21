import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Report reads never reinterpret failure as an empty result. Scope includes the account.
export default function useReportResource(fetchResource, scope) {
  const { user } = useAuth();
  const key = `${user?.id || ''}:${scope}`;
  const current = useRef(key);
  current.current = key;
  const generation = useRef(0);
  const [state, setState] = useState({ key: '', data: null, loading: true, error: '' });
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setState((previous) => ({ key, data: previous.key === key ? previous.data : null, loading: true, error: '' }));
    try {
      const data = await fetchResource();
      if (ticket !== generation.current || current.current !== key) return undefined;
      setState({ key, data, loading: false, error: '' });
      return data;
    } catch (error) {
      if (ticket === generation.current && current.current === key)
        setState((previous) => ({ ...previous, key, loading: false, error: error.message }));
      return undefined;
    }
  }, [fetchResource, key]);
  useEffect(() => {
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);
  return { ...(state.key === key ? state : { data: null, loading: true, error: '' }), refresh };
}
