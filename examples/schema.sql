-- Example schema for SchemaSentry demos (Postgres)

CREATE TABLE users (
  id bigserial,
  email text,
  created_at varchar(64),
  updated_at varchar(64),
  PRIMARY KEY (id)
);

CREATE TABLE orders (
  id bigserial,
  user_id bigint,
  amount double precision,
  status order_status,
  payload jsonb,
  created_at timestamptz,
  PRIMARY KEY (id)
);

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'refunded');

-- Missing FK + missing index on user_id
-- Nullable user_id and non-unique email
