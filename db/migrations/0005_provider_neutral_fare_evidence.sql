-- Sprint 3 provider-neutral place and fare evidence.
-- Existing text locations remain readable. Coordinates are not guessed or
-- backfilled, and provider-specific enums are intentionally avoided.

ALTER TABLE trip_groups
  ADD COLUMN location_revision uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN origin_latitude numeric(10, 7),
  ADD COLUMN origin_longitude numeric(10, 7),
  ADD COLUMN origin_location_source text,
  ADD COLUMN origin_place_provider text,
  ADD COLUMN origin_provider_place_id text,
  ADD COLUMN destination_latitude numeric(10, 7),
  ADD COLUMN destination_longitude numeric(10, 7),
  ADD COLUMN destination_location_source text,
  ADD COLUMN destination_place_provider text,
  ADD COLUMN destination_provider_place_id text,
  ADD CONSTRAINT trip_groups_origin_location_valid CHECK (
    (
      origin_latitude IS NULL
      AND origin_longitude IS NULL
      AND origin_location_source IS NULL
      AND origin_place_provider IS NULL
      AND origin_provider_place_id IS NULL
    )
    OR (
      origin_latitude BETWEEN -90 AND 90
      AND origin_longitude BETWEEN -180 AND 180
      AND origin_location_source IN ('SEARCH', 'CURRENT_LOCATION')
      AND (
        (
          origin_location_source = 'SEARCH'
          AND nullif(btrim(origin_place_provider), '') IS NOT NULL
          AND nullif(btrim(origin_provider_place_id), '') IS NOT NULL
        )
        OR (
          origin_location_source = 'CURRENT_LOCATION'
          AND origin_place_provider IS NULL
          AND origin_provider_place_id IS NULL
        )
      )
    )
  ),
  ADD CONSTRAINT trip_groups_destination_location_valid CHECK (
    (
      destination_latitude IS NULL
      AND destination_longitude IS NULL
      AND destination_location_source IS NULL
      AND destination_place_provider IS NULL
      AND destination_provider_place_id IS NULL
    )
    OR (
      destination_latitude BETWEEN -90 AND 90
      AND destination_longitude BETWEEN -180 AND 180
      AND destination_location_source = 'SEARCH'
      AND nullif(btrim(destination_place_provider), '') IS NOT NULL
      AND nullif(btrim(destination_provider_place_id), '') IS NOT NULL
    )
  );

CREATE TABLE fare_estimates (
  fare_estimate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trip_groups(trip_id) ON DELETE RESTRICT,
  trip_location_revision uuid NOT NULL,
  route_calculation_id text NOT NULL,
  fare_calculation_id text NOT NULL,
  provider_key text NOT NULL,
  route_distance_m integer NOT NULL,
  duration_seconds integer NOT NULL,
  estimated_fare_won integer NOT NULL,
  deposit_points_total integer NOT NULL,
  fare_source text NOT NULL,
  pricing_policy_key text NOT NULL,
  pricing_policy_version text NOT NULL,
  calculated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  request_trace_id text NOT NULL,
  request_fingerprint text NOT NULL,
  calculation_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fare_estimates_trip_identity
    UNIQUE (trip_id, fare_estimate_id),
  CONSTRAINT fare_estimates_idempotent
    UNIQUE (trip_id, idempotency_key),
  CONSTRAINT fare_estimates_route_calculation_unique
    UNIQUE (provider_key, route_calculation_id),
  CONSTRAINT fare_estimates_distance_valid CHECK (route_distance_m >= 0),
  CONSTRAINT fare_estimates_duration_valid CHECK (duration_seconds >= 0),
  CONSTRAINT fare_estimates_fare_valid
    CHECK (estimated_fare_won BETWEEN 1 AND 1000000),
  CONSTRAINT fare_estimates_points_valid
    CHECK (deposit_points_total BETWEEN 1 AND 1000000),
  CONSTRAINT fare_estimates_time_valid CHECK (
    calculated_at <= created_at + interval '5 minutes'
    AND expires_at > calculated_at
  ),
  CONSTRAINT fare_estimates_sources_valid CHECK (
    nullif(btrim(route_calculation_id), '') IS NOT NULL
    AND nullif(btrim(fare_calculation_id), '') IS NOT NULL
    AND nullif(btrim(provider_key), '') IS NOT NULL
    AND nullif(btrim(fare_source), '') IS NOT NULL
    AND nullif(btrim(pricing_policy_key), '') IS NOT NULL
    AND nullif(btrim(pricing_policy_version), '') IS NOT NULL
    AND nullif(btrim(request_trace_id), '') IS NOT NULL
    AND nullif(btrim(request_fingerprint), '') IS NOT NULL
  ),
  CONSTRAINT fare_estimates_basis_valid
    CHECK (
      jsonb_typeof(calculation_basis) = 'object'
      AND calculation_basis <> '{}'::jsonb
    )
);

CREATE INDEX fare_estimates_trip_calculated_idx
  ON fare_estimates (trip_id, calculated_at DESC);

CREATE INDEX fare_estimates_expiry_idx
  ON fare_estimates (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE trip_groups
  ADD COLUMN current_fare_estimate_id uuid,
  ADD CONSTRAINT trip_groups_current_fare_estimate_fk
    FOREIGN KEY (trip_id, current_fare_estimate_id)
    REFERENCES fare_estimates(trip_id, fare_estimate_id)
    ON DELETE RESTRICT;
