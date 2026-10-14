import {
  daysLate,
  formatDate,
  formatTimestamp,
  manilaToday,
  requestStatus,
  returnedLate,
} from './dates.js';

export function canRequestAgain(request) {
  return !request || request.status === 'declined';
}

export function requestState(request, isOwner, today) {
  const status = requestStatus(request, today);
  const owner = request.owner.full_name;
  const borrower = request.borrower.full_name;
  const due = formatDate(request.end_date);
  const start = formatDate(request.start_date);
  if (status === 'requested')
    return isOwner
      ? {
          text: `Review ${borrower}'s dates and message, then approve or decline.`,
          actions: ['approve', 'decline'],
        }
      : {
          text: `Waiting for ${owner} to respond. You will see the update here.`,
          actions: ['cancel'],
        };
  if (status === 'approved')
    return isOwner
      ? {
          text: `Meet ${borrower} on ${start}. Confirm handover once the item is in their hands.`,
          actions: ['handover'],
        }
      : {
          text: `${owner} approved your request. Meet on ${start}. ${request.item.meetup_note || 'Agree on a public meetup spot with the owner.'}`,
          actions: ['cancel'],
        };
  if (status === 'overdue')
    return isOwner
      ? {
          text: `Due ${due}, ${daysLate(request, today)} day${daysLate(request, today) === 1 ? '' : 's'} late. Confirm return when you have the item.`,
          actions: ['return'],
        }
      : { text: 'This is overdue. Please return it as soon as possible.', actions: [] };
  if (status === 'handed_over')
    return isOwner
      ? {
          text: `The item is with ${borrower}. Due ${due}. Confirm return once you have the item.`,
          actions: ['return'],
        }
      : { text: `You have the item. Return it by ${due}.`, actions: [] };
  if (status === 'returned')
    return {
      text: isOwner
        ? `Completed on ${formatDate(manilaToday(new Date(request.returned_at)))}. ${returnedLate(request) ? 'The return was late.' : 'The return was on time.'}`
        : 'Completed. Thanks for returning it.',
      actions: [],
    };
  if (status === 'declined')
    return {
      text: `${isOwner ? 'You declined this request.' : `${owner} declined your request.`} ${request.decline_reason}${request.decline_note ? ` ${request.decline_note}` : ''}`,
      actions: isOwner ? [] : ['browse'],
    };
  return {
    text: `This request was cancelled on ${formatTimestamp(request.cancelled_at)}.`,
    actions: [],
  };
}
