import { useEffect, useId, useRef, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { fileReport, respondReport, resolveReport, reportReasons, reportOutcomes, reportFormError, textLength } from '../../lib/reports';

const titles = { file: 'Report a problem', respond: 'Respond to report', resolve: 'Resolve report' };
const confirms = { file: 'Send report', respond: 'Send response', resolve: 'Resolve report' };
const reasonHints = { not_returned: 'Borrower has kept it past the due date.', cannot_reach_borrower: 'No reply after the due date.', other: 'Details are required.' };
const outcomeHints = { settled: 'The item came back and its return was confirmed.', upheld: 'The borrower failed to return it on time.', dismissed: 'No problem found.' };

// Fresh read on opening and after any failed/uncertain mutation. Input is never discarded by Retry.
export default function ReportFormModal({ mode, requestId, reference, load, onClose, onSaved }) {
  const [snapshot, setSnapshot] = useState(null);
  const [choice, setChoice] = useState('');
  const [text, setText] = useState('');
  const [reading, setReading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const textRef = useRef(null);
  const firstChoice = useRef(null);
  const alive = useRef(true);
  const formId = useId();
  const draft = useUnsavedChanges(Boolean(choice || text), busy);
  const loadRef = useRef(load);
  loadRef.current = load;
  async function read() {
    setReading(true);
    const result = await loadRef.current();
    if (!alive.current) return;
    setReading(false);
    if (result === undefined || result === null) {
      setError("We couldn't refresh this report. Retry before continuing.");
      setNeedsRefresh(true);
    } else {
      setSnapshot(result);
      setNeedsRefresh(false);
      setError('');
    }
  }
  useEffect(() => {
    alive.current = true;
    void read();
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!reading && snapshot) (mode === 'respond' ? textRef.current : firstChoice.current)?.focus();
  }, [reading, snapshot, mode]);
  const report = mode === 'resolve' ? snapshot : snapshot?.report;
  const eligible = mode === 'file' ? snapshot?.can_file && !report
    : mode === 'respond' ? report?.status === 'open' && !report.borrower_response
      : report?.can_resolve;
  const validation = reportFormError(mode, choice, text);
  async function submit(event) {
    event.preventDefault();
    setAttempted(true);
    if (busy || reading || needsRefresh || !eligible) return;
    if (validation) {
      if ((mode === 'file' || mode === 'resolve') && !choice) firstChoice.current?.focus();
      else textRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'file') await fileReport(requestId, choice, text);
      else if (mode === 'respond') await respondReport(report, text);
      else await resolveReport(report, choice, text);
      if (!alive.current) return;
      draft.saved();
      onSaved(mode);
    } catch (failure) {
      if (alive.current) { setError(failure.message); setNeedsRefresh(true); }
    } finally { if (alive.current) setBusy(false); }
  }
  const choices = mode === 'file' ? reportReasons : reportOutcomes;
  const limit = mode === 'resolve' ? 1000 : 1500;
  return <Modal open title={titles[mode]} className="report-form" onClose={() => draft.close(onClose)}
    footer={<>
      <Button type="submit" form={formId} busy={busy} busyLabel="Saving…" disabled={reading || needsRefresh || !eligible || Boolean(validation)}>{confirms[mode]}</Button>
      <Button variant="ghost" disabled={busy} onClick={() => draft.close(onClose)}>Cancel</Button>
    </>}>
    <p>Request {reference}</p>
    {reading && <p role="status">Refreshing report…</p>}
    {!reading && snapshot && !eligible && <p role="status">{mode === 'file' && report
      ? 'A report has already been filed. Close this dialog to view it.'
      : 'This action is no longer available. Close this dialog to see the latest status.'}</p>}
    <form id={formId} onSubmit={submit}>
      {mode !== 'respond' && <fieldset disabled={busy || reading || !eligible} className="report-choices">
        <legend>{mode === 'file' ? 'Reason (required)' : 'Outcome (required)'}</legend>
        {Object.entries(choices).map(([value, label], index) => <label key={value} className="report-choice">
          <input ref={index === 0 ? firstChoice : undefined} type="radio" name={`${formId}-choice`} value={value} checked={choice === value} onChange={() => setChoice(value)} required />
          <span><strong>{label}</strong><span className="small muted">{(mode === 'file' ? reasonHints : outcomeHints)[value]}</span></span>
        </label>)}
      </fieldset>}
      <Field label={mode === 'respond' ? 'Your response' : mode === 'resolve' ? 'Note (both students can read it)' : 'Details'}
        required={mode !== 'file' || choice === 'other'} error={attempted ? validation : textLength(text) > limit ? validation : ''}
        hint={`${textLength(text)} / ${limit} characters`}>
        {(props) => <textarea {...props} ref={textRef} value={text} rows={4} disabled={busy || reading || !eligible}
          onChange={(event) => setText(event.target.value)} />}
      </Field>
    </form>
    {mode === 'file' && <p className="small muted">Only available once the item is overdue. One report per request.</p>}
    {mode === 'respond' && <p className="small muted">You can respond once while the report is open. You cannot edit it after sending. The owner and admins can read it.</p>}
    {mode === 'resolve' && <p className="small muted">Resolving does not change the trust score. Trust updates from the return record when the owner confirms it.</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="secondary" disabled={busy || reading} onClick={read}>Retry</Button></div>}
  </Modal>;
}
