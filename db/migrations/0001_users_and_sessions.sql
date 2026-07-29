CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_attempt_id uuid NOT NULL,
  signup_attempt_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  student_id text NOT NULL,
  name text NOT NULL,
  gender text NOT NULL,
  school_email text NOT NULL,
  role text NOT NULL DEFAULT 'USER',
  account_status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_student_id_normalized
    CHECK (student_id = btrim(student_id) AND btrim(student_id) <> ''),
  CONSTRAINT users_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT users_school_email_normalized
    CHECK (school_email = lower(btrim(school_email)) AND btrim(school_email) <> ''),
  CONSTRAINT users_gender_valid CHECK (gender IN ('female', 'male')),
  CONSTRAINT users_role_valid CHECK (role IN ('USER', 'ADMIN')),
  CONSTRAINT users_account_status_valid
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  CONSTRAINT users_signup_attempt_unique UNIQUE (signup_attempt_id),
  CONSTRAINT users_signup_attempt_expiry_valid
    CHECK (signup_attempt_expires_at > created_at),
  CONSTRAINT users_student_id_unique UNIQUE (student_id),
  CONSTRAINT users_school_email_unique UNIQUE (school_email)
);

CREATE TABLE auth_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT auth_sessions_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT auth_sessions_expiry_valid CHECK (expires_at > created_at),
  CONSTRAINT auth_sessions_revocation_valid
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX auth_sessions_active_user_idx
  ON auth_sessions (user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX auth_sessions_expires_at_idx ON auth_sessions (expires_at);

CREATE FUNCTION set_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_updated_at();
