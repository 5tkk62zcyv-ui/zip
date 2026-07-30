-- Demo journey slice: durable gathering, check-in and no-show audit fields.
-- Forward-only. Existing point and settlement records are not rewritten.

ALTER TABLE trip_participants
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN check_in_idempotency_key uuid,
  ADD COLUMN no_show_marked_by uuid REFERENCES users(user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT trip_participants_checked_in_at_valid CHECK (
    checked_in_at IS NULL OR status IN ('CHECKED_IN', 'COMPLETED')
  ),
  ADD CONSTRAINT trip_participants_no_show_actor_valid CHECK (
    (no_show_at IS NULL AND no_show_marked_by IS NULL)
    OR (no_show_at IS NOT NULL AND no_show_marked_by IS NOT NULL)
  ),
  ADD CONSTRAINT trip_participants_check_in_idempotent
    UNIQUE (user_id, check_in_idempotency_key);

UPDATE trip_groups g
SET in_progress_at = COALESCE(s.submitted_at, g.updated_at)
FROM trip_settlements s
WHERE s.trip_id = g.trip_id
  AND g.status IN ('SETTLEMENT_PENDING', 'COMPLETED')
  AND g.in_progress_at IS NULL;

CREATE FUNCTION validate_demo_journey_participant_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_status text;
  trip_host uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT status, host_user_id
  INTO trip_status, trip_host
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR SHARE;

  IF OLD.status = 'DEPOSITED' AND NEW.status = 'CHECKED_IN' THEN
    IF trip_status <> 'IN_PROGRESS'
      OR NEW.checked_in_at IS NULL
      OR NEW.check_in_idempotency_key IS NULL
    THEN
      RAISE EXCEPTION 'check-in requires an in-progress trip and audit data'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'DEPOSITED' AND NEW.status = 'NO_SHOW' THEN
    IF trip_status <> 'IN_PROGRESS'
      OR NEW.role = 'HOST'
      OR NEW.no_show_at IS NULL
      OR NEW.no_show_idempotency_key IS NULL
      OR NEW.no_show_marked_by IS DISTINCT FROM trip_host
    THEN
      RAISE EXCEPTION 'no-show requires an in-progress trip and host audit data'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'COMPLETED'
    AND OLD.status IN ('DEPOSITED', 'CHECKED_IN', 'NO_SHOW')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid demo journey participant transition % -> %',
    OLD.status, NEW.status
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trip_participants_validate_demo_journey
BEFORE UPDATE OF status ON trip_participants
FOR EACH ROW
WHEN (
  OLD.status IN ('DEPOSITED', 'CHECKED_IN', 'NO_SHOW')
  OR NEW.status IN ('CHECKED_IN', 'NO_SHOW')
)
EXECUTE FUNCTION validate_demo_journey_participant_transition();

CREATE FUNCTION validate_demo_journey_trip_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  deposit_count integer;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'CONFIRMED' AND NEW.status = 'IN_PROGRESS' THEN
    SELECT count(*) INTO deposit_count
    FROM trip_deposits
    WHERE trip_id = NEW.trip_id;

    IF NEW.in_progress_at IS NULL
      OR NEW.start_idempotency_key IS NULL
      OR deposit_count NOT BETWEEN 2 AND NEW.max_participants
    THEN
      RAISE EXCEPTION 'trip start requires escrow cohort and audit data'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'IN_PROGRESS' AND NEW.status = 'SETTLEMENT_PENDING' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'SETTLEMENT_PENDING' AND NEW.status = 'COMPLETED' THEN
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_validate_demo_journey
BEFORE UPDATE OF status ON trip_groups
FOR EACH ROW
EXECUTE FUNCTION validate_demo_journey_trip_transition();

CREATE INDEX trip_participants_demo_journey_idx
  ON trip_participants (trip_id, status, user_id)
  WHERE status IN ('DEPOSITED', 'CHECKED_IN', 'NO_SHOW');

CREATE FUNCTION validate_demo_settlement_cohort()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_status text;
  trip_host uuid;
  deposit_count integer;
BEGIN
  SELECT status, host_user_id
  INTO trip_status, trip_host
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR SHARE;

  SELECT count(*) INTO deposit_count
  FROM trip_deposits
  WHERE trip_id = NEW.trip_id;

  IF trip_status <> 'IN_PROGRESS'
    OR NEW.submitted_by <> trip_host
    OR NEW.participant_count <> deposit_count
    OR mod(NEW.actual_fare, NEW.participant_count) <> 0
  THEN
    RAISE EXCEPTION 'settlement must use the in-progress escrow cohort'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_settlements_validate_demo_cohort
BEFORE INSERT ON trip_settlements
FOR EACH ROW
EXECUTE FUNCTION validate_demo_settlement_cohort();

CREATE FUNCTION prevent_confirmed_trip_deposit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_status text;
BEGIN
  SELECT status INTO trip_status
  FROM trip_groups
  WHERE trip_id = OLD.trip_id
  FOR SHARE;

  IF trip_status IN (
    'CONFIRMED', 'IN_PROGRESS', 'SETTLEMENT_PENDING', 'COMPLETED'
  ) THEN
    RAISE EXCEPTION 'confirmed trip deposit cohort is immutable'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_deposits_prevent_confirmed_mutation
BEFORE UPDATE OR DELETE ON trip_deposits
FOR EACH ROW
EXECUTE FUNCTION prevent_confirmed_trip_deposit_mutation();
