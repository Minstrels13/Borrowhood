import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { itemPhotoUrl } from '../../lib/items';

export default function PhotoViewer({ photo, title, total, onClose, photos }) {
  const [current, setCurrent] = useState(photo);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const [actualSize, setActualSize] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function change(index) {
    const ticket = ++generation.current;
    setCurrent({ index, url: null });
    setLoading(true);
    setFailed(false);
    setActualSize(false);
    try {
      const url = await itemPhotoUrl(photos[index].storage_path);
      if (ticket === generation.current) setCurrent({ index, url });
    } catch {
      if (ticket === generation.current) setFailed(true);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Photo ${current.index + 1} of ${total}`}
      size="viewer"
      className="photo-viewer"
    >
      <p className="sr-only" role="status">Photo {current.index + 1} of {total}</p>
      <div
        className={`photo-viewer__viewport${actualSize ? ' photo-viewer__viewport--actual' : ''}`}
        tabIndex={actualSize && !failed ? 0 : undefined}
        role="region"
        aria-label={actualSize ? 'Actual size photo. Scroll to explore.' : 'Full photo'}
      >
        {loading ? (
          <p role="status">Loading photo…</p>
        ) : failed ? (
          <div role="alert">
            <p>This photo could not be loaded.</p>
            {photos ? (
              <Button variant="secondary" onClick={() => change(current.index)}>
                Retry photo
              </Button>
            ) : (
              <p>Close the viewer and retry the photo.</p>
            )}
          </div>
        ) : (
          <img
            className="photo-viewer__image"
            src={current.url}
            alt={`Photo ${current.index + 1} of ${title}`}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="photo-viewer__controls">
        {photos && total > 1 && (
          <Button
            variant="secondary"
            aria-label="Previous photo"
            disabled={loading || current.index === 0}
            onClick={() => change(current.index - 1)}
          >
            Previous
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={failed || loading}
          aria-pressed={actualSize}
          onClick={() => setActualSize((value) => !value)}
        >
          {actualSize ? 'Fit to screen' : 'Actual size'}
        </Button>
        {photos && total > 1 && (
          <Button
            variant="secondary"
            aria-label="Next photo"
            disabled={loading || current.index === total - 1}
            onClick={() => change(current.index + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </Modal>
  );
}
