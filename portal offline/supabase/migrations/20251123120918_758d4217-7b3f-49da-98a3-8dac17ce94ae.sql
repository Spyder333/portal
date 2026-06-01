-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('school', 'chief_accountant', 'director', 'permanent_secretary');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved_by_accountant', 'approved_by_director', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  school_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create fee approval requests table
CREATE TABLE public.fee_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_name TEXT NOT NULL,
  term TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  number_of_students INTEGER NOT NULL,
  fee_type TEXT NOT NULL,
  description TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accountant_approved_at TIMESTAMPTZ,
  accountant_approved_by UUID REFERENCES auth.users(id),
  accountant_comments TEXT,
  director_approved_at TIMESTAMPTZ,
  director_approved_by UUID REFERENCES auth.users(id),
  director_comments TEXT,
  final_approved_at TIMESTAMPTZ,
  final_approved_by UUID REFERENCES auth.users(id),
  final_comments TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on fee_approval_requests
ALTER TABLE public.fee_approval_requests ENABLE ROW LEVEL SECURITY;

-- Fee requests policies
CREATE POLICY "Schools can view their own requests"
  ON public.fee_approval_requests FOR SELECT
  USING (auth.uid() = school_id);

CREATE POLICY "Schools can create requests"
  ON public.fee_approval_requests FOR INSERT
  WITH CHECK (auth.uid() = school_id);

CREATE POLICY "Accountants can view all requests"
  ON public.fee_approval_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'chief_accountant'));

CREATE POLICY "Accountants can update pending requests"
  ON public.fee_approval_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'chief_accountant') AND status = 'pending');

CREATE POLICY "Directors can view approved by accountant requests"
  ON public.fee_approval_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'director'));

CREATE POLICY "Directors can update accountant approved requests"
  ON public.fee_approval_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'director') AND status = 'approved_by_accountant');

CREATE POLICY "Permanent Secretary can view all requests"
  ON public.fee_approval_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'permanent_secretary'));

CREATE POLICY "Permanent Secretary can update director approved requests"
  ON public.fee_approval_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'permanent_secretary') AND status = 'approved_by_director');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_requests_updated_at
  BEFORE UPDATE ON public.fee_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically create profile and role when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, school_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'school'),
    NEW.raw_user_meta_data->>'school_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'school')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();