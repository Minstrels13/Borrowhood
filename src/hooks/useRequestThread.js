import { useCallback, useEffect, useRef, useState } from 'react';
import { getRequestThread, sendRequestMessage, messageError } from '../lib/messages';

// Mounted with an account/request/role key by RequestThreadPanel. No persistent private cache.
export default function useRequestThread(request, onStatusChange) {
  const [state, setState] = useState({ data: null, loading: true, error: '', operation: 'refresh' });
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(null);
  const [sendError, setSendError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const data = useRef(null);
  const active = useRef(true);
  const generation = useRef(0);
  const reading = useRef(false);
  const writing = useRef(false);
  const frozen = useRef(null);
  const queued = useRef(false);
  const parent = useRef({ status: request.status, refresh: onStatusChange });
  parent.current = { status: request.status, refresh: onStatusChange };
  const denied = useCallback((error) => {
    if (['BH_THREAD_FORBIDDEN', 'BH_THREAD_UNAVAILABLE'].includes(error.threadCode)) {
      data.current = null;
      frozen.current = null;
      setPending(null);
      setState({ data: null, loading: false, error: error.message, denied: true });
      return true;
    }
    return false;
  }, []);
  const read = useCallback(async (operation = 'refresh', clientId = null) => {
    if (reading.current || (writing.current && !clientId)) {
      if (operation === 'refresh') queued.current = true;
      return undefined;
    }
    const cursor = operation === 'earlier' ? data.current?.next_before : null;
    if (operation === 'earlier' && !cursor) return undefined;
    reading.current = true;
    const ticket = ++generation.current;
    setState((old) => ({ ...old, loading: true, error: '', operation }));
    try {
      const result = await getRequestThread(request.id, cursor, clientId);
      if (!active.current || ticket !== generation.current) return undefined;
      const previous = data.current;
      const entries = operation === 'earlier'
        ? [...new Map([...result.entries, ...(previous?.entries || [])].map((entry) => [`${entry.kind}:${entry.id}`, entry])).values()]
        : result.entries;
      data.current = { ...result, entries };
      setState({ data: data.current, loading: false, error: '', operation });
      setAnnouncement(operation === 'earlier' ? 'Earlier messages loaded.' : 'Messages refreshed; showing latest messages.');
      if (result.request_status !== parent.current.status) void parent.current.refresh?.();
      return result;
    } catch (error) {
      if (!error.threadCode) error = messageError(error);
      if (error.threadCode === 'RETRY') error.message = operation === 'earlier'
        ? "We couldn't load earlier messages. Retry." : "We couldn't load messages. Retry.";
      if (active.current && ticket === generation.current && !denied(error))
        setState((old) => ({ ...old, loading: false, error: error.message, operation }));
      return undefined;
    } finally {
      if (ticket === generation.current) reading.current = false;
    }
  }, [request.id, denied]);
  const send = useCallback(async (body) => {
    if (writing.current || reading.current) return undefined;
    writing.current = true;
    setSending(true);
    setSendError('');
    try {
      let submission = frozen.current;
      let result;
      if (submission) {
        const fresh = await read('refresh', submission.id);
        if (!fresh || !active.current) return undefined;
        if (fresh.submission) {
          if (fresh.submission.body !== submission.body) throw messageError({ message: 'BH_THREAD_STALE' });
          result = { entry: fresh.submission, created: false };
        }
        else if (!fresh.can_send) {
          frozen.current = null; setPending(null);
          setSendError('This thread is read-only. Your unsent draft has been kept.');
          return undefined;
        }
      } else {
        if (!data.current?.can_send) return undefined;
        submission = { id: crypto.randomUUID(), body: body.trim() };
        frozen.current = submission; setPending(submission);
      }
      result ||= await sendRequestMessage(request.id, submission.body, submission.id);
      if (!active.current) return undefined;
      frozen.current = null; setPending(null);
      // Confirmed save remains visible even if the following refresh fails.
      const previous = data.current;
      if (previous && result.created && !previous.entries.some((entry) => entry.id === result.entry.id && entry.kind === 'message')) {
        data.current = { ...previous, entries: [...previous.entries, result.entry],
          message_count: previous.message_count + 1,
          can_send: previous.can_send && previous.message_count + 1 < previous.limit };
        setState((old) => ({ ...old, data: data.current }));
      }
      return result.entry;
    } catch (error) {
      if (!error.threadCode) error = messageError(error);
      if (!active.current) return undefined;
      if (!denied(error)) setSendError(error.message);
      if (['BH_THREAD_VALIDATION', 'BH_THREAD_STALE', 'BH_THREAD_READ_ONLY', 'BH_THREAD_LIMIT'].includes(error.threadCode)) {
        frozen.current = null; setPending(null);
        queued.current = true;
      }
      return undefined;
    } finally {
      writing.current = false;
      if (active.current) setSending(false);
    }
  }, [request.id, read, denied]);
  useEffect(() => {
    active.current = true;
    void read();
    return () => { active.current = false; generation.current++; reading.current = false; };
  }, [read]);
  useEffect(() => {
    if (!state.loading && !sending && queued.current) {
      queued.current = false;
      void read();
    }
  }, [state.loading, sending, read]);
  const previousStatus = useRef(request.status);
  useEffect(() => {
    if (previousStatus.current === request.status) return;
    previousStatus.current = request.status;
    if (data.current?.request_status !== request.status) void read();
  }, [request.status, read]);
  useEffect(() => {
    let away = false;
    const leave = () => { away = true; };
    const regain = () => {
      if (!away || document.visibilityState === 'hidden') return;
      away = false; void read();
    };
    const visibility = () => { if (document.visibilityState === 'hidden') leave(); else regain(); };
    window.addEventListener('blur', leave);
    window.addEventListener('focus', regain);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', leave); window.removeEventListener('focus', regain);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [read]);
  return { ...state, sending, pending, sendError, announcement, read, send };
}
