-- Sprint 6 point grants, grant requests, and atomic trip escrow.
-- Forward-only migration. The append-only ledger is never rewritten.

ALTER TABLE point_ledger
  ADD COLUMN point_request_id uuid,
  ADD CONSTRAINT point_ledger_delta_bounded CHECK (
    abs(available_delta::bigint) <= 1000000
    AND abs(held_delta::bigint) <= 1000000
  ) NOT VALID,
  ADD CONSTRAINT point_ledger_idempotency_key_not_blank
    CHECK (btrim(idempotency_key) <> '') NOT VALID;

ALTER TABLE point_ledger
  VALIDATE CONSTRAINT point_ledger_delta_bounded;

ALTER TABLE point_ledger
  VALIDATE CONSTRAINT point_ledger_idempotency_key_not_blank;

CREATE TABLE point_grant_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  requested_amount integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  idempotency_key uuid NOT NULL,
  fulfilled_by uuid REFERENCES users(user_id) ON DELETE RESTRICT,
  fulfilled_ledger_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  CONSTRAINT point_grant_requests_amount_valid
    CHECK (requested_amount BETWEEN 1 AND 1000000),
  CONSTRAINT point_grant_requests_reason_valid
    CHECK (btrim(reason) <> '' AND char_length(reason) <= 200),
  CONSTRAINT point_grant_requests_status_valid
    CHECK (status IN ('PENDING', 'FULFILLED')),
  CONSTRAINT point_grant_requests_idempotent
    UNIQUE (requester_user_id, idempotency_key),
  CONSTRAINT point_grant_requests_fulfillment_shape_valid CHECK (
    (
      status = 'PENDING'
      AND fulfilled_by IS NULL
      AND fulfilled_ledger_id IS NULL
      AND fulfilled_at IS NULL
    )
    OR (
      status = 'FULFILLED'
      AND fulfilled_by IS NOT NULL
      AND fulfilled_ledger_id IS NOT NULL
      AND fulfilled_at IS NOT NULL
    )
  )
);

ALTER TABLE point_ledger
  ADD CONSTRAINT point_ledger_point_request_fk
    FOREIGN KEY (point_request_id)
    REFERENCES point_grant_requests(request_id) ON DELETE RESTRICT;

ALTER TABLE point_grant_requests
  ADD CONSTRAINT point_grant_requests_fulfilled_ledger_fk
    FOREIGN KEY (fulfilled_ledger_id)
    REFERENCES point_ledger(ledger_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX point_ledger_one_grant_per_request_idx
  ON point_ledger (point_request_id)
  WHERE point_request_id IS NOT NULL;

CREATE UNIQUE INDEX point_ledger_one_deposit_per_participant_idx
  ON point_ledger (trip_id, user_id)
  WHERE entry_type = 'DEPOSIT';

CREATE INDEX point_grant_requests_pending_idx
  ON point_grant_requests (requested_at, request_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX point_grant_requests_one_pending_per_user_idx
  ON point_grant_requests (requester_user_id)
  WHERE status = 'PENDING';

CREATE INDEX point_grant_requests_user_created_idx
  ON point_grant_requests (requester_user_id, requested_at DESC);

DROP TRIGGER point_ledger_apply_to_account ON point_ledger;

CREATE TRIGGER point_ledger_apply_to_account
AFTER INSERT ON point_ledger
FOR EACH ROW
EXECUTE FUNCTION apply_point_ledger_entry();

CREATE FUNCTION validate_sprint6_point_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_active boolean;
  actor_is_admin boolean;
  request_row point_grant_requests%ROWTYPE;
  trip_status text;
  trip_host uuid;
  participant_status text;
  deposit_amount integer;
BEGIN
  IF NEW.entry_type = 'ADMIN_GRANT' THEN
    SELECT account_status = 'ACTIVE'
    INTO target_active
    FROM users
    WHERE user_id = NEW.user_id
    FOR SHARE;

    SELECT account_status = 'ACTIVE' AND role = 'ADMIN'
    INTO actor_is_admin
    FROM users
    WHERE user_id = NEW.actor_user_id
    FOR SHARE;

    IF target_active IS DISTINCT FROM true OR actor_is_admin IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'admin grant requires an active target and active admin'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.point_request_id IS NOT NULL THEN
      SELECT *
      INTO request_row
      FROM point_grant_requests
      WHERE request_id = NEW.point_request_id
      FOR UPDATE;

      IF NOT FOUND
        OR request_row.status <> 'PENDING'
        OR request_row.requester_user_id <> NEW.user_id
        OR request_row.requested_amount <> NEW.available_delta
      THEN
        RAISE EXCEPTION 'grant does not match a pending point request'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF NEW.point_request_id IS NOT NULL THEN
    RAISE EXCEPTION 'only admin grants may reference a point request'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.entry_type = 'DEPOSIT' THEN
    SELECT account_status = 'ACTIVE'
    INTO target_active
    FROM users
    WHERE user_id = NEW.user_id
    FOR SHARE;

    SELECT g.status, g.host_user_id, p.status, d.amount
    INTO trip_status, trip_host, participant_status, deposit_amount
    FROM trip_groups g
    JOIN trip_participants p
      ON p.trip_id = g.trip_id
     AND p.user_id = NEW.user_id
    JOIN trip_deposits d
      ON d.trip_id = p.trip_id
     AND d.user_id = p.user_id
    WHERE g.trip_id = NEW.trip_id
    FOR UPDATE OF g, p;

    IF NOT FOUND
      OR target_active IS DISTINCT FROM true
      OR trip_status <> 'CLOSED'
      OR trip_host <> NEW.actor_user_id
      OR participant_status NOT IN ('APPROVED', 'DEPOSITED')
      OR deposit_amount <> NEW.held_delta
      OR deposit_amount <> -NEW.available_delta
    THEN
      RAISE EXCEPTION 'deposit ledger must match a closed trip participant deposit'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER point_ledger_validate_sprint6
BEFORE INSERT ON point_ledger
FOR EACH ROW
EXECUTE FUNCTION validate_sprint6_point_ledger_entry();

CREATE FUNCTION validate_point_grant_request_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  requester_eligible boolean;
  grant_row point_ledger%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT (
      account_status = 'ACTIVE'
      AND nullif(btrim(student_id), '') IS NOT NULL
      AND nullif(btrim(name), '') IS NOT NULL
      AND nullif(btrim(school_email), '') IS NOT NULL
    )
    INTO requester_eligible
    FROM users
    WHERE user_id = NEW.requester_user_id
    FOR SHARE;

    IF requester_eligible IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'point request requires an active user with a complete profile'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'FULFILLED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'fulfilled point requests are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status = 'FULFILLED' THEN
    SELECT *
    INTO grant_row
    FROM point_ledger
    WHERE ledger_id = NEW.fulfilled_ledger_id
    FOR SHARE;

    IF NOT FOUND
      OR grant_row.entry_type <> 'ADMIN_GRANT'
      OR grant_row.point_request_id <> NEW.request_id
      OR grant_row.user_id <> NEW.requester_user_id
      OR grant_row.actor_user_id <> NEW.fulfilled_by
      OR grant_row.available_delta <> NEW.requested_amount
    THEN
      RAISE EXCEPTION 'request fulfillment must match its admin grant ledger entry'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'invalid point request transition'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER point_grant_requests_validate_write
BEFORE INSERT OR UPDATE ON point_grant_requests
FOR EACH ROW
EXECUTE FUNCTION validate_point_grant_request_write();

CREATE FUNCTION validate_participant_deposit_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  deposit_amount integer;
  matching_ledger_count integer;
  trip_status text;
BEGIN
  IF NEW.status <> 'DEPOSITED'
    OR OLD.status IS NOT DISTINCT FROM NEW.status
  THEN
    RETURN NEW;
  END IF;

  SELECT status
  INTO trip_status
  FROM trip_groups
  WHERE trip_id = NEW.trip_id
  FOR SHARE;

  SELECT amount
  INTO deposit_amount
  FROM trip_deposits
  WHERE trip_id = NEW.trip_id
    AND user_id = NEW.user_id
  FOR SHARE;

  SELECT count(*)
  INTO matching_ledger_count
  FROM point_ledger
  WHERE trip_id = NEW.trip_id
    AND user_id = NEW.user_id
    AND entry_type = 'DEPOSIT'
    AND available_delta = -deposit_amount
    AND held_delta = deposit_amount;

  IF trip_status <> 'CLOSED'
    OR deposit_amount IS NULL
    OR matching_ledger_count <> 1
  THEN
    RAISE EXCEPTION 'deposited participant requires one matching deposit and ledger entry'
      USING ERRCODE = '23514';
  END IF;

  NEW.deposited_at = COALESCE(NEW.deposited_at, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_participants_validate_deposit_completion
BEFORE UPDATE OF status ON trip_participants
FOR EACH ROW
EXECUTE FUNCTION validate_participant_deposit_completion();

CREATE FUNCTION validate_trip_escrow_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  deposited_count integer;
  invalid_count integer;
BEGIN
  IF NEW.status <> 'CONFIRMED' OR OLD.status = 'CONFIRMED' THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*) FILTER (WHERE p.status = 'DEPOSITED'),
    count(*) FILTER (
      WHERE p.status = 'DEPOSITED'
        AND (
          d.amount IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM point_ledger l
            WHERE l.trip_id = p.trip_id
              AND l.user_id = p.user_id
              AND l.entry_type = 'DEPOSIT'
              AND l.available_delta = -d.amount
              AND l.held_delta = d.amount
          )
        )
    )
  INTO deposited_count, invalid_count
  FROM trip_participants p
  LEFT JOIN trip_deposits d
    ON d.trip_id = p.trip_id
   AND d.user_id = p.user_id
  WHERE p.trip_id = NEW.trip_id;

  IF deposited_count NOT BETWEEN 2 AND NEW.max_participants
    OR invalid_count <> 0
    OR EXISTS (
      SELECT 1
      FROM trip_participants
      WHERE trip_id = NEW.trip_id
        AND status = 'APPROVED'
    )
  THEN
    RAISE EXCEPTION 'confirmed trip requires complete escrow for every approved participant'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_validate_escrow_confirmation
BEFORE UPDATE OF status ON trip_groups
FOR EACH ROW
EXECUTE FUNCTION validate_trip_escrow_confirmation();
