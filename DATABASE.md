# Database Setup Guide

The database schema is **NOT** created automatically. You need to manually set it up in your own Supabase project.

---

## Database Definition Location

**File**: `supabase_schema.sql`

This file contains:
- All table definitions (bookings, revenue, expenses, users, inventory)
- All enums and types
- All indexes
- All RLS (Row-Level Security) policies
- All relationships and constraints

---

## How to Set Up Your Database

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up or log in with your account
3. Create a new project
4. Choose your region
5. Set a secure database password
6. Wait 2-3 minutes for database to initialize

### Step 2: Run the Schema

1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **+ New Query**
3. Copy the **entire contents** of `supabase_schema.sql`
4. Paste it into the SQL editor
5. Click **Run** button
6. Wait for it to complete (should say "Success")

### Step 3: Seed Initial Data

Still in SQL Editor, run this query to populate master data:

```sql
-- Agents
INSERT INTO inventory_agents (name) VALUES ('BM'), ('KW');

-- Apartments
INSERT INTO inventory_apartments (name) VALUES 
  ('Barbarita'), ('TMB'), ('Catamaran'), ('Cas Artur'), ('Alexandrite');

-- Platforms
INSERT INTO inventory_platforms (name) VALUES 
  ('Bookings'), ('Airbnb'), ('Idealista'), ('Organic');

-- Expense Types
INSERT INTO inventory_expense_types (name) VALUES 
  ('Cleaning'), ('Laundry'), ('Supplies'), ('Tax'), ('Other');

-- Invoice Items
INSERT INTO inventory_invoice_items (name) VALUES 
  ('Commission'), ('Cleaning&Laundry'), ('Other');

-- Payment Types
INSERT INTO inventory_payment_types (name) VALUES 
  ('Cash'), ('Transfer'), ('Platform'), ('NA');
```

### Step 4: Create Test Users

In Supabase, go to **Authentication > Users**:

1. Click **Add User**
2. Email: `admin@example.com`
3. Password: `admin123`
4. Click **Create user**

Repeat for:
- Email: `bm@example.com` / Password: `password123`
- Email: `kw@example.com` / Password: `password123`

### Step 5: Assign Roles

Go back to **SQL Editor** and run:

```sql
-- First, get the user IDs:
SELECT id, email FROM auth.users;

-- Then insert users with their IDs (replace with actual IDs from above):
INSERT INTO public.users (id, email, full_name, role, agent_name)
VALUES 
  ('<admin-uuid-here>', 'admin@example.com', 'Administrator', 'admin', NULL),
  ('<bm-uuid-here>', 'bm@example.com', 'Agent BM', 'agent', 'BM'),
  ('<kw-uuid-here>', 'kw@example.com', 'Agent KW', 'agent', 'KW');
```

**Important**: Replace `<admin-uuid-here>`, `<bm-uuid-here>`, `<kw-uuid-here>` with the actual user IDs from the SELECT query above.

---

## Database Schema Overview

### Tables (10 total)

#### Auth & Users
- **users** - User profiles with roles (admin/agent)

#### Master Data / Inventory
- **inventory_agents** - Agent list (BM, KW, etc.)
- **inventory_apartments** - Properties
- **inventory_platforms** - Booking platforms (Bookings.com, Airbnb, etc.)
- **inventory_expense_types** - Expense categories
- **inventory_invoice_items** - Revenue line items
- **inventory_payment_types** - Payment methods

#### Operational Data
- **bookings** - Guest reservations with pricing & task tracking
- **revenue_invoicing** - Income from bookings with commission calculations
- **expenses** - Costs (property-related or booking-specific)

---

## Key Schema Features

### Auto-Calculated Fields
- **bookings.nights** - Automatically calculated from check_out_date - check_in_date
- **bookings.guest_total_amount** - Can be auto-calculated from pricing or manually edited
- **revenue_invoicing.amount** - Automatically calculated: total_services × (commission_percentage / 100)
- **revenue_invoicing.guest_name** - Auto-populated from linked booking
- **expenses.total** - Automatically calculated: amount + VAT

### Enums (Fixed Value Lists)
- `booking_status`: CONFIRMED, PENDING CONFIRMATION, CANCELLED
- `price_basis`: DAY, WEEK, MONTH
- `task_status`: TO BE DONE, DONE, NA
- `revenue_type`: INVOICE, COLLECTION
- `expense_type_enum`: INVOICE, PAYMENT
- `yes_no_na`: Y, N, NA
- `user_role`: admin, agent

### Indexes (Performance)
- Indexed on frequently queried columns:
  - bookings: apartment_id, agent_id, check_in_date, check_out_date
  - revenue_invoicing: booking_id, apartment_id
  - expenses: apartment_id, booking_id

### RLS Policies (Security)
- All tables have row-level security enabled
- Users must be authenticated to access data
- Admins can see all records
- Agents can see all bookings/revenue/expenses (no apartment filtering)
- Only admins can modify inventory tables

---

## Verification Checklist

After setup, verify everything worked:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check agents
SELECT * FROM inventory_agents;

-- Check users
SELECT id, email, role FROM public.users;

-- Check RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'bookings' OR tablename LIKE 'revenue%' OR tablename LIKE 'expenses';
```

All should return results without errors.

---

## Connection String

When connecting from your app, use:

```
URL: https://[your-project-id].supabase.co
Anon Key: [paste your anon key]
DB Password: [your database password from project setup]
```

The app uses the **Anon Key** (not the secret key).

---

## Modifying Schema Later

If you need to add columns or tables later:

1. Go to Supabase SQL Editor
2. Create migration queries
3. Test on a backup/staging project first
4. Update the booking form/components accordingly

**Never delete a column without backing up data first.**

---

## Troubleshooting

### "Table doesn't exist" error
- Did you run `supabase_schema.sql` completely?
- Check for SQL errors in the output
- Try running individual CREATE TABLE statements one at a time

### "Permission denied" error
- Check RLS policies are correctly applied
- Verify user role is set correctly in users table
- Check auth token is valid

### No user data after login
- Did you run the INSERT users query?
- Did you use correct UUIDs from auth.users?
- Check users table has data: `SELECT * FROM public.users;`

### Bookings won't save
- Check all foreign keys exist (apartment_id, agent_id, platform_id, payment_type_id)
- Verify date validation (check_out > check_in)
- Check server logs for specific error

---

## Backup & Recovery

### Automatic Backups
Supabase provides automatic daily backups (free tier: 7 days retention).

### Manual Backup
1. Go to Supabase project settings
2. Click **Backups**
3. Click **Create backup**

### Restore from Backup
Contact Supabase support or restore via CLI:
```bash
supabase db pull --project-ref [project-id]
```

---

## Notes

- Database schema is version-controlled in `supabase_schema.sql`
- Each user/developer should have their own Supabase project (don't share credentials)
- Changes to schema should be documented in this file
- RLS policies ensure data isolation by role
- Calculated fields use Postgres GENERATED ALWAYS AS (immutable)
