-- Couple Dashboard Tables for Wedding Planning
-- Budget tracking, expenses, vendors, gifts, and tasks

-- =====================================================
-- BUDGET CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  name TEXT NOT NULL,
  estimated_amount DECIMAL(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  icon TEXT, -- Optional icon identifier
  color TEXT -- Optional color for visual display
);

-- Default wedding budget categories
INSERT INTO budget_categories (name, sort_order, icon) VALUES
  ('Venue & Rentals', 1, 'building'),
  ('Catering & Bar', 2, 'utensils'),
  ('Photography & Video', 3, 'camera'),
  ('Music & Entertainment', 4, 'music'),
  ('Flowers & Decor', 5, 'flower'),
  ('Attire & Beauty', 6, 'shirt'),
  ('Stationery & Invites', 7, 'mail'),
  ('Transportation', 8, 'car'),
  ('Rings & Jewelry', 9, 'ring'),
  ('Officiant & License', 10, 'document'),
  ('Gifts & Favors', 11, 'gift'),
  ('Honeymoon', 12, 'plane'),
  ('Miscellaneous', 13, 'dots');

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on budget_categories" ON budget_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on budget_categories" ON budget_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on budget_categories" ON budget_categories
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on budget_categories" ON budget_categories
  FOR DELETE USING (true);

-- =====================================================
-- VENDORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  name TEXT NOT NULL,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,

  contract_amount DECIMAL(10, 2) DEFAULT 0,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_date DATE,

  notes TEXT,
  status TEXT CHECK (status IN ('researching', 'contacted', 'booked', 'paid', 'completed', 'cancelled')) DEFAULT 'researching'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on vendors" ON vendors
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on vendors" ON vendors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on vendors" ON vendors
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on vendors" ON vendors
  FOR DELETE USING (true);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
  payment_date DATE,
  payment_method TEXT, -- cash, check, credit card, etc.

  due_date DATE,
  receipt_url TEXT, -- Link to receipt image/file
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on expenses" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on expenses" ON expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on expenses" ON expenses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on expenses" ON expenses
  FOR DELETE USING (true);

-- =====================================================
-- GIFTS TABLE (Track wedding gifts and contributions)
-- =====================================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  giver_name TEXT NOT NULL,
  giver_email TEXT,

  gift_type TEXT CHECK (gift_type IN ('cash', 'check', 'item', 'experience', 'registry', 'other')) DEFAULT 'cash',
  description TEXT,
  amount DECIMAL(10, 2), -- For monetary gifts

  received_date DATE DEFAULT CURRENT_DATE,
  thank_you_sent BOOLEAN DEFAULT FALSE,
  thank_you_sent_date DATE,

  linked_rsvp_id UUID REFERENCES rsvps(id) ON DELETE SET NULL,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gifts_giver ON gifts(giver_name);
CREATE INDEX IF NOT EXISTS idx_gifts_type ON gifts(gift_type);
CREATE INDEX IF NOT EXISTS idx_gifts_thank_you ON gifts(thank_you_sent);

-- Enable RLS
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on gifts" ON gifts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on gifts" ON gifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on gifts" ON gifts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on gifts" ON gifts
  FOR DELETE USING (true);

-- =====================================================
-- TASKS TABLE (Wedding planning checklist)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,

  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,

  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to TEXT, -- 'nate', 'blake', 'both', or null

  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on tasks" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on tasks" ON tasks
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on tasks" ON tasks
  FOR DELETE USING (true);

-- =====================================================
-- BUDGET SETTINGS TABLE (Overall budget configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  total_budget DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT
);

-- Insert default settings row
INSERT INTO budget_settings (total_budget, currency) VALUES (0, 'USD');

-- Enable RLS
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on budget_settings" ON budget_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on budget_settings" ON budget_settings
  FOR UPDATE USING (true);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================
CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gifts_updated_at
  BEFORE UPDATE ON gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_settings_updated_at
  BEFORE UPDATE ON budget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
