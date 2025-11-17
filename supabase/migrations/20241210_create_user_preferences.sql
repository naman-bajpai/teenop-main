-- Create user_preferences table for email notifications and privacy settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Email notification preferences
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  email_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  email_booking_reminders BOOLEAN NOT NULL DEFAULT true,
  email_quote_updates BOOLEAN NOT NULL DEFAULT true,
  email_messages BOOLEAN NOT NULL DEFAULT true,
  email_marketing BOOLEAN NOT NULL DEFAULT false,
  
  -- Privacy preferences
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  show_email BOOLEAN NOT NULL DEFAULT false,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_location BOOLEAN NOT NULL DEFAULT true,
  show_services BOOLEAN NOT NULL DEFAULT true,
  show_ratings BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comments
COMMENT ON TABLE user_preferences IS 'User preferences for email notifications and privacy settings';
COMMENT ON COLUMN user_preferences.email_notifications_enabled IS 'Master switch for all email notifications';
COMMENT ON COLUMN user_preferences.profile_visibility IS 'Who can see the user profile: public, private, or contacts_only';

