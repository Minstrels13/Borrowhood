import { useCallback, useEffect, useState } from 'react';
import { getAvailability } from '../lib/requests';

export default function useAvailability(itemId) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ blocked: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState({ blocked: [], loading: true, error: '' });
    getAvailability(itemId)
      .then((blocked) => {
        if (active) setState({ blocked, loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setState({ blocked: [], loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [itemId, revision]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, retry };
}
