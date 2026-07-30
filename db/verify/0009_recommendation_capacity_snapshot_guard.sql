SELECT count(*) AS invalid_current_recommendation_capacity_snapshots
FROM trip_recommendation_evidence e
JOIN trip_groups g ON g.trip_id = e.candidate_trip_id
CROSS JOIN LATERAL (
  SELECT count(*)::integer AS confirmed_count
  FROM trip_participants p
  WHERE p.trip_id = g.trip_id
    AND p.status IN (
      'APPROVED', 'DEPOSITED', 'CHECKED_IN',
      'NO_SHOW', 'DISPUTED', 'COMPLETED'
    )
) confirmed
WHERE e.evidence_version = 2
  AND e.evidence_expires_at > now()
  AND (
    confirmed.confirmed_count >= g.max_participants
    OR e.remaining_seats <> g.max_participants - confirmed.confirmed_count
  );
