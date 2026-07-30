-- Sprint 2 trip lifecycle consistency.
-- Fare estimation belongs to Sprint 3, so a newly created trip may keep the
-- estimate unknown. Deposit confirmation must reject a missing estimate.

ALTER TABLE trip_groups
  ALTER COLUMN estimated_fare DROP NOT NULL,
  DROP CONSTRAINT trip_groups_estimated_fare_valid,
  ADD CONSTRAINT trip_groups_estimated_fare_valid
    CHECK (
      estimated_fare IS NULL
      OR estimated_fare BETWEEN 1 AND 1000000
    );

ALTER TABLE trip_groups
  ADD CONSTRAINT trip_groups_lifecycle_audit_valid
    CHECK (
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
    ) NOT VALID;

ALTER TABLE trip_groups
  VALIDATE CONSTRAINT trip_groups_lifecycle_audit_valid;

CREATE FUNCTION enforce_trip_participant_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_host uuid;
  trip_capacity smallint;
  confirmed_count integer;
BEGIN
  SELECT host_user_id, max_participants
  INTO trip_host, trip_capacity
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR UPDATE;

  IF NEW.role = 'HOST' AND NEW.user_id <> trip_host THEN
    RAISE EXCEPTION 'trip host participant must match trip_groups.host_user_id'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN (
    'APPROVED', 'DEPOSITED', 'CHECKED_IN',
    'NO_SHOW', 'DISPUTED', 'COMPLETED'
  ) THEN
    SELECT count(*)
    INTO confirmed_count
    FROM trip_participants
    WHERE trip_id = NEW.trip_id
      AND user_id <> NEW.user_id
      AND status IN (
        'APPROVED', 'DEPOSITED', 'CHECKED_IN',
        'NO_SHOW', 'DISPUTED', 'COMPLETED'
      );

    IF confirmed_count >= trip_capacity THEN
      RAISE EXCEPTION 'trip participant capacity exceeded'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_participants_enforce_capacity
BEFORE INSERT OR UPDATE OF user_id, role, status ON trip_participants
FOR EACH ROW
EXECUTE FUNCTION enforce_trip_participant_capacity();

CREATE FUNCTION enforce_trip_closure_participant_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  confirmed_count integer;
BEGIN
  IF NEW.status NOT IN ('CLOSED', 'EXPIRED') THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO confirmed_count
  FROM trip_participants
  WHERE trip_id = NEW.trip_id
    AND status IN (
      'APPROVED', 'DEPOSITED', 'CHECKED_IN',
      'NO_SHOW', 'DISPUTED', 'COMPLETED'
    );

  IF NEW.status = 'CLOSED' AND confirmed_count < 2 THEN
    RAISE EXCEPTION 'closed trip requires at least two confirmed participants'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'EXPIRED' AND confirmed_count >= 2 THEN
    RAISE EXCEPTION 'expired trip must have fewer than two confirmed participants'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_enforce_closure_count
BEFORE UPDATE OF status ON trip_groups
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION enforce_trip_closure_participant_count();
