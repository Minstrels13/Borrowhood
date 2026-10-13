import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { photoUrl } from '../../lib/profiles';

export default function ProfilePhoto({ path, name, size = 'md' }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setSrc(null);
    setFailed(false);
    photoUrl(path)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <div>
      <Avatar src={src} name={name ? `${name} profile photo` : 'Your profile photo'} size={size} />
      {failed && <span className="small">Photo unavailable. Refresh to retry.</span>}
    </div>
  );
}
