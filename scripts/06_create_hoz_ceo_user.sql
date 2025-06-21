-- Create the HOZ user (CEO) for testing signature authentication
INSERT INTO public.users (full_name, username, email, password_hash, company, role)
VALUES (
'HOZ (CEO)', 
'HOZ', 
'hoz@caesarpack.com', 
'$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
'Caesarpack Holdings'::company_enum, 
'ceo'::user_role_enum
)
ON CONFLICT (username) DO UPDATE SET
full_name = EXCLUDED.full_name,
email = EXCLUDED.email,
password_hash = EXCLUDED.password_hash,
company = EXCLUDED.company,
role = EXCLUDED.role;
