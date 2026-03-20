-- 1. Add Status Column to Prompts
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Update Prompts RLS (Public only sees approved)
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON prompts;
CREATE POLICY "Public sees only approved prompts" ON prompts 
FOR SELECT USING (status = 'approved' OR auth.uid() = created_by);

-- 3. Creator Management (Update/Delete)
CREATE POLICY "Creators can update own prompts" ON prompts 
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete own prompts" ON prompts 
FOR DELETE USING (auth.uid() = created_by);

-- 4. Admin Privileges (Manage Status)
CREATE POLICY "Admins can manage prompt status" ON prompts
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Revenue System: Commission Structure
-- We'll add an 'admin_commission' column to purchases or creator_earnings if needed.
-- For now, we use the logic in main.js (90/10 split), but we record it in creator_earnings.
ALTER TABLE creator_earnings
ADD COLUMN IF NOT EXISTS total_sale_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10, 2);
