import { useEffect, useState } from 'react';
import { conditionPhotoUrl } from '../../lib/requests';
import { formatTimestamp } from '../../lib/dates';
import { conditions } from '../modals/RequestActionModal';
import PhotoViewer from '../modals/PhotoViewer';
import Button from '../ui/Button';

export default function ConditionRecord({ request, event }) {
  const handover = event === 'handover';
  const path = handover ? request.handover_photo_path : request.return_photo_path;
  const timestamp = handover ? request.handed_over_at : request.returned_at;
  const notes = handover ? request.handover_notes : request.return_notes;
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
    <section className="notice-card condition-record">
      <h3>{handover ? 'At handover' : 'At return'}</h3>
      {timestamp ? (
        <>
          <p className="small muted">Recorded {formatTimestamp(timestamp)} (Manila)</p>
          {!handover && (
            <p>
              <strong>{conditions[request.return_condition]}</strong>
            </p>
          )}
          <p className="preserve-lines">{notes || 'No additional notes.'}</p>
          {path && !src && !error && <p role="status">Loading photo…</p>}
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                Retry photo
              </Button>
            </div>
          ) : (
            src && (
              <button
                type="button"
                className="item-photo__open"
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
            )
          )}
        </>
      ) : (
        <p className="muted">
          Recorded when the owner confirms {handover ? 'handover' : 'return'}.
        </p>
      )}
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
