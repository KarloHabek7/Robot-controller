-- Drop ALL existing overly permissive policies on robots table
DROP POLICY IF EXISTS "Anyone can view robots" ON public.robots;
DROP POLICY IF EXISTS "Anyone can insert robots" ON public.robots;
DROP POLICY IF EXISTS "Anyone can update robots" ON public.robots;

-- Create secure policies: Public read, authenticated write
CREATE POLICY "Public read access to robots"
ON public.robots
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert robots"
ON public.robots
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update robots"
ON public.robots
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete robots"
ON public.robots
FOR DELETE
USING (auth.uid() IS NOT NULL);