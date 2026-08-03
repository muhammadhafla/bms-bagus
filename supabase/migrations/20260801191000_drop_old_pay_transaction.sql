-- Drop the older versions of pay_transaction functions with the old signatures

-- Drop the 10-argument version
DROP FUNCTION IF EXISTS public.pay_transaction(
    uuid, 
    jsonb, 
    text, 
    numeric, 
    numeric, 
    numeric, 
    numeric, 
    text, 
    uuid, 
    timestamp without time zone
);

-- Drop the 9-argument version (if exists from older migrations)
DROP FUNCTION IF EXISTS public.pay_transaction(
    uuid, 
    jsonb, 
    text, 
    numeric, 
    numeric, 
    numeric, 
    numeric, 
    text, 
    uuid
);
