import { useEffect, useId, useRef } from 'react';
import { useDraftRegistry } from '../context/DraftContext';

export default function useUnsavedChanges(dirty, busy = false) {
  const id = useId();
  const registry = useDraftRegistry();
  const saved = useRef(false);
  const register = registry?.register;
  const remove = registry?.remove;
  useEffect(() => {
    if (!dirty && !busy) saved.current = false;
    register?.(id, { dirty: dirty && !saved.current, busy: busy && !saved.current });
    return () => {
      remove?.(id);
    };
  }, [dirty, busy, id, register, remove]);
  return {
    saved() {
      saved.current = true;
      remove?.(id);
    },
    close(action) {
      if (busy) return;
      if (registry) registry.confirmAction(action, id);
      else action();
    },
  };
}
