-- Extend robots table with technical specifications for catalog
ALTER TABLE public.robots
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS datasheet_url TEXT,
ADD COLUMN IF NOT EXISTS number_of_axes INTEGER,
ADD COLUMN IF NOT EXISTS reach_mm NUMERIC,
ADD COLUMN IF NOT EXISTS repeatability_mm NUMERIC,
ADD COLUMN IF NOT EXISTS payload_kg NUMERIC,
ADD COLUMN IF NOT EXISTS arm_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS urdf_data JSONB,
ADD COLUMN IF NOT EXISTS specifications JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Create enum for image types
CREATE TYPE public.robot_image_type AS ENUM ('primary', 'datasheet', 'working_envelope', 'dimensional', 'other');

-- Create robot_images table for multiple images per robot
CREATE TABLE public.robot_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES public.robots(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_type robot_image_type NOT NULL DEFAULT 'other',
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on robot_images
ALTER TABLE public.robot_images ENABLE ROW LEVEL SECURITY;

-- Public read access for robot_images
CREATE POLICY "Public read robot images"
ON public.robot_images
FOR SELECT
USING (true);

-- Only authenticated users can manage robot images
CREATE POLICY "Authenticated users can manage robot images"
ON public.robot_images
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create robot_specifications table for detailed technical data
CREATE TABLE public.robot_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID REFERENCES public.robots(id) ON DELETE CASCADE UNIQUE NOT NULL,
  working_envelope_data JSONB,
  speed_data JSONB,
  mounting_options TEXT[],
  protection_rating TEXT,
  power_consumption NUMERIC,
  operating_temperature_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on robot_specifications
ALTER TABLE public.robot_specifications ENABLE ROW LEVEL SECURITY;

-- Public read access for robot_specifications
CREATE POLICY "Public read robot specifications"
ON public.robot_specifications
FOR SELECT
USING (true);

-- Only authenticated users can manage robot specifications
CREATE POLICY "Authenticated users can manage robot specifications"
ON public.robot_specifications
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger for robot_specifications updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_robot_specifications_updated_at
BEFORE UPDATE ON public.robot_specifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage buckets for robot media
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('robot-images', 'robot-images', true),
  ('robot-datasheets', 'robot-datasheets', true),
  ('robot-urdf', 'robot-urdf', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for robot-images bucket (public)
CREATE POLICY "Anyone can view robot images in storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'robot-images');

CREATE POLICY "Authenticated users can upload robot images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'robot-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update robot images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'robot-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete robot images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'robot-images' AND auth.uid() IS NOT NULL);

-- Storage policies for robot-datasheets bucket (public)
CREATE POLICY "Anyone can view robot datasheets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'robot-datasheets');

CREATE POLICY "Authenticated users can upload datasheets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'robot-datasheets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update datasheets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'robot-datasheets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete datasheets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'robot-datasheets' AND auth.uid() IS NOT NULL);

-- Storage policies for robot-urdf bucket (private)
CREATE POLICY "Authenticated users can view URDF files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'robot-urdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload URDF files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'robot-urdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update URDF files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'robot-urdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete URDF files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'robot-urdf' AND auth.uid() IS NOT NULL);