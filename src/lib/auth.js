import { requireSupabase } from './supabase';
import { rulesVersion } from '../config/communityRules';
export const isStudentEmail = email => /^[^@\s]+@ms\.bulsu\.edu\.ph$/i.test(email.trim());
export async function signUp({ name, course, email, password, accepted }) {
  if (!isStudentEmail(email)) throw new Error('Use your @ms.bulsu.edu.ph student email.');
  if (name.trim().length < 2 || course.trim().length < 2) throw new Error('Enter your full name and course, year and section.');
  if (!accepted) throw new Error('Please agree to the community rules.');
  const { data, error } = await requireSupabase().auth.signUp({ email: email.trim().toLowerCase(), password,
    options: { emailRedirectTo: `${window.location.origin}/pending`, data: { full_name: name.trim(), course_year_section: course.trim(), rules_version: rulesVersion } } });
  if (error) throw error;
  return data;
}
export async function signIn(email, password) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}
export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
export async function resendConfirmation(email) {
  const { error } = await requireSupabase().auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/pending` } });
  if (error) throw error;
}
