-- Sprint 4 participation guards for every write path.

CREATE FUNCTION enforce_open_trip_participation_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_status text;
  trip_departure_at timestamptz;
  user_is_eligible boolean;
BEGIN
  IF NEW.status NOT IN ('APPLIED', 'APPROVED') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT status, departure_at
  INTO trip_status, trip_departure_at
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR UPDATE;

  IF trip_status <> 'OPEN' OR trip_departure_at <= now() THEN
    RAISE EXCEPTION 'participation requires an open trip before departure'
      USING ERRCODE = '23514';
  END IF;

  SELECT (
    account_status = 'ACTIVE'
    AND nullif(btrim(student_id), '') IS NOT NULL
    AND nullif(btrim(name), '') IS NOT NULL
    AND nullif(btrim(school_email), '') IS NOT NULL
  )
  INTO user_is_eligible
  FROM users
  WHERE user_id = NEW.user_id
  FOR SHARE;

  IF user_is_eligible IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'participant must be active with a complete profile'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_participants_require_open_trip
BEFORE INSERT OR UPDATE OF status ON trip_participants
FOR EACH ROW
EXECUTE FUNCTION enforce_open_trip_participation_transition();

CREATE FUNCTION enforce_trip_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  confirmed_count integer;
BEGIN
  SELECT count(*)
  INTO confirmed_count
  FROM trip_participants
  WHERE trip_id = NEW.trip_id
    AND status IN (
      'APPROVED', 'DEPOSITED', 'CHECKED_IN',
      'NO_SHOW', 'DISPUTED', 'COMPLETED'
    );

  IF NEW.max_participants < confirmed_count THEN
    RAISE EXCEPTION 'trip capacity cannot be lower than confirmed participants'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_guard_capacity_change
BEFORE UPDATE OF max_participants ON trip_groups
FOR EACH ROW
WHEN (OLD.max_participants IS DISTINCT FROM NEW.max_participants)
EXECUTE FUNCTION enforce_trip_capacity_change();

CREATE INDEX trip_participants_confirmed_trip_idx
  ON trip_participants (trip_id)
  WHERE status IN (
    'APPROVED', 'DEPOSITED', 'CHECKED_IN',
    'NO_SHOW', 'DISPUTED', 'COMPLETED'
  );

CREATE INDEX trip_participants_applied_trip_idx
  ON trip_participants (trip_id, applied_at)
  WHERE status = 'APPLIED';
