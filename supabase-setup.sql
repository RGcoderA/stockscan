-- ============================================================
--  StockScan – Supabase Database Setup
--  Run this entire script in Supabase → SQL Editor → New query
-- ============================================================


-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id            BIGSERIAL PRIMARY KEY,
  product_name  TEXT    NOT NULL,
  barcode       TEXT    NOT NULL UNIQUE,
  stock_count   INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  category      TEXT    NOT NULL DEFAULT '',
  emoji         TEXT    NOT NULL DEFAULT '📦',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. AUTO-UPDATE updated_at ON EVERY ROW CHANGE
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.inventory;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Anyone can READ inventory (needed for scanning without login)
CREATE POLICY "Public can read inventory"
  ON public.inventory FOR SELECT
  USING (true);

-- Only authenticated users (your admin account) can INSERT
CREATE POLICY "Auth users can insert"
  ON public.inventory FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can UPDATE (stock checkout / adjustments)
CREATE POLICY "Auth users can update"
  ON public.inventory FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users can DELETE
CREATE POLICY "Auth users can delete"
  ON public.inventory FOR DELETE
  USING (auth.role() = 'authenticated');


-- 4. ENABLE REAL-TIME for this table
-- ============================================================
-- Go to Supabase → Database → Replication → Tables
-- and toggle ON for the "inventory" table.
-- (Cannot be done via SQL; use the dashboard toggle.)


-- 5. SEED INITIAL INVENTORY
--    40 total items: 20 Soccer Balls + 20 Basketballs
-- ============================================================
INSERT INTO public.inventory (product_name, barcode, stock_count, category, emoji)
VALUES
  ('Soccer Ball', 'SOC-001', 20, 'Sports Equipment', '⚽'),
  ('Basketball',  'BSK-001', 20, 'Sports Equipment', '🏀')
ON CONFLICT (barcode) DO NOTHING;


-- ============================================================
--  DONE! You should see 2 rows in the inventory table.
--  Next: create your admin user in Supabase → Authentication
--        → Users → Add user (email + password).
-- ============================================================
