import { createContext, useContext, useEffect, useRef, useState } from 'react';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState(''); const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  function notify(text) { clearTimeout(timer.current); setMessage(text); timer.current = setTimeout(() => setMessage(''), 6000); }
  return <ToastContext.Provider value={notify}>{children}<div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{message && <div className="toast"><span>{message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setMessage('')}>×</button></div>}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

