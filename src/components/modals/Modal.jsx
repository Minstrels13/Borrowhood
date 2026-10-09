import { useEffect, useId, useRef } from 'react';
import Icon from '../ui/Icon';
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null); const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  function outsideClick(event) {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClose={() => { if (open) onClose(); }} onClick={outsideClick}>
    <header className="modal__header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
    <div className="modal__body">{children}</div>
  </dialog>;
}

