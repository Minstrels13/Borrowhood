import { useCallback, useEffect, useRef, useState } from 'react';
import { getLatestItemRequest } from '../lib/requests';

export default function useItemRequest(itemId, borrowerId) {
  const key = `${itemId}:${borrowerId}`;
  const enabled = Boolean(itemId && borrowerId);
  const [state, setState] = useState({ key: null, request: null, loading: enabled, error: '' });
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    if (!enabled) {
      setState({ key, request: null, loading: false, error: '' });
      return { request: null, error: '' };
    }
    setState((previous) => ({
      key,
      request: previous.key === key ? previous.request : null,
      loading: true,
      error: '',
    }));
    try {
      const request = await getLatestItemRequest(itemId, borrowerId);
      if (ticket !== generation.current) return { request: null, error: '', cancelled: true };
      setState({ key, request, loading: false, error: '' });
      return { request, error: '' };
    } catch (failure) {
      const error = failure.message;
      if (ticket !== generation.current) return { request: null, error: '', cancelled: true };
      setState((previous) => ({ ...previous, loading: false, error }));
      return { request: null, error };
    }
  }, [itemId, borrowerId, enabled, key]);
  useEffect(() => {
    void refresh();
    function visible() {
      if (document.visibilityState === 'visible') void refresh();
    }
    if (enabled) document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh, enabled]);
  return {
    ...(state.key === key ? state : { request: null, loading: enabled, error: '' }),
    refresh,
  };
}
