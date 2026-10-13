import { useEffect, useState } from 'react';
import { manilaToday } from '../lib/dates';

export default function useManilaToday() {
  const [today, setToday] = useState(manilaToday);
  useEffect(() => {
    let timer;
    function update() {
      clearTimeout(timer);
      const current = manilaToday();
      setToday(current);
      const midnight = Date.parse(`${current}T00:00:00+08:00`) + 86400000;
      timer = setTimeout(update, Math.max(1, midnight - Date.now()));
    }
    function visible() {
      if (document.visibilityState === 'visible') update();
    }
    update();
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return today;
}
