import Icon from './Icon';

export default function ImagePlaceholder({ label = 'No photo', className = '', icon }) {
  return (
    <div className={`image-placeholder ${icon ? 'image-placeholder--icon' : ''} ${className}`} role="img" aria-label={label}>
      {icon && <Icon name={icon} />}
      <span>{label}</span>
    </div>
  );
}
