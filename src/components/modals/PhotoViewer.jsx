import { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

export default function PhotoViewer({ photo, title, total, onClose }) {
  const [actualSize, setActualSize] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Photo ${photo.index + 1} of ${total}`}
      className="photo-viewer"
    >
      <div
        className={`photo-viewer__viewport${actualSize ? ' photo-viewer__viewport--actual' : ''}`}
        tabIndex={actualSize && !failed ? 0 : undefined}
        role="region"
        aria-label={actualSize ? 'Actual size photo. Scroll to explore.' : 'Full photo'}
      >
        {failed ? (
          <p role="alert">This photo could not be loaded. Close the viewer and retry the photo.</p>
        ) : (
          <img
            className="photo-viewer__image"
            src={photo.url}
            alt={`Photo ${photo.index + 1} of ${title}`}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="photo-viewer__controls">
        <Button
          variant="secondary"
          disabled={failed}
          aria-pressed={actualSize}
          onClick={() => setActualSize((value) => !value)}
        >
          {actualSize ? 'Fit to screen' : 'Actual size'}
        </Button>
      </div>
    </Modal>
  );
}
