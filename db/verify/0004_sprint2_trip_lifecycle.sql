SELECT count(*) AS invalid_trip_lifecycle_audit
FROM trip_groups
WHERE NOT (
  (
    status = 'OPEN'
    AND closed_at IS NULL
    AND closure_type IS NULL
    AND cancelled_at IS NULL
  )
  OR (
    status = 'CANCELLED'
    AND closed_at IS NOT NULL
    AND closure_type = 'CANCELLED'
    AND cancelled_at IS NOT NULL
  )
  OR (
    status IN (
      'CLOSED',
      'CONFIRMED',
      'IN_PROGRESS',
      'SETTLEMENT_PENDING',
      'COMPLETED',
      'EXPIRED'
    )
    AND closed_at IS NOT NULL
    AND closure_type IN ('AUTO', 'HOST')
    AND cancelled_at IS NULL
  )
);

SELECT count(*) AS invalid_estimated_fare
FROM trip_groups
WHERE estimated_fare IS NOT NULL
  AND estimated_fare NOT BETWEEN 1 AND 1000000;

SELECT count(*) AS invalid_trip_host_participant
FROM trip_groups g
LEFT JOIN trip_participants p
  ON p.trip_id = g.trip_id
 AND p.role = 'HOST'
 AND p.user_id = g.host_user_id
WHERE p.user_id IS NULL;

SELECT count(*) AS over_capacity_trip
FROM (
  SELECT g.trip_id, g.max_participants, count(p.user_id) AS confirmed_count
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
