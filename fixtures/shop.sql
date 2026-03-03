-- synthetic but realistic-ish schema fixture
CREATE TYPE payment_status AS ENUM ('pending','paid','failed','refunded');

CREATE TABLE customers (
  id bigserial PRIMARY KEY,
  email text,
  created_at timestamptz NOT NULL
);

CREATE TABLE payments (
  id bigserial PRIMARY KEY,
  customer_id bigint,
  status payment_status,
  amount double precision,
  meta jsonb,
  created_at varchar(64)
);

CREATE TABLE payment_events (
  id bigserial,
  payment_id bigint,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz
);
