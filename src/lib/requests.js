import { requireSupabase } from './supabase';
import { compressImage } from './compressImage';
import { pageSize } from '../config/items';

export async function getAvailability(itemId) {
  const { data, error } = await requireSupabase().rpc('item_availability', { p_item: itemId });
  if (error) throw error;
  return data;
}

export async function createRequest(itemId, dates, message) {
  const { data, error } = await requireSupabase().rpc('create_request', {
    p_item: itemId,
    p_start: dates.start,
    p_end: dates.end,
    p_message: message,
  });
  if (error) throw error;
  return data;
}

export async function getRequest(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await requireSupabase().rpc('request_detail', { p_request: id });
  if (error) throw error;
  return data;
}

export async function getRequests(userId, role, offset = 0) {
  const { data, count, error } = await requireSupabase()
    .from('requests')
    .select(
      'id, reference, status, start_date, end_date, created_at, item:items(title, listing_type, price_label)',
      { count: 'exact' },
    )
    .eq(role === 'lending' ? 'owner_id' : 'borrower_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  return { requests: data, total: count };
}

export async function transitionRequest(id, action, values = {}) {
  const { error } = await requireSupabase().rpc('transition_request', {
    p_request: id,
    p_action: action,
    p_values: values,
  });
  if (error) throw error;
}

export async function uploadConditionPhoto(ownerId, requestId, event, file) {
  const photo = await compressImage(file);
  const path = `${ownerId}/${requestId}/${event}/${crypto.randomUUID()}.jpg`;
  const { error } = await requireSupabase().storage.from('condition-photos').upload(path, photo, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeConditionPhoto(path) {
  if (!path) return;
  const { error } = await requireSupabase().storage.from('condition-photos').remove([path]);
  if (error) throw error;
}

export async function conditionPhotoUrl(path) {
  const { data, error } = await requireSupabase()
    .storage.from('condition-photos')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
