CREATE TABLE trip_groups (
  trip_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  origin text NOT NULL,
  destination text NOT NULL,
  departure_at timestamptz NOT NULL,
  max_participants smallint NOT NULL,
  estimated_fare integer NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  creation_idempotency_key uuid NOT NULL,
  confirmation_idempotency_key uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_groups_origin_not_blank CHECK (btrim(origin) <> ''),
  CONSTRAINT trip_groups_destination_not_blank CHECK (btrim(destination) <> ''),
  CONSTRAINT trip_groups_max_participants_valid
    CHECK (max_participants BETWEEN 2 AND 4),
  CONSTRAINT trip_groups_estimated_fare_valid
    CHECK (estimated_fare BETWEEN 1 AND 1000000),
  CONSTRAINT trip_groups_status_valid
    CHECK (status IN ('OPEN', 'CONFIRMED', 'SETTLEMENT_PENDING', 'COMPLETED', 'EXPIRED')),
  CONSTRAINT trip_groups_creation_idempotent
    UNIQUE (host_user_id, creation_idempotency_key),
  CONSTRAINT trip_groups_confirmation_idempotent
    UNIQUE (host_user_id, confirmation_idempotency_key)
);

CREATE TABLE trip_participants (
  trip_id uuid NOT NULL REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role text NOT NULL,
  status text NOT NULL,
  application_idempotency_key uuid,
  approval_idempotency_key uuid,
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  deposited_at timestamptz,
  completed_at timestamptz,
  PRIMARY KEY (trip_id, user_id),
  CONSTRAINT trip_participants_role_valid CHECK (role IN ('HOST', 'MEMBER')),
  CONSTRAINT trip_participants_status_valid
    CHECK (status IN ('APPROVED', 'APPLIED', 'DEPOSITED', 'COMPLETED')),
  CONSTRAINT trip_participants_host_state_valid
    CHECK (role <> 'HOST' OR status IN ('APPROVED', 'DEPOSITED', 'COMPLETED')),
  CONSTRAINT trip_participants_application_idempotent
    UNIQUE (user_id, application_idempotency_key),
  CONSTRAINT trip_participants_approval_idempotent
    UNIQUE (trip_id, approval_idempotency_key)
);

CREATE UNIQUE INDEX trip_participants_one_host_idx
  ON trip_participants (trip_id)
  WHERE role = 'HOST';

CREATE INDEX trip_groups_open_departure_idx
  ON trip_groups (departure_at, created_at DESC)
  WHERE status = 'OPEN';

CREATE INDEX trip_participants_user_idx
  ON trip_participants (user_id, applied_at DESC);

CREATE TABLE trip_deposits (
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id),
  FOREIGN KEY (trip_id, user_id)
    REFERENCES trip_participants(trip_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT trip_deposits_amount_valid CHECK (amount BETWEEN 1 AND 1000000)
);

CREATE TABLE trip_settlements (
  trip_id uuid PRIMARY KEY REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  actual_fare integer NOT NULL,
  participant_count smallint NOT NULL,
  final_share integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  submitted_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  fare_submission_idempotency_key uuid NOT NULL,
  settlement_idempotency_key uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CONSTRAINT trip_settlements_actual_fare_valid
    CHECK (actual_fare BETWEEN 1 AND 1000000),
  CONSTRAINT trip_settlements_participant_count_valid
    CHECK (participant_count BETWEEN 2 AND 4),
  CONSTRAINT trip_settlements_final_share_valid
    CHECK (final_share = ceil(actual_fare::numeric / participant_count)::integer),
  CONSTRAINT trip_settlements_status_valid
    CHECK (status IN ('PENDING_CONFIRMATION', 'COMPLETED')),
  CONSTRAINT trip_settlements_submission_idempotent
    UNIQUE (submitted_by, fare_submission_idempotency_key),
  CONSTRAINT trip_settlements_completion_idempotent
    UNIQUE (submitted_by, settlement_idempotency_key)
);

CREATE TABLE fare_confirmations (
  trip_id uuid NOT NULL REFERENCES trip_settlements(trip_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id),
  FOREIGN KEY (trip_id, user_id)
    REFERENCES trip_participants(trip_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT fare_confirmations_idempotent UNIQUE (user_id, idempotency_key)
);

CREATE TABLE point_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE RESTRICT,
  available_points bigint NOT NULL DEFAULT 0,
  held_points bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT point_accounts_available_nonnegative CHECK (available_points >= 0),
  CONSTRAINT point_accounts_held_nonnegative CHECK (held_points >= 0)
);

INSERT INTO point_accounts (user_id)
SELECT user_id FROM users;

CREATE TABLE point_ledger (
  ledger_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  entry_type text NOT NULL,
  available_delta integer NOT NULL,
  held_delta integer NOT NULL,
  trip_id uuid REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  reason text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT point_ledger_entry_type_valid
    CHECK (entry_type IN (
      'ADMIN_GRANT',
      'DEPOSIT',
      'SETTLEMENT_CHARGE',
      'REFUND',
      'ADDITIONAL_DEBIT'
    )),
  CONSTRAINT point_ledger_non_zero
    CHECK (available_delta <> 0 OR held_delta <> 0),
  CONSTRAINT point_ledger_reason_not_blank CHECK (btrim(reason) <> ''),
  CONSTRAINT point_ledger_shape_valid CHECK (
    (entry_type = 'ADMIN_GRANT' AND available_delta > 0 AND held_delta = 0 AND trip_id IS NULL)
    OR (entry_type = 'DEPOSIT' AND available_delta < 0 AND held_delta = -available_delta AND trip_id IS NOT NULL)
    OR (entry_type = 'SETTLEMENT_CHARGE' AND available_delta = 0 AND held_delta < 0 AND trip_id IS NOT NULL)
    OR (entry_type = 'REFUND' AND available_delta > 0 AND held_delta = -available_delta AND trip_id IS NOT NULL)
    OR (entry_type = 'ADDITIONAL_DEBIT' AND available_delta < 0 AND held_delta = 0 AND trip_id IS NOT NULL)
  )
);

CREATE INDEX point_ledger_user_created_idx
  ON point_ledger (user_id, created_at DESC);

CREATE INDEX point_ledger_trip_idx
  ON point_ledger (trip_id, created_at)
  WHERE trip_id IS NOT NULL;

CREATE VIEW point_balances AS
SELECT
  user_id,
  available_points,
  held_points
FROM point_accounts;

CREATE FUNCTION create_point_account_for_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO point_accounts (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_create_point_account
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_point_account_for_user();

CREATE FUNCTION apply_point_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE point_accounts
  SET
    available_points = available_points + NEW.available_delta,
    held_points = held_points + NEW.held_delta,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'point account missing for user %', NEW.user_id
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER point_ledger_apply_to_account
BEFORE INSERT ON point_ledger
FOR EACH ROW
EXECUTE FUNCTION apply_point_ledger_entry();

CREATE FUNCTION set_trip_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_groups_set_updated_at
BEFORE UPDATE ON trip_groups
FOR EACH ROW
EXECUTE FUNCTION set_trip_groups_updated_at();
