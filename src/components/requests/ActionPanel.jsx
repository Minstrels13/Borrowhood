import Button from '../ui/Button';
import { requestState } from '../../lib/requestStates';

const labels = {
  approve: 'Approve request',
  decline: 'Decline request',
  cancel: 'Cancel request',
  handover: 'Confirm handover',
  return: 'Confirm return',
  browse: 'Browse other items',
};

export default function ActionPanel({ request, isOwner, today, busy, onAction, error }) {
  const state = requestState(request, isOwner, today);
  return (
    <section className="notice-card request-action-panel" aria-busy={busy}>
      <h2>What happens next</h2>
      <p className="preserve-lines">{state.text}</p>
      {isOwner && request.status === 'requested' && (
        <p className="small muted">
          Approving reserves these dates and automatically declines overlapping pending requests for
          this item.
        </p>
      )}
      <div className="actions">
        {state.actions.map((action) =>
          action === 'browse' ? (
            <Button key={action} to="/shelf">
              {labels[action]}
            </Button>
          ) : (
            <Button
              key={action}
              variant={action === 'decline' || action === 'cancel' ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={() => onAction(action)}
            >
              {busy && action === 'approve' ? 'Saving…' : labels[action]}
            </Button>
          ),
        )}
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
