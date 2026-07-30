DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
     WHERE student_id !~ '^[0-9]{9}$'
        OR name <> btrim(name)
        OR name = ''
        OR school_email !~ '^[^@[:space:]]+@jbnu[.]ac[.]kr$'
  ) THEN
    RAISE EXCEPTION 'Existing users violate normalized MVP profile constraints.';
  END IF;
END;
$$;

ALTER TABLE users
  ADD CONSTRAINT users_student_id_format
    CHECK (student_id ~ '^[0-9]{9}$'),
  ADD CONSTRAINT users_name_normalized
    CHECK (name = btrim(name) AND name <> ''),
  ADD CONSTRAINT users_school_email_domain
    CHECK (school_email ~ '^[^@[:space:]]+@jbnu[.]ac[.]kr$');

CREATE INDEX users_active_login_lookup_idx
  ON users (student_id, name)
  WHERE account_status = 'ACTIVE';
