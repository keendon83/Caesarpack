-- Insert default departments
INSERT INTO departments (name) VALUES 
    ('Converting'),
    ('Corrugator'),
    ('Pre-Production'),
    ('Ink'),
    ('Quality'),
    ('Sales'),
    ('Design'),
    ('Packing'),
    ('Logistics'),
    ('Finance'),
    ('CEO')
ON CONFLICT (name) DO NOTHING;

-- Clear existing demo users first
DELETE FROM users WHERE username IN ('admin', 'demo', 'ras', 'hoz', 'mda', 'nra');

-- Insert demo users with bcrypt hash for 'demo123'
-- This hash is generated with bcrypt.hash('demo123', 10)
INSERT INTO users (full_name, username, hashed_password, company, designation, role) VALUES 
    ('Demo Admin', 'admin', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'System Administrator', 'admin'),
    ('Demo User', 'demo', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Employee', 'user'),
    ('Sales Director', 'ras', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Sales Director', 'user'),
    ('CEO', 'hoz', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Chief Executive Officer', 'user'),
    ('Finance Manager', 'mda', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Finance Manager', 'user'),
    ('NRA Officer', 'nra', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'NRA Officer', 'user');
