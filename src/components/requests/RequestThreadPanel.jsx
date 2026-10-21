import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useRequestThread from '../../hooks/useRequestThread';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { messageLength } from '../../lib/messages';
import { formatTimestamp } from '../../lib/dates';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Skeleton from '../ui/Skeleton';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';

const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
const calendar = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
const validTime = (value) => value && Number.isFinite(Date.parse(value));
const shortTime = (value) => validTime(value) ? clock.format(new Date(value)) : 'Not recorded';
const messageDay = (value) => validTime(value) ? dayKey.format(new Date(value)) : 'unknown';

export default function RequestThreadPanel(props) {
  const { user, isVerified, isAdmin } = useAuth();
  if (!user || !isVerified || isAdmin || ![props.request.owner_id, props.request.borrower_id].includes(user.id)) return null;
  return <Thread key={`${user.id}:${props.request.id}:${isVerified}:${isAdmin}`} {...props} userId={user.id} />;
}

function Thread({ request, userId, onStatusChange }) {
  const thread = useRequestThread(request, onStatusChange);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const composer = useRef(null);
  const submitting = useRef(false);
  const explanation = useRef(null);
  const list = useRef(null);
  const viewport = useRef(null);
  const pinned = useRef(true);
  const initialLoad = useRef(true);
  const scrollIntent = useRef(null);
  const earlierButton = useRef(null);
  const notify = useToast();
  const draft = useUnsavedChanges(Boolean(text), thread.sending);
  const count = messageLength(text);
  const canSend = thread.data?.can_send && !thread.loading && !thread.error && !thread.denied;
  const terminal = ['returned', 'declined', 'cancelled'].includes(thread.data?.request_status);
  const atCap = thread.data && thread.data.message_count >= thread.data.limit;
  const readonly = terminal || atCap;
  const sendDisabled = thread.sending || thread.loading || (!thread.pending && (!canSend || !count || count > 1000));
  const entries = thread.data?.entries || [];
  const previewStart = Math.max(0, entries.length - 3);
  useLayoutEffect(() => {
    const area = viewport.current;
    if (!area || !thread.data) return;
    if (scrollIntent.current === 'earlier') return;
    if (initialLoad.current || scrollIntent.current === 'bottom' || pinned.current) {
      area.scrollTop = area.scrollHeight;
      pinned.current = true;
    }
    initialLoad.current = false;
    scrollIntent.current = null;
  }, [thread.data, expanded]);
  useEffect(() => {
    const area = viewport.current;
    if (!area || !list.current) return undefined;
    // Keep the newest bubble visible when fonts or panel width change after loading.
    const observer = new ResizeObserver(() => {
      if (pinned.current && scrollIntent.current !== 'earlier') area.scrollTop = area.scrollHeight;
    });
    observer.observe(list.current);
    observer.observe(area);
    return () => observer.disconnect();
  }, [Boolean(thread.data)]);
  useEffect(() => {
    if (thread.data && !thread.loading && !thread.error) setUpdatedAt(new Date().toISOString());
  }, [thread.data, thread.loading, thread.error]);
  useEffect(() => { if (thread.denied) setText(''); }, [thread.denied]);
  async function submit(event) {
    event.preventDefault();
    if (sendDisabled || submitting.current) return;
    submitting.current = true;
    try {
    const entry = await thread.send(text);
    if (!entry) return;
    setText(''); draft.saved(); notify('Message sent.');
    scrollIntent.current = 'bottom';
    const fresh = await thread.read();
    requestAnimationFrame(() => {
      if (fresh?.can_send) composer.current?.focus({ preventScroll: true });
      else explanation.current?.focus({ preventScroll: true });
    });
    } finally { submitting.current = false; }
  }
  async function earlier() {
    const anchor = list.current?.firstElementChild?.querySelector('.request-thread__bubble');
    const top = anchor?.getBoundingClientRect().top;
    const button = earlierButton.current;
    pinned.current = false;
    scrollIntent.current = 'earlier';
    const result = await thread.read('earlier');
    if (!result) { scrollIntent.current = null; return; }
    requestAnimationFrame(() => {
      if (anchor?.isConnected && top != null && viewport.current)
        viewport.current.scrollTop += anchor.getBoundingClientRect().top - top;
      if (button?.isConnected) button.focus({ preventScroll: true });
      else viewport.current?.focus({ preventScroll: true });
      scrollIntent.current = null;
    });
  }
  return (
    <section className={`request-message request-thread${expanded ? '' : ' request-thread--preview'}`} aria-label="Messages" aria-busy={thread.loading || thread.sending}>
      <header className="request-thread__heading">
        <div><h2>Messages</h2><span className="small muted">Manila time</span></div>
        <div className="request-thread__refresh"><span className="small muted">{updatedAt ? `Updated ${shortTime(updatedAt)}` : 'Not updated yet'}</span><Button variant="ghost" aria-label="Refresh messages" title="Refresh messages; also updates when you return to the tab" disabled={thread.loading || thread.sending} onClick={() => thread.read()}>Refresh</Button></div>
      </header>
      <p className="request-thread__privacy muted">Private to both · Updates on refresh</p>
      <p className="sr-only" role="status">{thread.announcement}</p>
      {thread.loading && <><p role="status">Loading messages…</p>{!thread.data && <Skeleton variant="text" lines={3} />}</>}
      {thread.error && <div role="alert"><p>{thread.error}</p><Button variant="secondary" disabled={thread.loading || thread.sending} onClick={() => thread.operation === 'earlier' ? earlier() : thread.read()}>Retry</Button></div>}
      {thread.data && !thread.denied && <>
        {(entries.length > 3 || thread.data.has_earlier) && <Button className="request-thread__toggle" variant="ghost" aria-expanded={expanded} onClick={() => {
          scrollIntent.current = 'bottom'; setExpanded((value) => !value);
        }}>{expanded ? 'Show latest 3' : 'View all messages'}</Button>}
        <div className="request-thread__viewport" ref={viewport} role="log" aria-label="Message history" aria-live="polite" aria-relevant="additions" aria-atomic="false" tabIndex={0}
          onScroll={(event) => {
            const area = event.currentTarget;
            const bottom = Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
            if (document.activeElement === area) pinned.current = bottom;
            else if (pinned.current && !bottom) requestAnimationFrame(() => {
              if (pinned.current) area.scrollTop = area.scrollHeight;
            });
          }}
          onWheel={(event) => {
            if (event.deltaY < 0) pinned.current = false;
            else requestAnimationFrame(() => {
              const area = viewport.current;
              if (area) pinned.current = Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
            });
          }}
          onTouchMove={() => { pinned.current = false; }}
          onPointerDown={() => { pinned.current = false; }}
          onPointerUp={() => requestAnimationFrame(() => {
            const area = viewport.current;
            if (area) pinned.current = Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
          })}
          onKeyDown={(event) => {
            if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
              pinned.current = false;
              requestAnimationFrame(() => {
                const area = viewport.current;
                if (area) pinned.current = Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
              });
            }
          }}>
          {thread.data.has_earlier && <Button className="request-thread__earlier" ref={earlierButton} variant="ghost" disabled={thread.loading || thread.sending} onClick={earlier}>Load earlier</Button>}
          <ol className="request-thread__list" ref={list}>
            {entries.map((entry, index) => {
              const previous = entries[index - 1];
              const newDay = !previous || messageDay(previous.created_at) !== messageDay(entry.created_at);
              const groupStart = newDay || previous.sender_id !== entry.sender_id;
              const previewBoundary = index === previewStart;
              const old = index < previewStart ? ' request-thread__entry--older' : '';
              const sender = entry.sender_id === userId ? 'You' : entry.sender_id === request.owner_id ? request.owner.full_name : request.borrower.full_name;
              return <li key={`${entry.kind}:${entry.id}`} className={`request-thread__entry${entry.sender_id === userId ? ' request-thread__entry--self' : ''}${old}`}>
                {(newDay || previewBoundary) && <div className={`request-thread__date${newDay ? '' : ' request-thread__preview-label'}`}><span>{validTime(entry.created_at) ? calendar.format(new Date(entry.created_at)) : 'Date not recorded'}</span></div>}
                <div className="request-thread__bubble-wrap">
                  {(groupStart || previewBoundary) && <strong className={`request-thread__sender${groupStart ? '' : ' request-thread__preview-label'}`}>{sender}</strong>}
                  <div className="request-thread__bubble">
                    {entry.kind === 'opening' && <span className="request-thread__opening">Opening message</span>}
                    <p className="preserve-lines">{entry.body}</p>
                  </div>
                  <time className="request-thread__time" dateTime={validTime(entry.created_at) ? entry.created_at : undefined} title={formatTimestamp(entry.created_at)}>{shortTime(entry.created_at)}</time>
                </div>
              </li>;
            })}
          </ol>
          {!thread.loading && !thread.error && !entries.length && <p className="request-thread__empty">No messages yet. Arrange your meetup here.</p>}
        </div>
        <p ref={explanation} tabIndex={-1} className="small muted">{atCap
          ? '200-message limit reached. Messages are read-only.'
          : terminal ? `Request ${thread.data.request_status} · Messages are read-only.` : ''}</p>
        {(!readonly || text || thread.pending) && <form className="request-thread__compose" onSubmit={submit}>
          <Field label={readonly ? 'Unsent draft' : 'Your message'} hint={`${count} / 1000 characters · Enter to send · Shift+Enter for a new line`} error={count > 1000 ? 'Keep your message within 1000 characters.' : ''}>
            {(props) => <div className="request-thread__input">
              <textarea {...props} ref={composer} value={text} readOnly={readonly || Boolean(thread.pending)} disabled={thread.sending} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                event.preventDefault();
                if (!event.repeat && !sendDisabled) event.currentTarget.form.requestSubmit();
              }} />
              <Button className="request-thread__send" type="submit" aria-label={thread.sending ? 'Sending message' : thread.pending ? 'Retry message' : 'Send message'} title={thread.pending ? 'Retry message' : 'Send message'} disabled={sendDisabled}><Icon name="send" /></Button>
            </div>}
          </Field>
          {thread.sending && <p role="status">Sending message…</p>}
          {thread.sendError && <p role="alert">{thread.sendError}</p>}
          <div className="actions">
            {text && !thread.pending && <Button type="button" variant="ghost" disabled={thread.sending} onClick={() => draft.close(() => {
              setText('');
              requestAnimationFrame(() => (readonly ? explanation.current : composer.current)?.focus());
            })}>Discard draft</Button>}
          </div>
        </form>}
      </>}
    </section>
  );
}
