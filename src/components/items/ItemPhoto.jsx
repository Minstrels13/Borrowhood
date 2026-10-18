import { useEffect, useState } from 'react';
import { itemPhotoUrl } from '../../lib/items';
import ImagePlaceholder from '../ui/ImagePlaceholder';
import Button from '../ui/Button';

export default function ItemPhoto({ path, src, alt, retryable = true, onOpen, loading = 'lazy' }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (src || !path) return;
    itemPhotoUrl(path)
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path, src, revision]);
  return (
    <div className="item-photo">
      {(src || url) && !failed ? (
        onOpen ? (
          <button
            type="button"
            className="item-photo__open"
            aria-label={`Enlarge ${alt}`}
            onClick={() => onOpen(src || url)}
          >
            <img src={src || url} alt={alt} loading={loading} onError={() => setFailed(true)} />
          </button>
        ) : (
          <img src={src || url} alt={alt} loading={loading} onError={() => setFailed(true)} />
        )
      ) : (
        <ImagePlaceholder
          icon="landscape"
          className={failed ? 'image-placeholder--failed' : ''}
          label={failed ? 'Photo unavailable' : path ? 'Loading photo…' : 'No photo'}
        />
      )}
      {failed && retryable && (
        <Button variant="ghost" onClick={() => setRevision((value) => value + 1)}>
          Retry photo
        </Button>
      )}
    </div>
  );
}
