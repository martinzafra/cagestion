-- Retag existing PLATFORM INV. expenses with the new OWNERS EXPENSE value.
UPDATE expenses
SET expense_type = 'OWNERS EXPENSE'
WHERE expense_type = 'PLATFORM INV.';
