import { useEffect, useState } from 'react';
import { conditionPhotoUrl } from '../../lib/requests';
import { formatDate, manilaToday } from '../../lib/dates';
import { conditions } from '../modals/RequestActionModal';
import PhotoViewer from '../modals/PhotoViewer';
import Button from '../ui/Button';

export default function ConditionRecord({ request, event }) {
  const handover = event === 'handover';
  const path = handover ? request.handover_photo_path : request.return_photo_path;
  const timestamp = handover ? request.handed_over_at : request.returned_at;
  const notes = handover ? request.handover_notes : request.return_notes;
  const clock = timestamp
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(timestamp))
    : '';
  const [src, setSrc] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [viewing, setViewing] = useState(false);
  useEffect(() => {
    let active = true;
    setSrc(null);
    setError('');
    if (!path) return;
    conditionPhotoUrl(path)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setError('Photo unavailable.');
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return (
    <section className="condition-record">
      <header className="condition-record__header">
        <div className="condition-record__heading">
          <h3>{handover ? 'At handover' : 'At return'}</h3>
        </div>
        {timestamp ? (
          <p className="condition-record__date">
            <time dateTime={timestamp}>
              {formatDate(manilaToday(new Date(timestamp)))}
              <span>{clock} · Manila</span>
            </time>
          </p>
        ) : (
          <p className="condition-record__date">Not recorded yet</p>
        )}
      </header>
      <div className="condition-record__media">
        {timestamp && path ? (
          error ? (
            <div role="alert">
              <p>{error}</p>
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                Retry photo
              </Button>
            </div>
          ) : src ? (
            <button
              type="button"
              className="item-photo__open condition-record__open"
              aria-label={`Enlarge ${handover ? 'handover' : 'return'} condition photo`}
              onClick={() => setViewing(true)}
            >
              <img
                className="condition-record__photo"
                src={src}
                alt={`${handover ? 'Handover' : 'Return'} condition`}
                onError={() => setError('Photo unavailable.')}
              />
            </button>
          ) : (
            <p role="status">Loading photo…</p>
          )
        ) : (
          <p className="muted">
            {timestamp ? 'No photo added' : `Awaiting ${handover ? 'handover' : 'return'}`}
          </p>
        )}
      </div>
      <div className="condition-record__notes">
        <div className="condition-record__heading">
          <h4>Notes</h4>
          {!handover && timestamp && (
            <span className="chip">{conditions[request.return_condition]}</span>
          )}
        </div>
        <p className="preserve-lines">
          {timestamp
            ? notes || 'No additional notes.'
            : `Recorded when the owner confirms ${handover ? 'handover' : 'return'}.`}
        </p>
        {src && !error && <p className="small muted">Click photo to enlarge</p>}
      </div>
      {viewing && src && (
        <PhotoViewer
          photo={{ url: src, index: 0 }}
          title={`${handover ? 'Handover' : 'Return'} condition`}
          total={1}
          onClose={() => setViewing(false)}
        />
      )}
    </section>
  );
}
