import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import usePagedResource from '../../hooks/usePagedResource';
import { getComments, postComment } from '../../lib/comments';
import { formatTimestamp } from '../../lib/dates';
import Button from '../ui/Button';
import ProfilePhoto from '../ui/ProfilePhoto';
import Field from '../ui/Field';
import Chip from '../ui/Chip';
import Skeleton from '../ui/Skeleton';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';
import { useToast } from '../ui/Toast';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

export default function CommentList({ itemId, ownerId }) {
  const { isVerified, isAdmin, user, profile } = useAuth();
  return (
    <ListingComments
      key={`${itemId}:${user?.id || 'guest'}:${isAdmin}`}
      itemId={itemId}
      ownerId={ownerId}
      isVerified={isVerified}
      isAdmin={isAdmin}
      profile={profile}
    />
  );
}

function ListingComments({ itemId, ownerId, isVerified, isAdmin, profile }) {
  const fetchPage = useCallback((offset) => getComments(itemId, offset), [itemId]);
  const list = usePagedResource(fetchPage);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wall, setWall] = useState(false);
  const notify = useToast();
  const draft = useUnsavedChanges(Boolean(body.trim()), busy);
  async function submit(event) {
    event.preventDefault();
    if (isAdmin) return;
    if (!isVerified) {
      setWall(true);
      return;
    }
    if (busy || !body.trim()) return;
    setBusy(true);
    setError('');
    try {
      await postComment(itemId, body);
      draft.saved();
      setBody('');
      notify('Comment posted.');
      await list.refresh();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="listing-comments">
      <div className="section-heading">
        <h2>Questions and comments</h2>
        <Button variant="secondary" disabled={list.loading || busy} onClick={list.refresh}>
          Refresh comments
        </Button>
      </div>
      {list.error && (
        <div role="alert">
          <p>{list.error}</p>
          <Button variant="secondary" onClick={list.refresh}>
            Try again
          </Button>
        </div>
      )}
      {isAdmin && <p className="small muted">Admin accounts can read comments but cannot post them.</p>}
      {isVerified && !isAdmin && (
        <form className="comment-compose" onSubmit={submit}>
          <ProfilePhoto path={profile?.photo_path} name={profile?.full_name} size="sm" decorative />
          <Field label="Your comment" id="new-comment" required>
            <textarea
              id="new-comment"
              rows={1}
              maxLength={1500}
              required
              placeholder="Ask the owner a question"
              aria-describedby="comment-guidance"
              value={body}
              disabled={busy}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <p className="small muted" id="comment-guidance">
            Keep questions relevant and respectful. Comments cannot be edited or deleted.
          </p>
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
          <Button type="submit" busy={busy} disabled={!body.trim()}>
            {busy ? 'Posting…' : 'Post'}
          </Button>
        </form>
      )}
      {!list.loading && !list.error && !list.entries.length && (
        <p>{isAdmin ? 'No comments yet.' : 'No comments yet. Ask a question about this item.'}</p>
      )}
      <ul className="comment-list">
        {list.entries.map((comment) => (
          <li className="comment" key={comment.id}>
            <div className="owner-summary">
              <ProfilePhoto path={comment.author.photo_path} name={comment.author.full_name} size="sm" />
              <strong className="comment-author">{comment.author.full_name}</strong>
              {ownerId && comment.author.id === ownerId && <Chip label="Owner" />}
            </div>
            <p className="small muted">{formatTimestamp(comment.created_at)} (Manila)</p>
            <p className="preserve-lines">{comment.body}</p>
          </li>
        ))}
      </ul>
      {list.loading && <><Skeleton variant="text" lines={2} /><p className="sr-only" role="status">Loading comments…</p></>}
      {list.entries.length < list.total && (
        <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>
          Load more comments
        </Button>
      )}
      {!isVerified && !isAdmin && <Button onClick={() => setWall(true)}>Ask a question</Button>}
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} returnTo={`/items/${itemId}`} />
    </section>
  );
}
