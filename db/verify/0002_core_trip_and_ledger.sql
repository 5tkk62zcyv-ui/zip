SELECT
  to_regclass('public.trip_groups'),
  to_regclass('public.trip_participants'),
  to_regclass('public.trip_deposits'),
  to_regclass('public.trip_settlements'),
  to_regclass('public.fare_confirmations'),
  to_regclass('public.point_accounts'),
  to_regclass('public.point_ledger');

SELECT count(*) AS invalid_balances
FROM point_balances
WHERE available_points < 0 OR held_points < 0;

SELECT count(*) AS ledger_account_mismatches
FROM point_accounts a
LEFT JOIN (
  SELECT user_id, sum(available_delta) AS available_points, sum(held_delta) AS held_points
  FROM point_ledger
  GROUP BY user_id
) l ON l.user_id = a.user_id
WHERE a.available_points <> COALESCE(l.available_points, 0)
   OR a.held_points <> COALESCE(l.held_points, 0);

SELECT trip_id, count(*) AS host_count
FROM trip_participants
WHERE role = 'HOST'
GROUP BY trip_id
HAVING count(*) <> 1;
