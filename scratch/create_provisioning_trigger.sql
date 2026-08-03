-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create a new isolated workspace for the user
  INSERT INTO public.workspaces (name, website_url, logo_url, industry)
  VALUES ('My Workspace', '', '', '')
  RETURNING id INTO new_workspace_id;

  -- Assign the user as Knowledge Admin for their new workspace
  INSERT INTO public.user_roles (user_id, role, workspace_id)
  VALUES (NEW.id, 'Knowledge Admin', new_workspace_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
