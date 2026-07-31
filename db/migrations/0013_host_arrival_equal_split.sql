-- Host arrival settlement: allow ceil-based equal splits for the final boarded cohort.
-- Forward-only. Existing settlements and append-only ledger entries are not rewritten.

ALTER TABLE trip_settlements
  ADD COLUMN cohort_basis text NOT NULL DEFAULT 'ESCROW_CONFIRMED',
  ADD CONSTRAINT trip_settlements_cohort_basis_valid
    CHECK (cohort_basis IN ('ESCROW_CONFIRMED', 'BOARDED'));

CREATE TABLE trip_settlement_participants (
  trip_id uuid NOT NULL REFERENCES trip_settlements(trip_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  deposit_amount integer NOT NULL,
  final_share integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id),
  FOREIGN KEY (trip_id, user_id)
    REFERENCES trip_participants(trip_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT trip_settlement_participants_deposit_valid
    CHECK (deposit_amount > 0),
  CONSTRAINT trip_settlement_participants_share_valid
    CHECK (final_share > 0)
);

CREATE FUNCTION validate_trip_settlement_participant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_deposit integer;
  expected_share integer;
  expected_basis text;
  participant_role text;
  participant_status text;
BEGIN
  SELECT d.amount, s.final_share, s.cohort_basis, p.role, p.status
  INTO expected_deposit, expected_share, expected_basis,
       participant_role, participant_status
  FROM trip_deposits d
  JOIN trip_settlements s ON s.trip_id = d.trip_id
  JOIN trip_participants p
    ON p.trip_id = d.trip_id
   AND p.user_id = d.user_id
  WHERE d.trip_id = NEW.trip_id
    AND d.user_id = NEW.user_id
  FOR SHARE OF d, s, p;

  IF NOT FOUND
    OR expected_basis <> 'BOARDED'
    OR (participant_role <> 'HOST' AND participant_status <> 'CHECKED_IN')
    OR NEW.deposit_amount <> expected_deposit
    OR NEW.final_share <> expected_share
  THEN
    RAISE EXCEPTION 'settlement participant must match the boarded deposit cohort'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_settlement_participants_validate
BEFORE INSERT ON trip_settlement_participants
FOR EACH ROW
EXECUTE FUNCTION validate_trip_settlement_participant();

CREATE FUNCTION prevent_trip_settlement_participant_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'settlement participant snapshots are immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER trip_settlement_participants_prevent_mutation
BEFORE UPDATE OR DELETE ON trip_settlement_participants
FOR EACH ROW
EXECUTE FUNCTION prevent_trip_settlement_participant_mutation();

CREATE FUNCTION guard_trip_settlement_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'completed settlements are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.trip_id IS DISTINCT FROM OLD.trip_id
    OR NEW.actual_fare IS DISTINCT FROM OLD.actual_fare
    OR NEW.participant_count IS DISTINCT FROM OLD.participant_count
    OR NEW.final_share IS DISTINCT FROM OLD.final_share
    OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
    OR NEW.fare_submission_idempotency_key
      IS DISTINCT FROM OLD.fare_submission_idempotency_key
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
    OR NEW.confirmation_deadline IS DISTINCT FROM OLD.confirmation_deadline
    OR NEW.cohort_basis IS DISTINCT FROM OLD.cohort_basis
    OR NEW.status <> 'COMPLETED'
    OR NEW.settlement_idempotency_key IS NULL
    OR NEW.settled_at IS NULL
  THEN
    RAISE EXCEPTION 'invalid settlement completion update'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_settlements_guard_update
BEFORE UPDATE ON trip_settlements
FOR EACH ROW
EXECUTE FUNCTION guard_trip_settlement_update();

CREATE UNIQUE INDEX point_ledger_one_settlement_entry_per_type_idx
  ON point_ledger (trip_id, user_id, entry_type)
  WHERE entry_type IN ('SETTLEMENT_CHARGE', 'REFUND', 'ADDITIONAL_DEBIT');

CREATE FUNCTION validate_boarded_settlement_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_host uuid;
  trip_status text;
  deposit_amount integer;
  share_amount integer;
  is_boarded boolean;
BEGIN
  IF NEW.entry_type NOT IN (
    'SETTLEMENT_CHARGE', 'REFUND', 'ADDITIONAL_DEBIT'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT g.host_user_id, g.status, d.amount, s.final_share,
         sp.user_id IS NOT NULL
  INTO trip_host, trip_status, deposit_amount, share_amount, is_boarded
  FROM trip_groups g
  JOIN trip_deposits d
    ON d.trip_id = g.trip_id
   AND d.user_id = NEW.user_id
  JOIN trip_settlements s ON s.trip_id = g.trip_id
  LEFT JOIN trip_settlement_participants sp
    ON sp.trip_id = d.trip_id
   AND sp.user_id = d.user_id
  WHERE g.trip_id = NEW.trip_id
  FOR SHARE OF g, d, s;

  IF NOT FOUND
    OR trip_status NOT IN ('IN_PROGRESS', 'SETTLEMENT_PENDING')
    OR NEW.actor_user_id <> trip_host
    OR (
      NEW.entry_type = 'SETTLEMENT_CHARGE'
      AND (
        is_boarded IS DISTINCT FROM true
        OR NEW.available_delta <> 0
        OR NEW.held_delta <> -least(deposit_amount, share_amount)
      )
    )
    OR (
      NEW.entry_type = 'REFUND'
      AND (
        NEW.available_delta <>
          CASE
            WHEN is_boarded THEN deposit_amount - share_amount
            ELSE deposit_amount
          END
        OR NEW.available_delta <= 0
        OR NEW.held_delta <> -NEW.available_delta
      )
    )
    OR (
      NEW.entry_type = 'ADDITIONAL_DEBIT'
      AND (
        is_boarded IS DISTINCT FROM true
        OR deposit_amount >= share_amount
        OR NEW.available_delta <> -(share_amount - deposit_amount)
        OR NEW.held_delta <> 0
      )
    )
  THEN
    RAISE EXCEPTION 'settlement ledger entry does not match boarded cohort'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER point_ledger_validate_boarded_settlement
BEFORE INSERT ON point_ledger
FOR EACH ROW
EXECUTE FUNCTION validate_boarded_settlement_ledger_entry();

CREATE OR REPLACE FUNCTION validate_demo_settlement_cohort()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  trip_status text;
  trip_host uuid;
  cohort_count integer;
BEGIN
  SELECT status, host_user_id
  INTO trip_status, trip_host
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR SHARE;

  IF NEW.cohort_basis = 'BOARDED' THEN
    SELECT count(*) INTO cohort_count
    FROM trip_participants p
    JOIN trip_deposits d
      ON d.trip_id = p.trip_id
     AND d.user_id = p.user_id
    WHERE p.trip_id = NEW.trip_id
      AND (p.role = 'HOST' OR p.status = 'CHECKED_IN');
  ELSE
    SELECT count(*) INTO cohort_count
    FROM trip_deposits
    WHERE trip_id = NEW.trip_id;
  END IF;

  IF trip_status <> 'IN_PROGRESS'
    OR NEW.submitted_by <> trip_host
    OR NEW.participant_count <> cohort_count
    OR NEW.final_share <> ceil(NEW.actual_fare::numeric / cohort_count)::integer
  THEN
    RAISE EXCEPTION 'settlement must use the in-progress boarded cohort'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
