import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import Icon from '../ui/Icon';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
  className = '',
}) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const viewer = size === 'viewer' || className.split(' ').includes('photo-viewer');
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  function outsideClick(event) {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      onClose();
  }
  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}${viewer ? ' modal--viewer' : ' modal--sheet'} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open && !ref.current?.open) onClose();
      }}
      onClick={outsideClick}
    >
      {!viewer && <div className="modal__handle" aria-hidden="true" />}
      <header className="modal__header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="modal__body">
        {description && <p id={descriptionId}>{description}</p>}
        {children}
      </div>
      {footer && <footer className="modal__footer">{footer}</footer>}
    </dialog>
  );
}
