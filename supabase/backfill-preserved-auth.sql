-- Run after all three migrations when preserving existing Auth accounts.
-- Copies signup metadata; missing details are completed in /pending after login.
insert into public.profiles(id, full_name, course_year_section)
select id, trim(raw_user_meta_data->>'full_name'), trim(raw_user_meta_data->>'course_year_section')
from auth.users
where lower(email) ~ '^[^@[:space:]]+@ms\.bulsu\.edu\.ph$'
  and char_length(trim(raw_user_meta_data->>'full_name')) between 2 and 100
  and char_length(trim(raw_user_meta_data->>'course_year_section')) between 2 and 100
on conflict (id) do nothing;
