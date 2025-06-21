-- Safely add CEO role to existing user_role_enum
DO $$ 
BEGIN
    -- Check if 'ceo' value already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'ceo' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'user_role_enum'
        )
    ) THEN
        -- Add the 'ceo' value to the enum
        ALTER TYPE user_role_enum ADD VALUE 'ceo';
        RAISE NOTICE 'CEO role added successfully';
    ELSE
        RAISE NOTICE 'CEO role already exists';
    END IF;
END $$;
