-- Fix search_path security issue in update_robot_timestamp function
CREATE OR REPLACE FUNCTION public.update_robot_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;