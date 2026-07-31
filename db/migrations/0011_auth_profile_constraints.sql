ALTER TABLE users
  ADD CONSTRAINT users_student_id_format
    CHECK (student_id ~ '^[0-9]{9}$') NOT VALID,
  ADD CONSTRAINT users_name_normalized
    CHECK (name = btrim(name) AND name <> '') NOT VALID,
  ADD CONSTRAINT users_school_email_domain
    CHECK (school_email ~ '^[^@[:space:]]+@jbnu[.]ac[.]kr$') NOT VALID;

CREATE INDEX users_active_login_lookup_idx
  ON users (student_id, name)
  WHERE account_status = 'ACTIVE';
