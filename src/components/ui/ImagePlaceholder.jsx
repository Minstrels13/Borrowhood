export default function ImagePlaceholder({ label = 'No photo', className = '' }) {
  return (
    <div className={`image-placeholder ${className}`} role="img" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}
