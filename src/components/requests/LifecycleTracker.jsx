import Icon from '../ui/Icon';

const steps = ['Requested', 'Approved', 'Handed over', 'Returned'];
export default function LifecycleTracker({ request }) {
  const reached = request.returned_at
    ? 3
    : request.handed_over_at
      ? 2
      : request.approved_at
        ? 1
        : 0;
  const terminal = request.status === 'declined' || request.status === 'cancelled';
  const completed = (index) => index < reached || Boolean(request.returned_at);
  return (
    <ol className="lifecycle" aria-label="Borrowing progress">
      {steps.map((label, index) => (
        <li
          key={label}
          className={`${index <= reached ? 'lifecycle__reached' : ''}${completed(index) ? ' lifecycle__complete' : ''}`.trim()}
          aria-current={!terminal && index === reached ? 'step' : undefined}
        >
          <span aria-hidden="true">{completed(index) ? <Icon name="check" /> : index === reached ? <span className="lifecycle__current-dot" /> : null}</span>
          <span>{label}</span>
          {completed(index) && <span className="sr-only">Completed</span>}
        </li>
      ))}
    </ol>
  );
}
