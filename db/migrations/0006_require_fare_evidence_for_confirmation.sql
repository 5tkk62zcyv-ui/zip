-- Prevent every application version, including legacy deployments, from
-- confirming a trip without current provider-neutral fare evidence.

CREATE FUNCTION enforce_trip_confirmation_fare_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_estimate fare_estimates%ROWTYPE;
BEGIN
  IF NEW.status <> 'CONFIRMED' OR OLD.status = 'CONFIRMED' THEN
    RETURN NEW;
  END IF;

  IF NEW.current_fare_estimate_id IS NULL THEN
    RAISE EXCEPTION 'trip confirmation requires current fare evidence'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO current_estimate
  FROM fare_estimates
  WHERE trip_id = NEW.trip_id
    AND fare_estimate_id = NEW.current_fare_estimate_id
  FOR SHARE;

  IF NOT FOUND
    OR current_estimate.trip_location_revision <> NEW.location_revision
    OR current_estimate.deposit_points_total IS DISTINCT FROM NEW.estimated_fare
    OR current_estimate.expires_at <= now()
  THEN
    RAISE EXCEPTION 'trip confirmation fare evidence is missing, stale, or inconsistent'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_require_fare_evidence
BEFORE UPDATE OF status, current_fare_estimate_id, estimated_fare
ON trip_groups
FOR EACH ROW
EXECUTE FUNCTION enforce_trip_confirmation_fare_evidence();
