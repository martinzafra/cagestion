-- Enable RLS on inventory tables (missed in initial schema - policies existed but RLS was not enforced)
ALTER TABLE inventory_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_payment_types ENABLE ROW LEVEL SECURITY;
