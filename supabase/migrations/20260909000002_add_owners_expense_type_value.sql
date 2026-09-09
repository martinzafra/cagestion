-- Renamed expense_type value: "PLATFORM INV." -> "OWNERS EXPENSE"
-- (displayed as "Owner's Expense"). Postgres can't rename or remove an
-- existing enum value in place, so add the new one here; the follow-up
-- migration retags existing rows once this is committed (a newly added
-- enum value can't be used in the same transaction it's added in).
ALTER TYPE expense_type_enum ADD VALUE IF NOT EXISTS 'OWNERS EXPENSE';
