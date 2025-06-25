import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { databaseUrl } = await request.json()

    if (!databaseUrl) {
      return NextResponse.json({ error: "Database URL is required" }, { status: 400 })
    }

    const sql = neon(databaseUrl)

    // Complete database setup script
    const setupScript = `
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
    `

    // Execute the setup script
    await sql(setupScript)

    // Insert departments
    await sql`
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
    `

    // Insert demo users with bcrypt hashed passwords for 'demo123'
    const hashedPassword = "$2b$10$K7L/8Y.f89yFz/M9Rl2YUOuEQu9iDXvJ5w5o6tY8kZqXvU4nW8zYG"

    await sql`
      INSERT INTO users (full_name, username, hashed_password, company, designation, role) VALUES 
          ('Demo Admin', 'admin', ${hashedPassword}, 'Demo Company', 'System Administrator', 'admin'),
          ('Demo User', 'demo', ${hashedPassword}, 'Demo Company', 'Employee', 'user'),
          ('Sales Director', 'ras', ${hashedPassword}, 'Demo Company', 'Sales Director', 'user'),
          ('CEO', 'hoz', ${hashedPassword}, 'Demo Company', 'Chief Executive Officer', 'user'),
          ('Finance Manager', 'mda', ${hashedPassword}, 'Demo Company', 'Finance Manager', 'user'),
          ('NRA Officer', 'nra', ${hashedPassword}, 'Demo Company', 'NRA Officer', 'user')
    `

    // Insert sample forms
    await sql`
      INSERT INTO forms (title, form_data, created_by, status) VALUES 
          ('Customer Rejection - ABC Company', 
           '{"customerName": "ABC Company", "totalDiscount": "5000", "complaintDescription": "Quality issues with delivered products", "qualityIssues": ["Quality", "Damaged Sheets"], "responsibleDepartments": [5, 9]}',
           2, 'in_progress'),
          ('Customer Rejection - XYZ Corp', 
           '{"customerName": "XYZ Corp", "totalDiscount": "3000", "complaintDescription": "Wrong size delivered", "qualityIssues": ["Wrong Size"], "responsibleDepartments": [6]}',
           2, 'completed')
    `

    // Insert sample workflows
    await sql`
      INSERT INTO form_workflows (form_id, user_id, sequence_order, signed, signed_at) VALUES 
          (1, 6, 1, TRUE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
          (1, 3, 2, FALSE, NULL),
          (1, 4, 3, FALSE, NULL),
          (1, 5, 4, FALSE, NULL),
          (2, 6, 1, TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
          (2, 3, 2, TRUE, CURRENT_TIMESTAMP - INTERVAL '20 hours'),
          (2, 4, 3, TRUE, CURRENT_TIMESTAMP - INTERVAL '18 hours'),
          (2, 5, 4, TRUE, CURRENT_TIMESTAMP - INTERVAL '16 hours')
    `

    // Insert sample form departments
    await sql`
      INSERT INTO form_departments (form_id, department_id, rejection_amount) VALUES 
          (1, 5, 2500.00),
          (1, 9, 2500.00),
          (2, 6, 3000.00)
    `

    // Insert sample signatures
    await sql`
      INSERT INTO signatures (form_id, user_id, signature_hash) VALUES 
          (1, 6, '1-6-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
          (2, 6, '2-6-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
          (2, 3, '2-3-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
          (2, 4, '2-4-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
          (2, 5, '2-5-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP))
    `

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully",
      details: {
        tables: "All tables created with indexes",
        departments: "11 departments added",
        users: "6 demo users created (password: demo123)",
        forms: "2 sample forms with workflows created",
      },
    })
  } catch (error) {
    console.error("Database setup error:", error)
    return NextResponse.json(
      {
        error: "Database setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
