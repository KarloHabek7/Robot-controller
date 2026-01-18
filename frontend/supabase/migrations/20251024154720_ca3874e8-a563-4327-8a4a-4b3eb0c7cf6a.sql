-- Create robots table to store information about all lab robots
CREATE TABLE public.robots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  x_coordinate NUMERIC NOT NULL DEFAULT 0,
  y_coordinate NUMERIC NOT NULL DEFAULT 0,
  z_coordinate NUMERIC NOT NULL DEFAULT 0,
  gripper_open BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read robots (public access)
CREATE POLICY "Anyone can view robots"
ON public.robots
FOR SELECT
USING (true);

-- Create policy to allow anyone to update robot status (for demo purposes)
CREATE POLICY "Anyone can update robots"
ON public.robots
FOR UPDATE
USING (true);

-- Create policy to allow anyone to insert robots (for demo purposes)
CREATE POLICY "Anyone can insert robots"
ON public.robots
FOR INSERT
WITH CHECK (true);

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION public.update_robot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_robots_timestamp
BEFORE UPDATE ON public.robots
FOR EACH ROW
EXECUTE FUNCTION public.update_robot_timestamp();

-- Insert some sample robots
INSERT INTO public.robots (name, x_coordinate, y_coordinate, z_coordinate, gripper_open) VALUES
  ('UR5 Robot Arm', 150.5, 200.3, 75.8, true),
  ('ABB IRB 1600', -45.2, 180.0, 120.5, false),
  ('KUKA KR 10', 300.0, -150.7, 95.2, true),
  ('Fanuc M-20iA', 0.0, 250.5, 180.0, false),
  ('Yaskawa Motoman', 100.3, 100.3, 50.0, true),
  ('Universal Robots UR10', -200.5, 300.0, 200.3, false);