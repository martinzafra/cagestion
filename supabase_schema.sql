-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'agent');
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'PENDING CONFIRMATION', 'CANCELLED');
CREATE TYPE price_basis AS ENUM ('DAY', 'WEEK', 'MONTH');
CREATE TYPE task_status AS ENUM ('TO BE DONE', 'DONE', 'NA');
CREATE TYPE revenue_type AS ENUM ('INVOICE', 'COLLECTION');
CREATE TYPE expense_type_enum AS ENUM ('INVOICE', 'PAYMENT');
CREATE TYPE yes_no_na AS ENUM ('Y', 'N', 'NA');

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'agent',
  agent_name TEXT, -- 'BM' or 'KW'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventories / Master data
CREATE TABLE IF NOT EXISTS inventory_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'BM', 'KW'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'Barbarita', 'TMB', 'Catamaran', 'Cas Artur', 'Alexandrite'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'Bookings', 'Airbnb', 'Idealista', 'Organic'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_expense_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'Cleaning', 'Laundry', 'Supplies', 'Tax', 'Other'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'Commission', 'Cleaning&Laundry', 'Other'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_payment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'Cash', 'Transfer', 'Platform', 'NA'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table (central entity)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id_number BIGSERIAL UNIQUE NOT NULL,
  booking_date DATE NOT NULL,
  booking_ref TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES inventory_agents(id),
  apartment_id UUID NOT NULL REFERENCES inventory_apartments(id),
  platform_id UUID NOT NULL REFERENCES inventory_platforms(id),
  status booking_status DEFAULT 'PENDING CONFIRMATION',

  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,

  check_in_date DATE NOT NULL,
  check_in_time TIME,
  check_out_date DATE NOT NULL,
  check_out_time TIME,
  nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  number_of_guests INTEGER,

  deposit yes_no_na DEFAULT 'NA',
  deposit_amount DECIMAL(10, 2),
  payment_type_id UUID REFERENCES inventory_payment_types(id),
  comments TEXT,
  guest_comments TEXT,

  price_basis price_basis DEFAULT 'DAY',
  daily_price DECIMAL(10, 2) NOT NULL,
  cleaning_charge DECIMAL(10, 2) DEFAULT 0,
  other_charge DECIMAL(10, 2) DEFAULT 0,
  guest_total_amount DECIMAL(10, 2),

  police_registration task_status DEFAULT 'TO BE DONE',
  platform_invoice task_status DEFAULT 'TO BE DONE',
  platform_invoice_date DATE,
  final_liquidation task_status DEFAULT 'TO BE DONE',
  final_liquidation_date DATE,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue & Invoicing table
CREATE TABLE IF NOT EXISTS revenue_invoicing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_type revenue_type NOT NULL,
  revenue_number BIGSERIAL UNIQUE NOT NULL,
  revenue_date DATE NOT NULL,

  apartment_id UUID NOT NULL REFERENCES inventory_apartments(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),

  invoice_item_id UUID NOT NULL REFERENCES inventory_invoice_items(id),
  total_services DECIMAL(10, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  amount DECIMAL(10, 2) GENERATED ALWAYS AS (
    total_services * (commission_percentage / 100)
  ) STORED,

  issued BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_type expense_type_enum NOT NULL,
  expense_category_id UUID NOT NULL REFERENCES inventory_expense_types(id),
  vendor TEXT NOT NULL,
  expense_date DATE NOT NULL,
  invoice_number TEXT,

  amount DECIMAL(10, 2) NOT NULL,
  vat DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (
    amount + COALESCE(vat, 0)
  ) STORED,

  apartment_id UUID NOT NULL REFERENCES inventory_apartments(id),
  booking_id UUID REFERENCES bookings(id),

  attachment_url TEXT,
  comments TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bookings_apartment_id ON bookings(apartment_id);
CREATE INDEX idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX idx_bookings_check_out_date ON bookings(check_out_date);
CREATE INDEX idx_revenue_booking_id ON revenue_invoicing(booking_id);
CREATE INDEX idx_revenue_apartment_id ON revenue_invoicing(apartment_id);
CREATE INDEX idx_expenses_apartment_id ON expenses(apartment_id);
CREATE INDEX idx_expenses_booking_id ON expenses(booking_id);

-- RLS (Row Level Security) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_invoicing ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Bookings: Admins see all, agents see all (no filtering by apartment)
CREATE POLICY "Users can view bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('admin', 'agent'))
  );

CREATE POLICY "Users can update bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

-- Revenue & Invoicing: Admins see all, agents see all
CREATE POLICY "Users can view revenue" ON revenue_invoicing
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert revenue" ON revenue_invoicing
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('admin', 'agent'))
  );

CREATE POLICY "Users can update revenue" ON revenue_invoicing
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

-- Expenses: Admins see all, agents see all
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('admin', 'agent'))
  );

CREATE POLICY "Users can update expenses" ON expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

-- Inventory tables: Only admins can insert/update
CREATE POLICY "Inventory read access" ON inventory_agents FOR SELECT USING (true);
CREATE POLICY "Inventory agents admin insert" ON inventory_agents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory agents admin update" ON inventory_agents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Inventory apartments read" ON inventory_apartments FOR SELECT USING (true);
CREATE POLICY "Inventory apartments admin insert" ON inventory_apartments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory apartments admin update" ON inventory_apartments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Inventory platforms read" ON inventory_platforms FOR SELECT USING (true);
CREATE POLICY "Inventory platforms admin insert" ON inventory_platforms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory platforms admin update" ON inventory_platforms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Inventory expense types read" ON inventory_expense_types FOR SELECT USING (true);
CREATE POLICY "Inventory expense types admin insert" ON inventory_expense_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory expense types admin update" ON inventory_expense_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Inventory invoice items read" ON inventory_invoice_items FOR SELECT USING (true);
CREATE POLICY "Inventory invoice items admin insert" ON inventory_invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory invoice items admin update" ON inventory_invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Inventory payment types read" ON inventory_payment_types FOR SELECT USING (true);
CREATE POLICY "Inventory payment types admin insert" ON inventory_payment_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Inventory payment types admin update" ON inventory_payment_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role = 'admin')
);
