-- Marketplace: Purchases Table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, prompt_id) -- Only buy a prompt once
);

-- RLS for Purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Helper function to check if a user has purchased a specific prompt
CREATE OR REPLACE FUNCTION has_purchased_prompt(user_uuid UUID, prompt_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM purchases
    WHERE user_id = user_uuid AND prompt_id = prompt_uuid AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Prompts RLS for authors
CREATE POLICY "Authors can manage their own prompts" ON prompts
  FOR ALL USING (auth.uid() = user_id);

-- Refined SELECT policy for Prompts
-- Everyone sees public prompts, but we can use our helper functions for frontend logic.
-- To actually secure the 'prompt_text' column at the DB level, we would need a view or a separate table.
-- For this MVP, we rely on frontend blurring + RLS visibility for the whole row.
