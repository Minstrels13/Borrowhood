import { requireSupabase } from './supabase';
import { pageSize } from '../config/items';
import { compressImage } from './compressImage';

const itemFields = '*, available_now, item_photos(id, storage_path, position)';

async function withOwners(items) {
  const summaries = new Map();
  await Promise.all(
    [...new Set(items.map((item) => item.owner_id))].map(async (id) => {
      const { data, error } = await requireSupabase().rpc('owner_summary', { p_owner: id });
      if (error) throw error;
      summaries.set(id, data[0] || null);
    }),
  );
  return items.map((item) => ({
    ...item,
    item_photos: [...item.item_photos].sort((a, b) => a.position - b.position),
    owner: summaries.get(item.owner_id),
  }));
}

export async function getItems({ search = '', filters, sort = 'newest', offset = 0, ownerId }) {
  const source =
    filters?.available && !ownerId
      ? requireSupabase().rpc('available_items', {}, { count: 'exact' })
      : requireSupabase().from('items');
  let query = source
    .select(ownerId ? `${itemFields}, request_counts` : itemFields, { count: 'exact' })
    .is('deleted_at', null);
  if (ownerId) query = query.eq('owner_id', ownerId);
  else query = query.eq('is_active', true);
  if (search.trim()) query = query.ilike('title', `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`);
  if (filters?.categories.length) query = query.in('category', filters.categories);
  if (filters?.types.length) query = query.in('listing_type', filters.types);
  if (filters?.available) query = query.eq('is_active', true);
  query =
    sort === 'title'
      ? query.order('title').order('id')
      : query.order('created_at', { ascending: false }).order('id', { ascending: false });
  const { data, count, error } = await query.range(offset, offset + pageSize - 1);
  if (error)
    throw new Error(
      error.code === 'PGRST205'
        ? 'Listings are temporarily unavailable. Please try again later.'
        : error.message,
    );
  return { items: await withOwners(data), total: count };
}

export async function getItem(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await requireSupabase()
    .from('items')
    .select(itemFields)
    .eq('id', id)
    .maybeSingle();
  if (error)
    throw new Error(
      error.code === 'PGRST205'
        ? 'This item is temporarily unavailable. Please try again later.'
        : error.message,
    );
  if (!data || data.deleted_at) return null;
  return (await withOwners([data]))[0];
}

export async function itemPhotoUrl(path) {
  if (!path) return null;
  const { data, error } = await requireSupabase()
    .storage.from('item-photos')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadItemPhoto(ownerId, file) {
  const photo = await compressImage(file);
  const path = `${ownerId}/${crypto.randomUUID()}.jpg`;
  const { error } = await requireSupabase().storage.from('item-photos').upload(path, photo, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeItemPhotos(paths) {
  if (!paths.length) return;
  const { error } = await requireSupabase().storage.from('item-photos').remove(paths);
  if (error) throw error;
}

export async function saveItem(id, values, photos) {
  const { data, error } = await requireSupabase().rpc('save_item', {
    p_id: id || null,
    p_values: values,
    p_photos: photos,
  });
  if (error) throw error;
  return data;
}

export async function deleteItem(id) {
  const { error } = await requireSupabase().rpc('delete_item', { p_item: id });
  if (error) throw error;
}
