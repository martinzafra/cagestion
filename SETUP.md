# Quick Start Guide

Get Casa Amiga running in 5 minutes.

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Create a new project
3. Wait for database to initialize (2-3 mins)
4. Go to **Settings > API** and copy:
   - Project URL
   - Anon Key (not the secret key!)

## Step 2: Set Up Database

1. In Supabase, go to **SQL Editor**
2. Create a new query and paste the contents of `supabase_schema.sql`
3. Run the query (should complete without errors)

## Step 3: Seed Initial Data

Still in SQL Editor, run this query to populate master data:

```sql
-- Insert Agents
INSERT INTO inventory_agents (name) VALUES ('BM'), ('KW');

-- Insert Apartments
INSERT INTO inventory_apartments (name) VALUES 
  ('Barbarita'), ('TMB'), ('Catamaran'), ('Cas Artur'), ('Alexandrite');

-- Insert Platforms
INSERT INTO inventory_platforms (name) VALUES 
  ('Bookings'), ('Airbnb'), ('Idealista'), ('Organic');

-- Insert Expense Types
INSERT INTO inventory_expense_types (name) VALUES 
  ('Cleaning'), ('Laundry'), ('Supplies'), ('Tax'), ('Other');

-- Insert Invoice Items
INSERT INTO inventory_invoice_items (name) VALUES 
  ('Commission'), ('Cleaning&Laundry'), ('Other');

-- Insert Payment Types
INSERT INTO inventory_payment_types (name) VALUES 
  ('Cash'), ('Transfer'), ('Platform'), ('NA');
```

## Step 4: Create Test Users

In Supabase **Authentication > Users**:

1. Click **Add user**
2. Email: `admin@example.com`, Password: `admin123`
3. Click **Add user** again
4. Email: `bm@example.com`, Password: `password123`

Then go to **SQL Editor** and run:

```sql
-- Get user IDs from auth.users table first, then:
INSERT INTO public.users (id, email, full_name, role, agent_name)
VALUES 
  ('<admin-user-id>', 'admin@example.com', 'Administrator', 'admin', NULL),
  ('<bm-user-id>', 'bm@example.com', 'Agent BM', 'agent', 'BM');
```

To find user IDs, run this query first:
```sql
SELECT id, email FROM auth.users;
```

Copy the IDs and use them above.

## Step 5: Configure Environment

1. In the project folder, create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
```

(Paste your actual Project URL and Anon Key from Step 1)

## Step 6: Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 7: First Login

Login with:
- **Email**: admin@example.com
- **Password**: admin123

You should see the Bookings page. 🎉

## Next Steps

1. Create a new booking (click "New Booking")
2. Add apartments/platforms/agents in Inventory (admin only)
3. Create revenue and expense entries
4. View the calendar view for apartments

## Troubleshooting

**"Connection refused" on localhost:3000**
- Is `npm run dev` still running? Check terminal.

**Login fails with "Invalid credentials"**
- Did you create the users in Supabase Auth AND the users table?
- Both steps are required.

**"Database error" when creating booking**
- Check Supabase logs (Settings > Logs)
- Verify all relationships exist (apartment_id, agent_id, platform_id)

**"Access denied" on Inventory page**
- Only admin users can access. Check the user role in the users table.

## Notes

- The app works offline for viewing cached data, but real-time sync requires Supabase connection
- All dates use YYYY-MM-DD format (ISO)
- Currency is EUR
- Language is English

## What's Included

✅ Full booking system with calendar view  
✅ Revenue & invoicing  
✅ Expense tracking  
✅ Master data management (inventory)  
✅ Financial reports (admin only)  
✅ Responsive mobile/desktop design  
✅ User authentication with roles  

## Need Help?

See `README.md` for detailed feature documentation and `CLAUDE.md` for development notes.
