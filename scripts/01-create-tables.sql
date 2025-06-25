-- Create database schema for Form Approval System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    designation VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    form_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    form_data JSONB NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'))
);

-- Form workflows table
CREATE TABLE IF NOT EXISTS form_workflows (
    workflow_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    sequence_order INTEGER NOT NULL,
    signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP,
    updated_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form permissions table
CREATE TABLE IF NOT EXISTS form_permissions (
    permission_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form departments table (for rejection amounts)
CREATE TABLE IF NOT EXISTS form_departments (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(department_id),
    rejection_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signatures table
CREATE TABLE IF NOT EXISTS signatures (
    signature_id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(form_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_hash VARCHAR(255) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_form_workflows_form_id ON form_workflows(form_id);
CREATE INDEX IF NOT EXISTS idx_form_workflows_user_id ON form_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_form_permissions_form_id ON form_permissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_permissions_user_id ON form_permissions(user_id);
