import { requireSupabase } from './supabase';
import { serviceError } from './errors';

export async function getMyProfile(id) {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select(
      'id,full_name,course_year_section,photo_path,role,verification_status,submitted_at,reviewed_by,reviewed_at,rejection_reason,created_at,updated_at',
    )
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116')
    return {
      id,
      full_name: '',
      course_year_section: '',
      photo_path: null,
      role: 'student',
      verification_status: 'pending',
      submitted_at: null,
    };
  if (error) throw error;
  return data;
}
async function rpc(name, parameters) {
  const { data, error } = await requireSupabase().rpc(name, parameters);
  if (error) throw serviceError(error, 'Account details');
  return data;
}

export const saveProfile = (name, course, photoPath) =>
  rpc('save_my_profile', { p_full_name: name, p_course: course, p_photo_path: photoPath });
export const submitProfile = () => rpc('submit_my_profile');
export const reviewStudent = (id, decision, reason, note) =>
  rpc('review_student', {
    p_id: id,
    p_decision: decision,
    p_reason: reason || null,
    p_note: note || null,
  });
export const getVerificationQueue = (status, search, offset) =>
  rpc('verification_queue', { p_status: status, p_search: search, p_offset: offset });
export const getStudentProfile = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? rpc('student_profile', { p_user: id })
    : Promise.resolve(null);
export const getProfileHistory = (id, offset = 0) =>
  rpc('profile_history', { p_user: id, p_offset: offset });
export async function photoUrl(path) {
  if (!path) return null;
  const { data, error } = await requireSupabase()
    .storage.from('profile-photos')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function uploadProfilePhoto(id, blob) {
  const path = `${id}/${crypto.randomUUID()}.jpg`;
  const { error } = await requireSupabase()
    .storage.from('profile-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
export async function removeUnusedPhoto(path) {
  if (!path) return;
  const { error } = await requireSupabase().storage.from('profile-photos').remove([path]);
  if (error) console.warn('Unused profile upload could not be removed.');
}
