SELECT count(*) AS invalid_v2_recommendation_evidence
FROM trip_recommendation_evidence e
LEFT JOIN trip_groups seed ON seed.trip_id = e.seed_trip_id
LEFT JOIN trip_groups candidate ON candidate.trip_id = e.candidate_trip_id
LEFT JOIN fare_estimates fare
  ON fare.trip_id = e.candidate_trip_id
 AND fare.fare_estimate_id = e.fare_estimate_id
WHERE e.evidence_version = 2
  AND (
    seed.trip_id IS NULL
    OR candidate.trip_id IS NULL
    OR fare.fare_estimate_id IS NULL
    OR e.seed_location_revision IS NULL
    OR e.candidate_location_revision IS NULL
    OR e.request_fingerprint IS NULL
    OR e.destination_class NOT IN ('EXACT', 'ADJACENT')
    OR e.departure_delta_seconds < 0
    OR e.detour_distance_m < 0
    OR e.estimated_detour_seconds < 0
    OR e.evidence_expires_at <= e.calculated_at
    OR jsonb_typeof(e.rank_key) <> 'array'
    OR jsonb_typeof(e.reason_data) <> 'object'
    OR e.rank_position NOT BETWEEN 1 AND 50
    OR e.target_participants NOT BETWEEN 2 AND 4
    OR e.expected_share_points NOT BETWEEN 1 AND 1000000
  );

SELECT count(*) AS duplicate_v2_request_candidates
FROM (
  SELECT request_id, candidate_trip_id, fare_estimate_id
  FROM trip_recommendation_evidence
  WHERE evidence_version = 2
  GROUP BY request_id, candidate_trip_id, fare_estimate_id
  HAVING count(*) > 1
) duplicates;
