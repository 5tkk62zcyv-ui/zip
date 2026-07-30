SELECT count(*) AS confirmed_trips_without_valid_fare_evidence
FROM trip_groups g
LEFT JOIN fare_estimates f
  ON f.trip_id = g.trip_id
 AND f.fare_estimate_id = g.current_fare_estimate_id
WHERE g.status = 'CONFIRMED'
  AND (
    f.fare_estimate_id IS NULL
    OR f.trip_location_revision <> g.location_revision
    OR f.deposit_points_total IS DISTINCT FROM g.estimated_fare
    OR f.expires_at <= now()
  );

SELECT count(*) AS confirmation_guard_trigger_count
FROM pg_trigger
WHERE tgrelid = 'trip_groups'::regclass
  AND tgname = 'trip_groups_require_fare_evidence'
  AND NOT tgisinternal;
