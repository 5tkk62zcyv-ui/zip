SELECT to_regclass('public.users'), to_regclass('public.auth_sessions');

SELECT lower(btrim(school_email)), count(*)
FROM users
GROUP BY 1
HAVING count(*) > 1;

SELECT student_id, count(*)
FROM users
GROUP BY student_id
HAVING count(*) > 1;

SELECT count(*) AS invalid_users
FROM users
WHERE nullif(btrim(student_id), '') IS NULL
   OR nullif(btrim(name), '') IS NULL
   OR nullif(btrim(school_email), '') IS NULL;

SELECT count(*) AS invalid_sessions
FROM auth_sessions s
LEFT JOIN users u ON u.user_id = s.user_id
WHERE u.user_id IS NULL
   OR s.expires_at <= s.created_at
   OR s.revoked_at < s.created_at;
