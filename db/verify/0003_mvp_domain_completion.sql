SELECT
  to_regclass('public.fare_disputes'),
  to_regclass('public.trip_recommendation_evidence');

SELECT count(*) AS invalid_trip_states
FROM trip_groups
WHERE status NOT IN (
  'OPEN',
  'CLOSED',
  'CONFIRMED',
  'IN_PROGRESS',
  'SETTLEMENT_PENDING',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

SELECT count(*) AS invalid_participant_states
FROM trip_participants
WHERE status NOT IN (
  'APPLIED',
  'APPROVED',
  'DEPOSITED',
  'CHECKED_IN',
  'NO_SHOW',
  'DISPUTED',
  'COMPLETED',
  'CANCELLED'
);

SELECT count(*) AS invalid_confirmation_deadlines
FROM trip_settlements
WHERE confirmation_deadline IS NULL
   OR confirmation_deadline <= submitted_at;

SELECT trip_id, user_id, count(*) AS open_dispute_count
FROM fare_disputes
WHERE status = 'OPEN'
GROUP BY trip_id, user_id
HAVING count(*) > 1;

SELECT count(*) AS invalid_recommendation_evidence
FROM trip_recommendation_evidence
WHERE origin_distance_m < 0
   OR destination_straight_distance_m < 0
   OR destination_route_distance_m < 0
   OR estimated_detour_minutes < 0
   OR remaining_seats NOT BETWEEN 1 AND 3
   OR estimated_fare NOT BETWEEN 1 AND 1000000
   OR btrim(recommendation_reason) = '';

SELECT count(*) AS append_only_trigger_count
FROM pg_trigger
WHERE tgrelid = 'point_ledger'::regclass
  AND tgname = 'point_ledger_prevent_mutation'
  AND NOT tgisinternal;
