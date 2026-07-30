-- Forward-only MVP domain completion.
-- Compensation, if required, is to stop application writes and restore the
-- pre-migration database snapshot; dropping these audit fields would lose data.

ALTER TABLE trip_groups
  DROP CONSTRAINT trip_groups_status_valid;

ALTER TABLE trip_groups
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN closure_type text,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN in_progress_at timestamptz,
  ADD COLUMN close_idempotency_key uuid,
  ADD COLUMN cancellation_idempotency_key uuid,
  ADD COLUMN start_idempotency_key uuid,
  ADD CONSTRAINT trip_groups_status_valid CHECK (
    status IN (
      'OPEN',
      'CLOSED',
      'CONFIRMED',
      'IN_PROGRESS',
      'SETTLEMENT_PENDING',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED'
    )
  ),
  ADD CONSTRAINT trip_groups_closure_type_valid CHECK (
    closure_type IS NULL OR closure_type IN ('AUTO', 'HOST', 'CANCELLED')
  ),
  ADD CONSTRAINT trip_groups_closed_at_valid CHECK (
    closed_at IS NULL OR closed_at >= created_at
  ),
  ADD CONSTRAINT trip_groups_cancelled_at_valid CHECK (
    cancelled_at IS NULL OR status = 'CANCELLED'
  ),
  ADD CONSTRAINT trip_groups_in_progress_at_valid CHECK (
    in_progress_at IS NULL
    OR status IN ('IN_PROGRESS', 'SETTLEMENT_PENDING', 'COMPLETED')
  ),
  ADD CONSTRAINT trip_groups_close_idempotent
    UNIQUE (host_user_id, close_idempotency_key),
  ADD CONSTRAINT trip_groups_cancellation_idempotent
    UNIQUE (host_user_id, cancellation_idempotency_key),
  ADD CONSTRAINT trip_groups_start_idempotent
    UNIQUE (host_user_id, start_idempotency_key);

UPDATE trip_groups
SET
  closed_at = COALESCE(closed_at, updated_at),
  closure_type = COALESCE(
    closure_type,
    CASE WHEN status = 'EXPIRED' THEN 'AUTO' ELSE 'HOST' END
  )
WHERE status IN ('CONFIRMED', 'SETTLEMENT_PENDING', 'COMPLETED', 'EXPIRED');

ALTER TABLE trip_participants
  DROP CONSTRAINT trip_participants_status_valid,
  DROP CONSTRAINT trip_participants_host_state_valid;

ALTER TABLE trip_participants
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN no_show_at timestamptz,
  ADD COLUMN disputed_at timestamptz,
  ADD COLUMN cancellation_idempotency_key uuid,
  ADD COLUMN no_show_idempotency_key uuid,
  ADD CONSTRAINT trip_participants_status_valid CHECK (
    status IN (
      'APPLIED',
      'APPROVED',
      'DEPOSITED',
      'CHECKED_IN',
      'NO_SHOW',
      'DISPUTED',
      'COMPLETED',
      'CANCELLED'
    )
  ),
  ADD CONSTRAINT trip_participants_host_state_valid CHECK (
    role <> 'HOST'
    OR status IN ('APPROVED', 'DEPOSITED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED')
  ),
  ADD CONSTRAINT trip_participants_cancelled_at_valid CHECK (
    cancelled_at IS NULL OR status = 'CANCELLED'
  ),
  ADD CONSTRAINT trip_participants_no_show_at_valid CHECK (
    no_show_at IS NULL OR status IN ('NO_SHOW', 'DISPUTED', 'COMPLETED')
  ),
  ADD CONSTRAINT trip_participants_disputed_at_valid CHECK (
    disputed_at IS NULL OR status IN ('DISPUTED', 'COMPLETED')
  ),
  ADD CONSTRAINT trip_participants_cancellation_idempotent
    UNIQUE (user_id, cancellation_idempotency_key),
  ADD CONSTRAINT trip_participants_no_show_idempotent
    UNIQUE (trip_id, no_show_idempotency_key);

ALTER TABLE trip_settlements
  ADD COLUMN confirmation_deadline timestamptz;

UPDATE trip_settlements
SET confirmation_deadline = submitted_at + interval '24 hours'
WHERE confirmation_deadline IS NULL;

ALTER TABLE trip_settlements
  ALTER COLUMN confirmation_deadline SET NOT NULL,
  ADD CONSTRAINT trip_settlements_confirmation_deadline_valid
    CHECK (confirmation_deadline > submitted_at);

CREATE TABLE fare_disputes (
  dispute_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  idempotency_key uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text,
  FOREIGN KEY (trip_id, user_id)
    REFERENCES trip_participants(trip_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT fare_disputes_reason_valid
    CHECK (btrim(reason) <> '' AND char_length(reason) <= 1000),
  CONSTRAINT fare_disputes_status_valid
    CHECK (status IN ('OPEN', 'RESOLVED', 'REJECTED')),
  CONSTRAINT fare_disputes_resolution_valid CHECK (
    (status = 'OPEN' AND resolved_at IS NULL AND resolution_note IS NULL)
    OR (
      status IN ('RESOLVED', 'REJECTED')
      AND resolved_at IS NOT NULL
      AND resolution_note IS NOT NULL
      AND btrim(resolution_note) <> ''
    )
  ),
  CONSTRAINT fare_disputes_idempotent UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX fare_disputes_one_open_per_participant_idx
  ON fare_disputes (trip_id, user_id)
  WHERE status = 'OPEN';

CREATE INDEX fare_disputes_trip_status_idx
  ON fare_disputes (trip_id, status, submitted_at);

CREATE TABLE trip_recommendation_evidence (
  recommendation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  candidate_trip_id uuid NOT NULL REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  origin_distance_m integer NOT NULL,
  destination_straight_distance_m integer NOT NULL,
  destination_route_distance_m integer NOT NULL,
  estimated_detour_minutes integer NOT NULL,
  desired_departure_at timestamptz NOT NULL,
  departure_delta_minutes integer NOT NULL,
  remaining_seats smallint NOT NULL,
  estimated_fare integer NOT NULL,
  fare_source text NOT NULL,
  calculation_source text NOT NULL,
  allowed_destination_radius_m integer NOT NULL,
  is_adjacent_destination boolean NOT NULL,
  recommendation_reason text NOT NULL,
  calculated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_recommendation_distances_valid CHECK (
    origin_distance_m >= 0
    AND destination_straight_distance_m >= 0
    AND destination_route_distance_m >= 0
  ),
  CONSTRAINT trip_recommendation_detour_valid
    CHECK (estimated_detour_minutes >= 0),
  CONSTRAINT trip_recommendation_departure_delta_valid
    CHECK (departure_delta_minutes >= 0),
  CONSTRAINT trip_recommendation_remaining_seats_valid
    CHECK (remaining_seats BETWEEN 1 AND 3),
  CONSTRAINT trip_recommendation_fare_valid
    CHECK (estimated_fare BETWEEN 1 AND 1000000),
  CONSTRAINT trip_recommendation_radius_valid
    CHECK (allowed_destination_radius_m BETWEEN 0 AND 10000),
  CONSTRAINT trip_recommendation_sources_valid CHECK (
    btrim(fare_source) <> '' AND btrim(calculation_source) <> ''
  ),
  CONSTRAINT trip_recommendation_reason_valid
    CHECK (btrim(recommendation_reason) <> '')
);

CREATE INDEX trip_recommendation_user_calculated_idx
  ON trip_recommendation_evidence (user_id, calculated_at DESC);

CREATE INDEX trip_recommendation_candidate_idx
  ON trip_recommendation_evidence (candidate_trip_id, calculated_at DESC);

CREATE FUNCTION prevent_point_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'point_ledger is append-only'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER point_ledger_prevent_mutation
BEFORE UPDATE OR DELETE ON point_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_point_ledger_mutation();

CREATE INDEX trip_groups_lifecycle_idx
  ON trip_groups (status, departure_at, updated_at DESC);
