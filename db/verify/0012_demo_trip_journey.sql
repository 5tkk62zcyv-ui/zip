SELECT count(*) AS invalid_demo_journey_participants
FROM trip_participants p
WHERE
  (p.status = 'CHECKED_IN' AND p.checked_in_at IS NULL)
  OR (p.status = 'NO_SHOW' AND (
    p.no_show_at IS NULL
    OR p.no_show_marked_by IS NULL
  ))
  OR (p.no_show_at IS NULL) <> (p.no_show_marked_by IS NULL);

SELECT count(*) AS invalid_demo_journey_trips
FROM trip_groups g
WHERE g.status IN ('IN_PROGRESS', 'SETTLEMENT_PENDING', 'COMPLETED')
  AND g.in_progress_at IS NULL;

SELECT count(*) AS settlements_with_wrong_escrow_cohort
FROM trip_settlements s
WHERE s.participant_count <> (
  SELECT count(*) FROM trip_deposits d WHERE d.trip_id = s.trip_id
);
