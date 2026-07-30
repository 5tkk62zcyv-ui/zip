-- Sprint 5 follow-up: reject recommendation evidence when the candidate's
-- remaining-seat snapshot changed between candidate selection and persistence.

CREATE OR REPLACE FUNCTION validate_recommendation_evidence_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seed_revision uuid;
  candidate_record record;
  confirmed_count integer;
BEGIN
  IF NEW.evidence_version <> 2 THEN
    RETURN NEW;
  END IF;

  SELECT location_revision
  INTO seed_revision
  FROM trip_groups
  WHERE trip_id = NEW.seed_trip_id;

  SELECT
    g.location_revision,
    g.current_fare_estimate_id,
    g.estimated_fare,
    g.status,
    g.departure_at,
    g.max_participants,
    f.trip_location_revision,
    f.deposit_points_total,
    f.expires_at
  INTO candidate_record
  FROM trip_groups g
  JOIN fare_estimates f
    ON f.trip_id = g.trip_id
   AND f.fare_estimate_id = NEW.fare_estimate_id
  WHERE g.trip_id = NEW.candidate_trip_id
  FOR SHARE OF g, f;

  SELECT count(*)::integer
  INTO confirmed_count
  FROM trip_participants
  WHERE trip_id = NEW.candidate_trip_id
    AND status IN (
      'APPROVED', 'DEPOSITED', 'CHECKED_IN',
      'NO_SHOW', 'DISPUTED', 'COMPLETED'
    );

  IF seed_revision IS DISTINCT FROM NEW.seed_location_revision
     OR candidate_record.location_revision IS DISTINCT FROM NEW.candidate_location_revision
     OR candidate_record.current_fare_estimate_id IS DISTINCT FROM NEW.fare_estimate_id
     OR candidate_record.trip_location_revision IS DISTINCT FROM NEW.candidate_location_revision
     OR candidate_record.estimated_fare IS DISTINCT FROM candidate_record.deposit_points_total
     OR candidate_record.deposit_points_total IS DISTINCT FROM NEW.estimated_fare
     OR candidate_record.status <> 'OPEN'
     OR candidate_record.departure_at <= NEW.calculated_at
     OR candidate_record.max_participants IS DISTINCT FROM NEW.target_participants
     OR confirmed_count >= candidate_record.max_participants
     OR NEW.remaining_seats
          IS DISTINCT FROM candidate_record.max_participants - confirmed_count
     OR (NEW.reason_data ->> 'approvedCount')::integer
          IS DISTINCT FROM confirmed_count
     OR (NEW.reason_data ->> 'remainingSeats')::integer
          IS DISTINCT FROM NEW.remaining_seats
     OR candidate_record.expires_at <= NEW.calculated_at
     OR NEW.evidence_expires_at > candidate_record.expires_at
     OR NEW.expected_share_points
          <> ceil(candidate_record.deposit_points_total::numeric / NEW.target_participants)::integer
  THEN
    RAISE EXCEPTION 'recommendation evidence is stale or inconsistent'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

