-- Insert initial forms
INSERT INTO public.forms (name, slug, description)
VALUES
  ('Customer Rejection', 'customer-rejection', 'Form for recording customer rejections and complaints.')
ON CONFLICT (slug) DO NOTHING; -- Prevents errors if run multiple times
