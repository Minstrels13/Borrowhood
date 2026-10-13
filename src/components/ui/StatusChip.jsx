export const statuses = {
  requested: 'Requested',
  approved: 'Approved',
  handed_over: 'Handed over',
  returned: 'Returned',
  overdue: 'Overdue',
  declined: 'Declined',
  cancelled: 'Cancelled',
};
export default function StatusChip({ status }) {
  return <span className={`chip status--${status}`}>{statuses[status] || status}</span>;
}
