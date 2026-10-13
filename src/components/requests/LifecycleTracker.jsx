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
  return (
    <ol className="lifecycle" aria-label="Borrowing progress">
      {steps.map((label, index) => (
        <li
          key={label}
          className={index <= reached ? 'lifecycle__reached' : ''}
          aria-current={!terminal && index === reached ? 'step' : undefined}
        >
          <span aria-hidden="true">{index + 1}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
