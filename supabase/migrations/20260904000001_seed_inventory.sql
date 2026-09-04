-- Seed initial inventory / master data
INSERT INTO inventory_agents (name) VALUES ('BM'), ('KW')
ON CONFLICT (name) DO NOTHING;

INSERT INTO inventory_apartments (name) VALUES
  ('Barbarita'), ('TMB'), ('Catamaran'), ('Cas Artur'), ('Alexandrite')
ON CONFLICT (name) DO NOTHING;

INSERT INTO inventory_platforms (name) VALUES
  ('Bookings'), ('Airbnb'), ('Idealista'), ('Organic')
ON CONFLICT (name) DO NOTHING;

INSERT INTO inventory_expense_types (name) VALUES
  ('Cleaning'), ('Laundry'), ('Supplies'), ('Tax'), ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO inventory_invoice_items (name) VALUES
  ('Commission'), ('Cleaning&Laundry'), ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO inventory_payment_types (name) VALUES
  ('Cash'), ('Transfer'), ('Platform'), ('NA')
ON CONFLICT (name) DO NOTHING;
