-- Add CEO role to the user_role_enum type
ALTER TYPE user_role_enum ADD VALUE 'ceo';

-- Update HOZ user to have CEO role instead of admin
UPDATE public.users 
SET role = 'ceo'::user_role_enum 
WHERE username = 'HOZ';
