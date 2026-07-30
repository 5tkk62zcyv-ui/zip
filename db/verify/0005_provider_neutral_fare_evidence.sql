SELECT
  to_regclass('public.fare_estimates'),
  (
    SELECT convalidated
    FROM pg_constraint
    WHERE conname = 'trip_groups_origin_location_valid'
  ) AS origin_location_constraint_validated,
  (
    SELECT convalidated
    FROM pg_constraint
    WHERE conname = 'trip_groups_destination_location_valid'
  ) AS destination_location_constraint_validated;

SELECT count(*) AS invalid_trip_locations
FROM trip_groups
WHERE
  (origin_latitude IS NULL) <> (origin_longitude IS NULL)
  OR (destination_latitude IS NULL) <> (destination_longitude IS NULL)
  OR origin_latitude NOT BETWEEN -90 AND 90
  OR origin_longitude NOT BETWEEN -180 AND 180
  OR destination_latitude NOT BETWEEN -90 AND 90
  OR destination_longitude NOT BETWEEN -180 AND 180;

SELECT count(*) AS invalid_fare_estimates
FROM fare_estimates
WHERE route_distance_m < 0
   OR duration_seconds < 0
   OR estimated_fare_won NOT BETWEEN 1 AND 1000000
   OR deposit_points_total NOT BETWEEN 1 AND 1000000
   OR expires_at <= calculated_at
   OR jsonb_typeof(calculation_basis) <> 'object'
   OR calculation_basis = '{}'::jsonb
   OR nullif(btrim(provider_key), '') IS NULL
   OR nullif(btrim(pricing_policy_version), '') IS NULL;

SELECT count(*) AS active_estimate_mismatch
FROM trip_groups g
JOIN fare_estimates f ON f.fare_estimate_id = g.current_fare_estimate_id
WHERE f.trip_id <> g.trip_id
   OR g.estimated_fare IS DISTINCT FROM f.deposit_points_total;
