// Run with node --env-file=.env scripts/check-backend.mjs. Never print credentials or rows.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase environment values.');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
try {
  for (const columns of [
    'id',
    'full_name,course_year_section,photo_path,role,verification_status,submitted_at,reviewed_by,reviewed_at,rejection_reason,reviewer_note',
  ]) {
    const response = await fetch(`${url}/rest/v1/profiles?select=${columns}&limit=0`, { headers });
    const body = await response.json();
    console.log(
      JSON.stringify({
        check: columns === 'id' ? 'profiles' : 'phase2-columns',
        httpStatus: response.status,
        code: body?.code || null,
      }),
    );
  }
  const response = await fetch(`${url}/rest/v1/rpc/has_confirmed_email`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await response.json();
  console.log(
    JSON.stringify({
      check: 'confirmation-helper',
      httpStatus: response.status,
      code: body?.code || null,
    }),
  );
} catch {
  console.error('Supabase connection failed. Check network access and project settings.');
  process.exitCode = 1;
}
