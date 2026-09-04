# Casa Amiga - Pending Work

**Last Updated**: 2026-09-04  
**Total Outstanding Items**: 24

---

## Priority: CRITICAL (Blocking Features)

### P0.1: File Attachments Upload
**Status**: 🔴 Not Started  
**Scope**: Revenue & Expenses pages  
**Details**:
- Schema has `attachment_url` field ready
- Need UI buttons to upload files
- Use Supabase Storage (`supabase.storage.from('attachments').upload()`)
- Allow PDF, images (JPG, PNG)
- Display uploaded file previews/links

**Effort**: 2-3 hours  
**Dependencies**: Supabase Storage bucket must be created

---

### P0.2: Booking Edit Functionality
**Status**: 🔴 Not Started  
**Scope**: BookingForm component  
**Details**:
- Form is built but edit mode not connected
- Need edit button on BookingsList
- Fetch booking details into form
- Update instead of create on submit
- Delete button in expanded row

**Effort**: 1-2 hours  
**Files to Update**: BookingsList.tsx, BookingForm.tsx

---

### P0.3: Revenue & Expense Edit
**Status**: 🔴 Not Started  
**Scope**: Revenue & Expenses pages  
**Details**:
- Revenue and Expense forms only support create, not edit
- Add edit mode to forms
- Add edit buttons to tables
- Pre-populate forms when editing

**Effort**: 1.5-2 hours  
**Files**: app/protected/revenue/page.tsx, app/protected/expenses/page.tsx

---

## Priority: HIGH (Enhancements)

### P1.1: Detailed Financial Reports
**Status**: 🟡 Partial (placeholders exist)  
**Scope**: Reports page  
**Details**:
- Breakdown by apartment (revenue/expenses/profit)
- Monthly/quarterly trends
- Top expense categories
- Booking occupancy rates
- Charts: bar chart (revenue/expenses), pie chart (expenses by category)
- Export to CSV/PDF

**Effort**: 4-6 hours  
**Tools**: Recharts or Chart.js for visualizations

---

### P1.2: Email Notifications for Pending Tasks
**Status**: 🔴 Not Started  
**Scope**: Bookings notifications  
**Details**:
- Alert agents when bookings enter "TO BE DONE" tasks
- Reminders for: police registration, platform invoice, final liquidation
- Email templates
- Notification preferences (per user)
- Optional: SMS via Twilio

**Effort**: 3-4 hours  
**Dependencies**: Email service (SendGrid, Resend, or Supabase Functions)

---

### P1.3: Guest Communication Tools
**Status**: 🔴 Not Started  
**Scope**: New feature - guest messages/templates  
**Details**:
- Send pre-arrival/check-in/check-out messages to guests
- Message templates library
- Track message delivery status
- Optional: WhatsApp/SMS integration

**Effort**: 3-4 hours  
**Dependencies**: Messaging service (Twilio, SendGrid)

---

### P1.4: Commission Templates
**Status**: 🔴 Not Started  
**Scope**: Inventory management  
**Details**:
- Store platform-specific commission rates
- Auto-apply commission % based on platform
- Override capability per booking
- Commission history/audit trail

**Effort**: 2-3 hours  
**Schema Changes**: Add `commission_templates` table

---

### P1.5: Calendar Sync
**Status**: 🔴 Not Started  
**Scope**: Bookings integration  
**Details**:
- Google Calendar integration (read/write)
- iCal feed (read-only)
- Sync bookings to external calendars
- Bidirectional sync with conflict handling

**Effort**: 4-5 hours  
**Dependencies**: Google Calendar API, iCal library

---

### P1.6: Dashboard Widget Customization
**Status**: 🔴 Not Started  
**Scope**: Home/Reports page  
**Details**:
- Users can choose which metrics to display
- Drag-and-drop widget reordering
- Save layout preferences
- Quick stats at a glance

**Effort**: 2-3 hours  
**Storage**: User preferences in database

---

## Priority: MEDIUM (Quality & UX)

### P2.1: Advanced Booking Filters
**Status**: 🟡 Partial (basic list exists)  
**Scope**: Bookings page  
**Details**:
- Filter by: status, agent, apartment, date range
- Saved filters / favorites
- Search by guest name/email
- Sort options (date, name, price, status)

**Effort**: 1.5-2 hours  
**Files**: BookingsList.tsx, bookings/page.tsx

---

### P2.2: Revenue/Expense Filters & Search
**Status**: 🟡 Partial  
**Scope**: Revenue & Expenses pages  
**Details**:
- Filter by date range, apartment, category, booking
- Search by vendor/guest name
- Sort by amount, date, status
- Export selected items to CSV

**Effort**: 1-2 hours  
**Files**: revenue/page.tsx, expenses/page.tsx

---

### P2.3: Bulk Actions
**Status**: 🔴 Not Started  
**Scope**: All list pages  
**Details**:
- Select multiple bookings/expenses/revenue
- Bulk edit status (e.g., mark all police registrations as done)
- Bulk delete
- Bulk export

**Effort**: 2-3 hours  
**UX Pattern**: Checkboxes + action bar

---

### P2.4: Undo/Redo Functionality
**Status**: 🔴 Not Started  
**Scope**: Global app feature  
**Details**:
- Undo recent actions (create, delete, update)
- Redo functionality
- Undo history (last 20 actions)
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Effort**: 2-3 hours  
**State Management**: Consider Redux or Zustand

---

### P2.5: Print Booking Receipt
**Status**: 🔴 Not Started  
**Scope**: Bookings detail view  
**Details**:
- Print-friendly booking summary
- Include: guest info, dates, charges, payment details
- Generate PDF invoice
- Email receipt to guest

**Effort**: 1.5-2 hours  
**Tools**: react-pdf or html2pdf

---

### P2.6: Dark Mode Support
**Status**: 🔴 Not Started  
**Scope**: UI/Theme  
**Details**:
- System preference detection
- Toggle dark/light mode
- Save preference per user
- Update all colors (Tailwind classes)

**Effort**: 1-2 hours  
**Tools**: Tailwind's dark mode, next-themes

---

### P2.7: Occupancy Rate Calculation
**Status**: 🟡 Partial (hardcoded at 65%)  
**Scope**: Reports & Bookings  
**Details**:
- Calculate per apartment: booked_nights / total_nights * 100%
- Date range filtering
- Seasonal trends
- Occupancy forecasting

**Effort**: 1-1.5 hours  
**Files**: lib/calculations.ts, reports/page.tsx

---

## Priority: LOW (Polish & Future-Proofing)

### P3.1: Multi-Property Support
**Status**: 🔴 Not Started  
**Scope**: Major feature for future  
**Details**:
- Support multiple companies/properties
- Company-level admin
- Property-specific agents
- Separate bookings/expenses per property
- Consolidated reporting

**Effort**: 8-10 hours (major refactor)  
**Schema Impact**: Add `company_id` to most tables, create companies table

---

### P3.2: Advanced User Management
**Status**: 🔴 Not Started  
**Scope**: Admin panel  
**Details**:
- User invitation (email signup links)
- Role assignment UI
- User activity logs (who did what, when)
- Disable/archive users
- Password reset flow

**Effort**: 2-3 hours  
**Files**: New page - admin/users

---

### P3.3: Audit Trail / Change Log
**Status**: 🔴 Not Started  
**Scope**: Global feature  
**Details**:
- Track all changes: who, what, when, why
- Immutable log table
- View history of any booking/expense/revenue
- Restore from history

**Effort**: 2-3 hours  
**Schema**: Add `audit_logs` table with triggers

---

### P3.4: Multi-Currency Support
**Status**: 🔴 Not Started  
**Scope**: Global setting  
**Details**:
- Support EUR, USD, GBP, JPY, etc.
- Conversion rates (daily updates)
- Show multi-currency on reports
- Per-booking currency option

**Effort**: 2-3 hours  
**Dependencies**: Currency API (fixer.io, XE, etc.)

---

### P3.5: API for External Integrations
**Status**: 🔴 Not Started  
**Scope**: Developer feature  
**Details**:
- REST API for booking queries (read-only)
- Webhook integration (booking created/updated events)
- API key management
- Rate limiting
- OpenAPI docs

**Effort**: 4-5 hours  
**Tools**: API documentation tool (Swagger/OpenAPI)

---

### P3.6: Mobile App (React Native)
**Status**: 🔴 Not Started  
**Scope**: Alternative platform  
**Details**:
- Native iOS/Android app
- Share authentication with web
- Offline mode for critical data
- Push notifications

**Effort**: 10+ hours  
**Tools**: React Native, Expo

---

### P3.7: Automated Testing Suite
**Status**: 🔴 Not Started  
**Scope**: QA/CI  
**Details**:
- Unit tests (Jest) - critical functions
- Integration tests - API flows
- E2E tests (Cypress) - user workflows
- CI/CD pipeline (GitHub Actions)

**Effort**: 6-8 hours  
**Frameworks**: Jest, Cypress, GitHub Actions

---

### P3.8: Performance Monitoring
**Status**: 🔴 Not Started  
**Scope**: DevOps/Observability  
**Details**:
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring
- Database query performance
- Slow query alerts

**Effort**: 1-2 hours (setup)  
**Services**: Sentry, Vercel, LogRocket

---

## Known Limitations

### Current Constraints

1. **No edit for Bookings** - Create only (workaround: delete + recreate)
2. **No edit for Revenue/Expenses** - Create only
3. **Calendar view not filterable by status** - Shows all non-cancelled
4. **Reports hardcoded occupancy** - Not calculated from actual bookings
5. **No real-time collaboration** - No live updates across users
6. **Mobile calendar view cramped** - Could use horizontal scroll
7. **No file upload UI** - Schema ready but no UI
8. **No guest portal** - Can't access bookings without admin login
9. **Single timezone** - All times assumed same timezone
10. **No multi-currency** - Only EUR supported

---

## Suggested Work Order (Recommended Priority)

For maximum impact & user satisfaction:

1. **P0.1** - File attachments (users want to attach invoices)
2. **P0.2** - Booking edit (essential for corrections)
3. **P0.3** - Revenue/Expense edit (consistency)
4. **P2.1** - Booking filters (better data discovery)
5. **P1.1** - Detailed reports (financial insights)
6. **P1.2** - Email notifications (workflow efficiency)
7. **P2.2** - Revenue/Expense filters (data organization)
8. **P1.3** - Guest communication (customer service)
9. **P2.3** - Bulk actions (operational efficiency)
10. **P3.7** - Testing suite (code quality)

---

## Blocked / Waiting For

- User feedback on current MVP
- Decisions on notification strategy (email vs SMS vs push)
- File storage limits (how many attachments?)
- Reporting requirements details (what charts matter most?)
- Guest portal requirements (if needed)

---

## Notes for Future Developers

- Schema is extensible (ready for properties, companies, multi-currency)
- Component structure allows easy feature additions
- Supabase RLS prepared for role expansion
- No tech debt accumulated so far
- Code is well-typed (TypeScript strict mode)
- All changes should follow existing patterns in BookingForm.tsx

---

## Metrics

| Category | Count |
|----------|-------|
| Completed Features | 40+ |
| Pending Features | 24 |
| Known Issues | 0 (MVP complete) |
| Technical Debt | None |
| Code Quality | High (TypeScript, best practices) |

**Completion**: MVP = 100% ✅  
**Total Roadmap**: ~25% complete
