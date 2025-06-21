-- Drop tables if they exist to allow re-running the script
DROP TABLE IF EXISTS public.form_submissions CASCADE;
DROP TABLE IF EXISTS public.user_form_permissions CASCADE;
DROP TABLE IF EXISTS public.forms CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop types if they exist to allow re-running the script
DROP TYPE IF EXISTS company_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

-- Create the "companies" enum type
CREATE TYPE company_enum AS ENUM (
'Caesarpack Holdings',
'Caesarpac Kuwait',
'KuwaitBoxes',
'Caesarpac Iraq'
);

-- Create the "user_role" enum type
CREATE TYPE user_role_enum AS ENUM (
'admin',
'employee'
);

-- Create the users table
CREATE TABLE public.users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Use gen_random_uuid() for primary key
full_name TEXT NOT NULL,
username TEXT UNIQUE NOT NULL,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL, -- Will store hashed passwords from NextAuth.js
company company_enum NOT NULL,
role user_role_enum NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the forms table
CREATE TABLE public.forms (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
slug TEXT UNIQUE NOT NULL,
description TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the user_form_permissions table
CREATE TABLE public.user_form_permissions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
UNIQUE (user_id, form_id) -- Ensure a user has only one permission entry per form
);

-- Create the form_submissions table
CREATE TABLE public.form_submissions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
company company_enum NOT NULL, -- Auto-fetched from user
submission_data JSONB NOT NULL, -- Stores filled form content
is_signed BOOLEAN DEFAULT FALSE,
signed_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- CEO who signed
signed_at TIMESTAMP WITH TIME ZONE,
pdf_url TEXT, -- URL to generated PDF
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
