import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import Modal from '../components/modals/Modal';
import Button from '../components/ui/Button';

const DraftContext = createContext(null);

export function DraftProvider({ children }) {
  const entries = useRef(new Map());
  const [confirmation, setConfirmation] = useState(null);
  const [, refresh] = useState(0);
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      `${currentLocation.pathname}${currentLocation.search}` !==
        `${nextLocation.pathname}${nextLocation.search}` &&
      [...entries.current.values()].some((entry) => entry.dirty || entry.busy),
    [],
  );
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    function beforeUnload(event) {
      if ([...entries.current.values()].some((entry) => entry.dirty || entry.busy)) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  const register = useCallback((id, entry) => {
    const previous = entries.current.get(id);
    if (entry.dirty || entry.busy) entries.current.set(id, entry);
    else entries.current.delete(id);
    if (previous?.dirty !== entry.dirty || previous?.busy !== entry.busy)
      refresh((value) => value + 1);
  }, []);
  const remove = useCallback((id) => {
    if (entries.current.delete(id)) refresh((value) => value + 1);
  }, []);
  const confirmAction = useCallback((action, onlyId) => {
    const guards = onlyId
      ? [entries.current.get(onlyId)].filter(Boolean)
      : [...entries.current.values()];
    if (guards.some((entry) => entry.dirty || entry.busy)) setConfirmation({ action, onlyId });
    else void action();
  }, []);
  const blocked = blocker.state === 'blocked';
  const guards = confirmation?.onlyId
    ? [entries.current.get(confirmation.onlyId)].filter(Boolean)
    : [...entries.current.values()];
  const busy = guards.some((entry) => entry.busy);
  const guarding = guards.some((entry) => entry.dirty || entry.busy);
  useEffect(() => {
    if (guarding) return;
    if (blocked) blocker.reset();
    if (confirmation) setConfirmation(null);
  }, [guarding, blocked, blocker, confirmation]);
  function stay() {
    setConfirmation(null);
    if (blocked) blocker.reset();
  }
  function discard() {
    if (busy) return;
    if (confirmation?.onlyId) entries.current.delete(confirmation.onlyId);
    else entries.current.clear();
    const action = confirmation?.action;
    setConfirmation(null);
    if (blocked) blocker.proceed();
    else if (action) void action();
  }
  return (
    <DraftContext.Provider value={{ register, remove, confirmAction }}>
      {children}
      <Modal
        open={blocked || Boolean(confirmation)}
        title={busy ? 'Saving your changes' : 'Discard unsaved changes?'}
        onClose={stay}
      >
        <p>
          {busy
            ? 'Please wait until saving finishes before leaving this screen.'
            : 'You have unsaved changes. Stay to keep editing, or discard them and continue.'}
        </p>
        <div className="actions">
          <Button variant="secondary" onClick={stay}>
            Stay here
          </Button>
          {!busy && <Button onClick={discard}>Discard and continue</Button>}
        </div>
      </Modal>
    </DraftContext.Provider>
  );
}

export const useDraftNavigation = () =>
  useContext(DraftContext)?.confirmAction || ((action) => action());
export const useDraftRegistry = () => useContext(DraftContext);
