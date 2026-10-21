import { requireSupabase } from './supabase';

export const messageLength = (value) => Array.from(value.trim()).length;
const copy = {
  BH_THREAD_FORBIDDEN: 'Messages are not available for your account.',
  BH_THREAD_UNAVAILABLE: 'This request thread is not available.',
  BH_THREAD_VALIDATION: 'Enter a message of 1–1000 characters.',
  BH_THREAD_READ_ONLY: 'This request is now read-only. Refresh to see its status.',
  BH_THREAD_LIMIT: 'This thread has reached its 200-message limit.',
  BH_THREAD_STALE: 'This submission conflicts with an earlier one. Refresh and review your draft.',
};
export function messageError(error) {
  const code = Object.keys(copy).find((key) => error?.message === key);
  const missing = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error?.code);
  return Object.assign(new Error(copy[code] || (missing
    ? 'Messages are not available yet. Retry later.'
    : "We couldn't confirm this action. Check your connection and retry.")), { threadCode: code || 'RETRY' });
}
async function rpc(name, args) {
  try {
    const { data, error } = await requireSupabase().rpc(name, args);
    if (error) throw error;
    if (!data) throw new Error('Missing thread result');
    return data;
  } catch (error) { throw messageError(error); }
}
export const getRequestThread = (requestId, before = null, clientId = null) => rpc('request_thread', {
  p_request: requestId, p_before_kind: before?.kind || null, p_before_at: before?.at || null,
  p_before_id: before?.id || null, p_client_id: clientId,
});
export const sendRequestMessage = (requestId, body, clientId) => rpc('send_request_message', {
  p_request: requestId, p_body: body.trim(), p_client_id: clientId,
});
