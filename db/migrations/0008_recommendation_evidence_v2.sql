-- Sprint 5 reproducible recommendation evidence.
-- Legacy version 1 rows remain readable; all new version 2 rows must carry
-- the policy, input fingerprint, candidate revision, fare evidence and
-- deterministic explanation inputs needed to reproduce the displayed result.

ALTER TABLE trip_recommendation_evidence
  ADD COLUMN evidence_version smallint;

UPDATE trip_recommendation_evidence
SET evidence_version = 1
WHERE evidence_version IS NULL;

ALTER TABLE trip_recommendation_evidence
  ALTER COLUMN evidence_version SET DEFAULT 2,
  ALTER COLUMN evidence_version SET NOT NULL;

ALTER TABLE trip_recommendation_evidence
  ADD COLUMN request_id uuid,
  ADD COLUMN trace_id text,
  ADD COLUMN request_fingerprint text,
  ADD COLUMN seed_trip_id uuid REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  ADD COLUMN seed_location_revision uuid,
  ADD COLUMN candidate_location_revision uuid,
  ADD COLUMN fare_estimate_id uuid,
  ADD COLUMN policy_key text,
  ADD COLUMN policy_version text,
  ADD COLUMN departure_delta_seconds integer,
  ADD COLUMN destination_class text,
  ADD COLUMN detour_distance_m integer,
  ADD COLUMN estimated_detour_seconds integer,
  ADD COLUMN evidence_expires_at timestamptz,
  ADD COLUMN rank_position smallint,
  ADD COLUMN rank_key jsonb,
  ADD COLUMN reason_template_key text,
  ADD COLUMN reason_template_version text,
  ADD COLUMN reason_data jsonb,
  ADD COLUMN target_participants smallint,
  ADD COLUMN expected_share_points integer,
  ADD CONSTRAINT trip_recommendation_evidence_version_valid
    CHECK (evidence_version IN (1, 2)),
  ADD CONSTRAINT trip_recommendation_evidence_v2_complete CHECK (
    evidence_version = 1
    OR (
      request_id IS NOT NULL
      AND nullif(btrim(trace_id), '') IS NOT NULL
      AND nullif(btrim(request_fingerprint), '') IS NOT NULL
      AND seed_trip_id IS NOT NULL
      AND seed_location_revision IS NOT NULL
      AND candidate_location_revision IS NOT NULL
      AND fare_estimate_id IS NOT NULL
      AND nullif(btrim(policy_key), '') IS NOT NULL
      AND nullif(btrim(policy_version), '') IS NOT NULL
      AND departure_delta_seconds IS NOT NULL
      AND departure_delta_seconds >= 0
      AND destination_class IS NOT NULL
      AND destination_class IN ('EXACT', 'ADJACENT')
      AND detour_distance_m IS NOT NULL
      AND detour_distance_m >= 0
      AND estimated_detour_seconds IS NOT NULL
      AND estimated_detour_seconds >= 0
      AND evidence_expires_at IS NOT NULL
      AND evidence_expires_at > calculated_at
      AND rank_position IS NOT NULL
      AND rank_position BETWEEN 1 AND 50
      AND rank_key IS NOT NULL
      AND jsonb_typeof(rank_key) = 'array'
      AND nullif(btrim(reason_template_key), '') IS NOT NULL
      AND nullif(btrim(reason_template_version), '') IS NOT NULL
      AND reason_data IS NOT NULL
      AND jsonb_typeof(reason_data) = 'object'
      AND target_participants IS NOT NULL
      AND target_participants BETWEEN 2 AND 4
      AND expected_share_points IS NOT NULL
      AND expected_share_points BETWEEN 1 AND 1000000
    )
  ),
  ADD CONSTRAINT trip_recommendation_evidence_v2_fare_fk
    FOREIGN KEY (candidate_trip_id, fare_estimate_id)
    REFERENCES fare_estimates(trip_id, fare_estimate_id)
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX trip_recommendation_evidence_v2_request_candidate_idx
  ON trip_recommendation_evidence (
    request_id,
    candidate_trip_id,
    fare_estimate_id
  )
  WHERE evidence_version = 2;

CREATE INDEX trip_recommendation_evidence_v2_expiry_idx
  ON trip_recommendation_evidence (user_id, evidence_expires_at DESC)
  WHERE evidence_version = 2;

CREATE FUNCTION validate_recommendation_evidence_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seed_revision uuid;
  candidate_record record;
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

  IF seed_revision IS DISTINCT FROM NEW.seed_location_revision
     OR candidate_record.location_revision IS DISTINCT FROM NEW.candidate_location_revision
     OR candidate_record.current_fare_estimate_id IS DISTINCT FROM NEW.fare_estimate_id
     OR candidate_record.trip_location_revision IS DISTINCT FROM NEW.candidate_location_revision
     OR candidate_record.estimated_fare IS DISTINCT FROM candidate_record.deposit_points_total
     OR candidate_record.deposit_points_total IS DISTINCT FROM NEW.estimated_fare
     OR candidate_record.status <> 'OPEN'
     OR candidate_record.departure_at <= NEW.calculated_at
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

CREATE TRIGGER trip_recommendation_evidence_validate_v2
BEFORE INSERT ON trip_recommendation_evidence
FOR EACH ROW
EXECUTE FUNCTION validate_recommendation_evidence_v2();
