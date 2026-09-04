# Casa Amiga - Database Setup Guide

## Status

✅ **Schema prepared**: `SETUP_SCHEMA.sql` (10,643 bytes)
✅ **Seed data prepared**: `SEED_DATA.sql` (ready to execute)
⚠️ **Setup requires manual execution** (see instructions below)

## Files Prepared

### 1. SETUP_SCHEMA.sql
Complete database schema including:
- **7 Enum types**: user_role, booking_status, price_basis, task_status, revenue_type, expense_type_enum, yes_no_na
- **10 Tables**:
  - `users` - User profiles and roles
  - `bookings` - Central booking entity
  - `revenue_invoicing` - Income tracking
  - `expenses` - Cost tracking
  - `inventory_agents` - Agent list (BM, KW)
  - `inventory_apartments` - Property list (5 apartments)
  - `inventory_platforms` - Booking platform list (Bookings, Airbnb, Idealista, Organic)
  - `inventory_expense_types` - Expense categories
  - `inventory_invoice_items` - Invoice line items
  - `inventory_payment_types` - Payment methods
- **8 Performance indexes**
- **20+ Row Level Security (RLS) policies**

### 2. SEED_DATA.sql
Initial inventory data:
- 2 agents: BM, KW
- 5 apartments: Barbarita, TMB, Catamaran, Cas Artur, Alexandrite
- 4 platforms: Bookings, Airbnb, Idealista, Organic
- 5 expense types: Cleaning, Laundry, Supplies, Tax, Other
- 3 invoice items: Commission, Cleaning&Laundry, Other
- 4 payment types: Cash, Transfer, Platform, NA

## Supabase Project Details

- **Project ID**: sajrwsfpvkitqubvzotc
- **Project URL**: https://sajrwsfpvkitqubvzotc.supabase.co
- **Dashboard**: https://app.supabase.com

## How to Complete Setup

### Method 1: Supabase Dashboard (Recommended - Easiest)

This is the fastest and most straightforward approach:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Log in with your Supabase account

2. **Select Your Project**
   - Click on project: `sajrwsfpvkitqubvzotc`

3. **Execute Schema**
   - Navigate to: **SQL Editor** (left sidebar)
   - Click: **New Query**
   - Open file: `SETUP_SCHEMA.sql` (from this directory)
   - Copy and paste ALL contents into the query editor
   - Click: **Run** (bottom right)
   - Wait for: "Success" message
   - ⏱️ Expected time: 2-5 seconds

4. **Verify Schema Creation**
   - Navigate to: **Database** > **Tables** (left sidebar)
   - Verify you see all 10 tables:
     - users
     - bookings
     - revenue_invoicing
     - expenses
     - inventory_agents
     - inventory_apartments
     - inventory_platforms
     - inventory_expense_types
     - inventory_invoice_items
     - inventory_payment_types

5. **Seed Initial Data**
   - Go back to: **SQL Editor** > **New Query**
   - Open file: `SEED_DATA.sql` (from this directory)
   - Copy and paste contents
   - Click: **Run**
   - Verify data was inserted (should show row count)

6. **Verify Seed Data**
   - Navigate to: **Database** > **Tables**
   - Click each inventory table to verify data:
     - inventory_agents: 2 rows (BM, KW)
     - inventory_apartments: 5 rows (Barbarita, TMB, etc.)
     - inventory_platforms: 4 rows (Bookings, Airbnb, etc.)
     - inventory_expense_types: 5 rows
     - inventory_invoice_items: 3 rows
     - inventory_payment_types: 4 rows

**Status After Method 1**: ✅ COMPLETE - Database ready for application use

---

### Method 2: Supabase CLI (Advanced)

If you prefer command-line tools:

1. **Get Access Token**
   - Go to: https://app.supabase.com
   - Click: Account (top right)
   - Click: **Access Tokens**
   - Create new token (if needed)
   - Copy the token

2. **Authenticate CLI**
   ```bash
   supabase login
   # Paste your access token when prompted
   ```

3. **Execute Schema**
   ```bash
   supabase db execute --project-id sajrwsfpvkitqubvzotc < SETUP_SCHEMA.sql
   ```

4. **Execute Seed Data**
   ```bash
   supabase db execute --project-id sajrwsfpvkitqubvzotc < SEED_DATA.sql
   ```

5. **Verify**
   ```bash
   supabase db list-tables --project-id sajrwsfpvkitqubvzotc
   ```

**Status After Method 2**: ✅ COMPLETE - Database ready for application use

---

### Method 3: PostgreSQL Client (psql)

If you have PostgreSQL installed locally:

1. **Get Connection Details**
   - Go to: Supabase Dashboard
   - Click: **Project Settings** > **Database**
   - Look for: **Connection string** section
   - Copy the connection string

2. **Connect and Execute**
   ```bash
   psql "your-connection-string" < SETUP_SCHEMA.sql
   psql "your-connection-string" < SEED_DATA.sql
   ```

**Status After Method 3**: ✅ COMPLETE - Database ready for application use

---

## Troubleshooting

### Issue: "Table already exists" error
- **Cause**: Schema was already partially applied
- **Solution**: 
  1. Go to Supabase Dashboard > SQL Editor
  2. Drop existing tables: `DROP TABLE IF EXISTS [table_name] CASCADE;`
  3. Re-run SETUP_SCHEMA.sql

### Issue: "Permission denied" error  
- **Cause**: User doesn't have admin role
- **Solution**:
  1. Go to Supabase Dashboard
  2. Check user role in **Authentication** > **Users**
  3. Use admin/superuser account or contact Supabase support

### Issue: "Seed data not inserting"
- **Cause**: Foreign key constraints (schema must exist first)
- **Solution**: Always execute SETUP_SCHEMA.sql before SEED_DATA.sql

### Issue: "Cannot find project"
- **Cause**: Wrong project ID
- **Solution**: Verify project ID is: `sajrwsfpvkitqubvzotc`

## What Gets Created

### Core Entities
- **Bookings**: 30+ fields for property reservations (check-in, check-out, guest info, pricing, status tracking)
- **Revenue/Invoicing**: Income tracking linked to bookings
- **Expenses**: Cost tracking with categories and VAT calculations

### Key Calculations (Auto-calculated)
- **nights** = check_out_date - check_in_date
- **guest_total_amount** = (daily_price × nights) + cleaning_charge + other_charge
- **commission** = total_services × (commission_percentage / 100)
- **expense_total** = amount + VAT

### Security (RLS Policies)
- Users can view/manage their own bookings
- Agents can view all bookings (not filtered by apartment)
- Admins have full access
- Inventory tables: read by all, edit by admins only

## Next Steps

After database setup completes:

1. **Create Users** (via Supabase Auth)
   - Admin: admin@example.com
   - Agent 1: bm@example.com
   - Agent 2: kw@example.com

2. **Update Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://sajrwsfpvkitqubvzotc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```

3. **Start Application**
   ```bash
   npm install
   npm run dev
   ```

4. **Test Booking Flow**
   - Create a test booking
   - Verify calculations work
   - Check revenue/expense tracking

## Performance Notes

- Bookings query: Fetches full month (no pagination needed for typical use)
- Revenue/expenses: Fetch 50+ records without pagination
- Indexes on: apartment_id, agent_id, check_in_date, check_out_date
- No N+1 queries (all use Supabase relationships)

## Database Structure Reference

See `SETUP_SCHEMA.sql` for complete DDL with:
- Column definitions and types
- Constraints and defaults
- Generated columns
- Index specifications
- RLS policy details

---

**Created**: September 4, 2026
**Schema Version**: 1.0
**Status**: Ready for manual deployment
