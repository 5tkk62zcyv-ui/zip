SELECT
  to_regclass('public.trip_settlement_participants') IS NOT NULL
    AS settlement_participants_exists,
  (
    SELECT count(*) = 0
    FROM trip_settlement_participants sp
    LEFT JOIN trip_participants p
      ON (p.trip_id, p.user_id) = (sp.trip_id, sp.user_id)
    LEFT JOIN trip_deposits d
      ON (d.trip_id, d.user_id) = (sp.trip_id, sp.user_id)
    JOIN trip_settlements s ON s.trip_id = sp.trip_id
    WHERE p.user_id IS NULL
       OR d.amount IS DISTINCT FROM sp.deposit_amount
       OR s.final_share IS DISTINCT FROM sp.final_share
       OR s.cohort_basis <> 'BOARDED'
  ) AS settlement_participant_snapshots_valid,
  (
    SELECT count(*) = 0
    FROM trip_settlements s
    WHERE s.status = 'COMPLETED'
      AND EXISTS (
        SELECT 1
        FROM trip_settlement_participants sp
        WHERE sp.trip_id = s.trip_id
      )
      AND s.participant_count <> (
        SELECT count(*)
        FROM trip_settlement_participants sp
        WHERE sp.trip_id = s.trip_id
      )
  ) AS completed_boarded_cohorts_valid,
  (
    SELECT count(*) = 0
    FROM (
      SELECT d.trip_id, d.user_id
      FROM trip_deposits d
      JOIN trip_settlements s ON s.trip_id = d.trip_id
      JOIN point_ledger l
        ON l.trip_id = d.trip_id
       AND l.user_id = d.user_id
      WHERE s.status = 'COMPLETED'
      GROUP BY d.trip_id, d.user_id
      HAVING sum(l.held_delta) <> 0
    ) remaining
  ) AS completed_trip_holds_released,
  (
    SELECT count(*) = 0
    FROM (
      SELECT trip_id, user_id, entry_type
      FROM point_ledger
      WHERE entry_type IN (
        'SETTLEMENT_CHARGE', 'REFUND', 'ADDITIONAL_DEBIT'
      )
      GROUP BY trip_id, user_id, entry_type
      HAVING count(*) > 1
    ) duplicates
  ) AS settlement_ledger_entries_unique;
