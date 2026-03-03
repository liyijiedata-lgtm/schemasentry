CREATE TABLE tenants (
  id bigserial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE audit_log (
  id bigserial,
  tenant_id bigint,
  actor_user_id bigint,
  action text NOT NULL,
  context jsonb,
  created_at timestamptz
);
