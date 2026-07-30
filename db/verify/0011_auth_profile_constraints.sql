SELECT count(*) AS invalid_auth_profiles
FROM users
WHERE student_id !~ '^[0-9]{9}$'
   OR name <> btrim(name)
   OR name = ''
   OR school_email !~ '^[^@[:space:]]+@jbnu[.]ac[.]kr$'
   OR gender NOT IN ('female', 'male');

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'users_active_login_lookup_idx';
