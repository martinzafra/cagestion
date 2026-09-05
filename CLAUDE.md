# Casa Amiga Development Guide

## Project Overview

This is a Next.js web application for tourism property management. It's built with Supabase as the backend and uses TypeScript + React for the frontend.

**Live Features**:
- Bookings management with calendar view
- Revenue & invoicing tracking
- Expense management
- Inventory/master data (admin only)
- Financial reports (admin only)
- Role-based access (admin vs agent)

## Architecture

### Frontend Structure
- **app/**: Next.js 13+ app router
  - `protected/`: All authenticated pages (wrapped with ProtectedLayout)
  - `login/`: Public login page
  - `page.tsx`: Redirects to /bookings

- **components/**: Reusable React components
  - Navigation: Top bar with hamburger menu
  - BookingForm: Create/edit booking form
  - BookingsList: Table view of bookings
  - BookingCalendar: Monthly calendar view per apartment

- **lib/**: Utility functions
  - `supabase.ts`: Supabase client + TypeScript types
  - `calculations.ts`: Price/date calculations

### Database (Supabase)
- **Enums**: booking_status, price_basis, task_status, revenue_type, expense_type_enum, yes_no_na, user_role
- **Main tables**: 
  - `bookings`: Central entity (confirmed, pending, cancelled)
  - `revenue_invoicing`: Income linked to bookings
  - `expenses`: Costs (booking-specific or general)
  - `users`: Auth + roles
  - **Inventory tables**: agents, apartments, platforms, expense_types, invoice_items, payment_types

- **RLS policies**: Admin sees all; agents see all (no apartment filtering as per requirements)

## Key Decisions & Rules

1. **Calculations**:
   - NIGHTS = check_out_date - check_in_date (auto-calculated, not editable)
   - GUEST_TOTAL_AMOUNT = (daily_price × nights) + cleaning_charge + other_charge (auto-calculated, manually editable for adjustments)
   - COMMISSION = total_services × (commission_percentage / 100) (stored)
   - EXPENSE_TOTAL = amount + VAT (auto-calculated)

2. **Date Validation**:
   - Check-out must be after check-in
   - No overlapping bookings for same apartment (except adjacent dates)
   - Check-out of booking A can equal check-in of booking B

3. **Roles**:
   - **Agent**: Can view all bookings/revenue/expenses, but not manage inventory or see full reports
   - **Admin**: Full access including inventory, reports, and user management

4. **Formatting**:
   - All dates: ISO format (YYYY-MM-DD) in database, localized display in UI
   - Currency: EUR format with comma thousands separator
   - Language: English

## Common Tasks

### Adding a new field to Bookings
1. Update schema in `supabase_schema.sql`
2. Update Supabase database
3. Update `BookingForm.tsx` form fields
4. Update database types in `lib/supabase.ts`
5. Add RLS policies if needed

### Adding a new inventory type
1. Create new table in `supabase_schema.sql`
2. Add RLS policies (read for all, insert/update for admin only)
3. Add to `inventory/page.tsx` tabs and tables map
4. Update `tabLabels` and `tables` constants

### Creating a new page/feature
1. Create folder in `app/protected/`
2. Add `page.tsx` component (client-side with 'use client')
3. Add route to Navigation.tsx
4. Use ProtectedLayout automatically wraps it

### File Uploads (Future)
- Use Supabase Storage: `supabase.storage.from('bucket-name').upload(...)`
- Reference column: `attachment_url` (already in schema for revenue/expenses)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=         # From Supabase Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # From Supabase Settings > API (anon key, not secret)
```

## Testing Credentials

Live in the `sajrwsfpvkitqubvzotc` Supabase project. Login accepts either email or username.

- Admin: admin@example.com / username `admin` / admin123
- Agent Barbara (BM): barbara@example.com / username `barbara` / barbara123
- Agent Karo (KW): karo@example.com / username `karo` / karo123

## Performance Notes

- Calendar view queries all bookings for a month (pagination not needed for typical use)
- Revenue/expenses lists fetch 50+ records without pagination (add limit if scales beyond 1000 records)
- No N+1 queries (all use Supabase `.select()` with relationships)

## Styling

- Tailwind CSS for all styling
- Custom layer components in `app/globals.css`:
  - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
  - `.input`, `.select`, `.label`
  - `.card`, `.table`
- Color scheme: Blue primary (#2563eb), Gray secondary (#64748b)

## Known Limitations / Future Work

1. **Reports**: Currently shows only summary stats; detailed charts coming later
2. **Attachments**: Schema ready (attachment_url field) but no upload UI yet
3. **Notifications**: No email/SMS alerts for pending tasks
4. **Multi-property**: System designed for one owner; could extend with company_id
5. **Occupancy Rate**: Hardcoded in reports; needs actual calculation

## Debugging

- Check browser console (F12) for client-side errors
- Check Supabase logs for database issues
- Use `toast.error()` for user-visible errors (from react-hot-toast)
- RLS policy errors appear as "permission denied" in browser console

## Deployment (Vercel recommended)

```bash
# Push to GitHub
git push origin main

# Connect repo to Vercel
# Set env vars in Vercel dashboard
# Auto-deploys on push
```

## Related Files

- `supabase_schema.sql`: Complete database definition + RLS policies
- `README.md`: User-facing setup & feature guide
- `package.json`: All dependencies
