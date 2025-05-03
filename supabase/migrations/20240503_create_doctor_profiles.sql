
-- Create doctor profiles table
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  specialization TEXT,
  bio TEXT,
  contact_email TEXT,
  phone_number TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "app": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_doctor_user_id UNIQUE (user_id)
);

-- Apply RLS policies
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their own profile" 
  ON public.doctor_profiles
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors can update their own profile" 
  ON public.doctor_profiles
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors can insert their own profile" 
  ON public.doctor_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_doctor_profiles_updated_at
BEFORE UPDATE ON public.doctor_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
