-- Development seed — idempotent, safe to run multiple times.
-- Three users covering the three states a UI screen may need to handle:
--   family     — onboarded, manages child profiles (family dashboard)
--   individual — onboarded, solo learner experience
--   newbie     — verified email but no role yet, lands on /onboarding

INSERT INTO users (email, email_verified, role) VALUES
    ('family@dev.local',     true, 'family'),
    ('individual@dev.local', true, 'individual'),
    ('newbie@dev.local',     true, NULL)
ON CONFLICT (email) DO NOTHING;
