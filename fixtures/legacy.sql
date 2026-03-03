CREATE TABLE legacy_orders (
  order_id serial,
  user_id bigint,
  total_price real,
  created_time text,
  PRIMARY KEY (order_id)
);

CREATE TABLE legacy_order_items (
  id bigserial,
  order_id bigint,
  sku text NOT NULL,
  price double precision,
  PRIMARY KEY (id)
);
