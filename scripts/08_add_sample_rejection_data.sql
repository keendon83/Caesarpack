-- Add sample customer rejection data for testing analytics
-- This script adds realistic sample data with different departments and amounts

-- First, get the customer rejection form ID
DO $$
DECLARE
    form_id_var UUID;
    user_id_var UUID;
BEGIN
    -- Get the customer rejection form ID
    SELECT id INTO form_id_var FROM public.forms WHERE slug = 'customer-rejection';
    
    -- Get a user ID (HOZ user)
    SELECT id INTO user_id_var FROM public.users WHERE username = 'HOZ' LIMIT 1;
    
    -- Insert sample submissions with different departments and amounts
    INSERT INTO public.form_submissions (user_id, form_id, company, submission_data, created_at) VALUES
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-01-15',
            'serialNumber', 'SAMPLE-001',
            'customerName', 'ABC Trading Co.',
            'jobCardNb', 'JC-2024-001',
            'invoiceNb', 'INV-001',
            'dateOfOrder', '2024-01-10',
            'deliveryDate', '2024-01-14',
            'quantityDelivered', 1000,
            'quantityReturned', 200,
            'totalAmount', 50000,
            'totalDiscount', 8000,
            'complaintDescription', 'Quality issues with printing alignment',
            'causeOfComplaint', ARRAY['Quality', 'Printing Problems'],
            'responsibleDepartment', ARRAY['Printing', 'Quality']
        ),
        '2024-01-15 10:30:00'::timestamp
    ),
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-02-20',
            'serialNumber', 'SAMPLE-002',
            'customerName', 'XYZ Logistics',
            'jobCardNb', 'JC-2024-002',
            'invoiceNb', 'INV-002',
            'dateOfOrder', '2024-02-15',
            'deliveryDate', '2024-02-19',
            'quantityDelivered', 2000,
            'quantityReturned', 500,
            'totalAmount', 75000,
            'totalDiscount', 15000,
            'complaintDescription', 'Damaged packaging during shipping',
            'causeOfComplaint', ARRAY['Damaged Sheets'],
            'responsibleDepartment', ARRAY['Logistics/Shipping', 'Packing']
        ),
        '2024-02-20 14:15:00'::timestamp
    ),
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-03-10',
            'serialNumber', 'SAMPLE-003',
            'customerName', 'DEF Manufacturing',
            'jobCardNb', 'JC-2024-003',
            'invoiceNb', 'INV-003',
            'dateOfOrder', '2024-03-05',
            'deliveryDate', '2024-03-09',
            'quantityDelivered', 1500,
            'quantityReturned', 300,
            'totalAmount', 60000,
            'totalDiscount', 12000,
            'complaintDescription', 'Wrong size specifications',
            'causeOfComplaint', ARRAY['Wrong Size'],
            'responsibleDepartment', ARRAY['Pre-Production', 'Design']
        ),
        '2024-03-10 09:45:00'::timestamp
    ),
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-04-05',
            'serialNumber', 'SAMPLE-004',
            'customerName', 'GHI Retail',
            'jobCardNb', 'JC-2024-004',
            'invoiceNb', 'INV-004',
            'dateOfOrder', '2024-04-01',
            'deliveryDate', '2024-04-04',
            'quantityDelivered', 800,
            'quantityReturned', 150,
            'totalAmount', 40000,
            'totalDiscount', 6000,
            'complaintDescription', 'Converting process issues',
            'causeOfComplaint', ARRAY['Above Tolerance'],
            'responsibleDepartment', ARRAY['Converting', 'Corrugator']
        ),
        '2024-04-05 16:20:00'::timestamp
    ),
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-05-12',
            'serialNumber', 'SAMPLE-005',
            'customerName', 'JKL Enterprises',
            'jobCardNb', 'JC-2024-005',
            'invoiceNb', 'INV-005',
            'dateOfOrder', '2024-05-08',
            'deliveryDate', '2024-05-11',
            'quantityDelivered', 1200,
            'quantityReturned', 400,
            'totalAmount', 55000,
            'totalDiscount', 18000,
            'complaintDescription', 'Wet sheets due to storage issues',
            'causeOfComplaint', ARRAY['Wet Sheets'],
            'responsibleDepartment', ARRAY['Logistics/Shipping']
        ),
        '2024-05-12 11:10:00'::timestamp
    ),
    (
        user_id_var,
        form_id_var,
        'Caesarpack Holdings'::company_enum,
        jsonb_build_object(
            'issueDate', '2024-06-08',
            'serialNumber', 'SAMPLE-006',
            'customerName', 'MNO Distribution',
            'jobCardNb', 'JC-2024-006',
            'invoiceNb', 'INV-006',
            'dateOfOrder', '2024-06-03',
            'deliveryDate', '2024-06-07',
            'quantityDelivered', 900,
            'quantityReturned', 200,
            'totalAmount', 45000,
            'totalDiscount', 9000,
            'complaintDescription', 'Sales team miscommunication on specifications',
            'causeOfComplaint', ARRAY['Others'],
            'responsibleDepartment', ARRAY['Sales']
        ),
        '2024-06-08 13:30:00'::timestamp
    );

    RAISE NOTICE 'Sample customer rejection data inserted successfully!';
END $$;
