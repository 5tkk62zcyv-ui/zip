SELECT
  (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgrelid = 'trip_participants'::regclass
      AND tgname = 'trip_participants_require_open_trip'
      AND NOT tgisinternal
  ) AS open_trip_guard_count,
  (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgrelid = 'trip_groups'::regclass
      AND tgname = 'trip_groups_guard_capacity_change'
      AND NOT tgisinternal
  ) AS capacity_change_guard_count;

SELECT count(*) AS over_capacity_trip_count
FROM (
  SELECT g.trip_id
  FROM trip_groups g
  LEFT JOIN trip_participants p
    ON p.trip_id = g.trip_id
   AND p.status IN (
     'APPROVED', 'DEPOSITED', 'CHECKED_IN',
     'NO_SHOW', 'DISPUTED', 'COMPLETED'
   )
  GROUP BY g.trip_id, g.max_participants
  HAVING count(p.user_id) > g.max_participants
) invalid;

SELECT count(*) AS ineligible_active_participant_count
FROM trip_participants p
JOIN users u ON u.user_id = p.user_id
WHERE p.status IN ('APPLIED', 'APPROVED')
  AND (
    u.account_status <> 'ACTIVE'
    OR nullif(btrim(u.student_id), '') IS NULL
    OR nullif(btrim(u.name), '') IS NULL
    OR nullif(btrim(u.school_email), '') IS NULL
  );
