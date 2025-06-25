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

-- Insert demo users with properly hashed passwords
-- Password for all demo users: demo123
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (full_name, username, hashed_password, company, designation, role) VALUES 
    ('Demo Admin', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'System Administrator', 'admin'),
    ('Demo User', 'demo', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'Employee', 'user'),
    ('Sales Director', 'ras', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'Sales Director', 'user'),
    ('CEO', 'hoz', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'Chief Executive Officer', 'user'),
    ('Finance Manager', 'mda', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'Finance Manager', 'user'),
    ('NRA Officer', 'nra', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Company', 'NRA Officer', 'user')
ON CONFLICT (username) DO NOTHING;
