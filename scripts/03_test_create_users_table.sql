-- Create the "companies" enum type if it doesn't exist
CREATE TYPE company_enum AS ENUM (
'Caesarpack Holdings',
'Caesarpac Kuwait',
'KuwaitBoxes',
'Caesarpac Iraq'
);

-- Create the "user_role" enum type if it doesn't exist
CREATE TYPE user_role_enum AS ENUM (
'admin',
'employee'
);

-- Create the users table if it doesn't exist
CREATE TABLE public.users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
full_name TEXT NOT NULL,
username TEXT UNIQUE NOT NULL,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
company company_enum NOT NULL,
role user_role_enum NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
