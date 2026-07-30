SELECT count(*) AS invalid_point_ledger_deltas
FROM point_ledger
WHERE abs(available_delta::bigint) > 1000000
   OR abs(held_delta::bigint) > 1000000
   OR btrim(idempotency_key) = '';

SELECT count(*) AS invalid_point_account_balances
FROM point_accounts a
LEFT JOIN (
  SELECT
    user_id,
    sum(available_delta) AS available_points,
    sum(held_delta) AS held_points
  FROM point_ledger
  GROUP BY user_id
) l ON l.user_id = a.user_id
WHERE a.available_points <> COALESCE(l.available_points, 0)
   OR a.held_points <> COALESCE(l.held_points, 0)
   OR a.available_points < 0
   OR a.held_points < 0;

SELECT count(*) AS invalid_point_request_fulfillments
FROM point_grant_requests r
LEFT JOIN point_ledger l ON l.ledger_id = r.fulfilled_ledger_id
WHERE (
    r.status = 'PENDING'
    AND (
      r.fulfilled_by IS NOT NULL
      OR r.fulfilled_ledger_id IS NOT NULL
      OR r.fulfilled_at IS NOT NULL
    )
  )
  OR (
    r.status = 'FULFILLED'
    AND (
      l.ledger_id IS NULL
      OR l.entry_type <> 'ADMIN_GRANT'
      OR l.point_request_id <> r.request_id
      OR l.user_id <> r.requester_user_id
      OR l.actor_user_id <> r.fulfilled_by
      OR l.available_delta <> r.requested_amount
      OR l.held_delta <> 0
    )
  );

SELECT count(*) AS users_with_multiple_pending_point_requests
FROM (
  SELECT requester_user_id
  FROM point_grant_requests
  WHERE status = 'PENDING'
  GROUP BY requester_user_id
  HAVING count(*) > 1
) duplicated_pending_requests;

SELECT count(*) AS invalid_confirmed_trip_escrow
FROM trip_groups g
WHERE g.status = 'CONFIRMED'
  AND (
    (
      SELECT count(*)
      FROM trip_participants p
      WHERE p.trip_id = g.trip_id
        AND p.status = 'DEPOSITED'
    ) NOT BETWEEN 2 AND g.max_participants
    OR EXISTS (
      SELECT 1
      FROM trip_participants p
      LEFT JOIN trip_deposits d
        ON d.trip_id = p.trip_id
       AND d.user_id = p.user_id
      WHERE p.trip_id = g.trip_id
        AND (
          p.status = 'APPROVED'
          OR (
            p.status = 'DEPOSITED'
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
        )
    )
  );
