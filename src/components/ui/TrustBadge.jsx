export const trustLevels = { new: 'New', reliable: 'Reliable', trusted: 'Trusted', needs_attention: 'Needs attention' };
export default function TrustBadge({ level }) {
  return <span className={`chip trust--${level}`}><span className="badge-dot" aria-hidden="true" />{trustLevels[level] || level}</span>;
}

