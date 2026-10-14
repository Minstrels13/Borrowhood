import { requireSupabase } from './supabase';
import { serviceError } from './errors';

export async function getComments(itemId, offset = 0) {
  const { data, error } = await requireSupabase().rpc('comment_list', {
    p_item: itemId,
    p_offset: offset,
  });
  if (error) throw serviceError(error, 'Comments');
  return data;
}

export async function postComment(itemId, body) {
  const { error } = await requireSupabase().rpc('post_comment', { p_item: itemId, p_body: body });
  if (error) throw serviceError(error, 'Comments');
}
