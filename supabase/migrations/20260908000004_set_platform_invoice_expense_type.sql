-- Retag existing Platform Invoice expenses (migrated platform fee data)
-- with the new PLATFORM INV. expense type, instead of PAYMENT.
UPDATE expenses
SET expense_type = 'PLATFORM INV.'
WHERE expense_category_id = (
  SELECT id FROM inventory_expense_types WHERE name = 'Platform Invoice'
);
