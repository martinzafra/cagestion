-- Seed inventory data
INSERT INTO inventory_agents (name) VALUES ('BM'), ('KW');
INSERT INTO inventory_apartments (name) VALUES ('Barbarita'), ('TMB'), ('Catamaran'), ('Cas Artur'), ('Alexandrite');
INSERT INTO inventory_platforms (name) VALUES ('Bookings'), ('Airbnb'), ('Idealista'), ('Organic');
INSERT INTO inventory_expense_types (name) VALUES ('Cleaning'), ('Laundry'), ('Supplies'), ('Tax'), ('Other');
INSERT INTO inventory_invoice_items (name) VALUES ('Commission'), ('Cleaning&Laundry'), ('Other');
INSERT INTO inventory_payment_types (name) VALUES ('Cash'), ('Transfer'), ('Platform'), ('NA');