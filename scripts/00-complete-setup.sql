-- Complete database setup for Form Approval System
-- Run this script in your Neon database console

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS signatures CASCADE;
DROP TABLE IF EXISTS form_departments CASCADE;
DROP TABLE IF EXISTS form_permissions CASCADE;
DROP TABLE IF EXISTS form_workflows CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    designation VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create forms table
CREATE TABLE forms (
    form_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    form_data JSONB NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'))
);

-- Create form workflows table
CREATE TABLE form_workflows (
    workflow_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    sequence_order INTEGER NOT NULL,
    signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP,
    updated_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form permissions table
CREATE TABLE form_permissions (
    permission_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form departments table (for rejection amounts)
CREATE TABLE form_departments (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(department_id),
    rejection_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create signatures table
CREATE TABLE signatures (
    signature_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_hash VARCHAR(255) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_form_workflows_form_id ON form_workflows(form_id);
CREATE INDEX idx_form_workflows_user_id ON form_workflows(user_id);
CREATE INDEX idx_form_permissions_form_id ON form_permissions(form_id);
CREATE INDEX idx_form_permissions_user_id ON form_permissions(user_id);

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
    ('CEO');

-- Insert demo users with bcrypt hashed passwords for 'demo123'
-- Hash: $2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG
INSERT INTO users (full_name, username, hashed_password, company, designation, role) VALUES 
    ('Demo Admin', 'admin', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'System Administrator', 'admin'),
    ('Demo User', 'demo', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Employee', 'user'),
    ('Sales Director', 'ras', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Sales Director', 'user'),
    ('CEO', 'hoz', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Chief Executive Officer', 'user'),
    ('Finance Manager', 'mda', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'Finance Manager', 'user'),
    ('NRA Officer', 'nra', '$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG', 'Demo Company', 'NRA Officer', 'user');

-- Insert sample forms for demonstration
INSERT INTO forms (title, form_data, created_by, status) VALUES 
    ('Customer Rejection - ABC Company', 
     '{"customerName": "ABC Company", "totalDiscount": "5000", "complaintDescription": "Quality issues with delivered products", "qualityIssues": ["Quality", "Damaged Sheets"], "responsibleDepartments": [5, 9]}',
     2, 'in_progress'),
    ('Customer Rejection - XYZ Corp', 
     '{"customerName": "XYZ Corp", "totalDiscount": "3000", "complaintDescription": "Wrong size delivered", "qualityIssues": ["Wrong Size"], "responsibleDepartments": [6]}',
     2, 'completed');

-- Insert sample workflows for the forms
INSERT INTO form_workflows (form_id, user_id, sequence_order, signed, signed_at) VALUES 
    (1, 6, 1, TRUE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),  -- NRA signed
    (1, 3, 2, FALSE, NULL),  -- RAS pending
    (1, 4, 3, FALSE, NULL),  -- HOZ pending
    (1, 5, 4, FALSE, NULL),  -- MDA pending
    (2, 6, 1, TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day'),   -- NRA signed
    (2, 3, 2, TRUE, CURRENT_TIMESTAMP - INTERVAL '20 hours'), -- RAS signed
    (2, 4, 3, TRUE, CURRENT_TIMESTAMP - INTERVAL '18 hours'), -- HOZ signed
    (2, 5, 4, TRUE, CURRENT_TIMESTAMP - INTERVAL '16 hours'); -- MDA signed

-- Insert sample form departments with rejection amounts
INSERT INTO form_departments (form_id, department_id, rejection_amount) VALUES 
    (1, 5, 2500.00),  -- Quality department
    (1, 9, 2500.00),  -- Logistics department
    (2, 6, 3000.00);  -- Sales department

-- Insert sample signatures
INSERT INTO signatures (form_id, user_id, signature_hash) VALUES 
    (1, 6, '1-6-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
    (2, 6, '2-6-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
    (2, 3, '2-3-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
    (2, 4, '2-4-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
    (2, 5, '2-5-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP));

-- Verify the setup
SELECT 'Setup completed successfully!' as status;
SELECT 'Users created: ' || COUNT(*) as user_count FROM users;
SELECT 'Departments created: ' || COUNT(*) as dept_count FROM departments;
SELECT 'Forms created: ' || COUNT(*) as form_count FROM forms;
