import { useId, useRef } from 'react';
export default function Tabs({ tabs, value, onChange, children, label = 'Sections' }) {
  const id = useId(); const buttons = useRef([]);
  function keyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); onChange(tabs[next].value); buttons.current[next].focus(); }
  }
  return <div><div className="tabs" role="tablist" aria-label={label}>{tabs.map((tab, i) => <button key={tab.value} ref={node => { buttons.current[i] = node; }} role="tab" id={`${id}-tab-${tab.value}`} aria-controls={`${id}-panel`} aria-selected={value === tab.value} tabIndex={value === tab.value ? 0 : -1} onClick={() => onChange(tab.value)} onKeyDown={e => keyDown(e, i)}>{tab.label}</button>)}</div><div className="tab-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${value}`} tabIndex={0}>{children}</div></div>;
}

