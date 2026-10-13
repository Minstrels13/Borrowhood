import { useEffect, useState } from 'react';
import { getItem } from '../lib/items';

export default function useItem(id) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ item: null, loading: Boolean(id), error: '' });
  useEffect(() => {
    let active = true;
    if (!id) {
      setState({ item: null, loading: false, error: '' });
      return;
    }
    setState({ item: null, loading: true, error: '' });
    getItem(id)
      .then((item) => {
        if (active) setState({ item, loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setState({ item: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  return { ...state, retry: () => setRevision((value) => value + 1) };
}
