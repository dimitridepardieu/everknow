-- Development seed — idempotent, safe to run multiple times.
-- Three users covering the three states a UI screen may need to handle:
--   parent  — onboarded, sees parent dashboard
--   student — onboarded, sees student experience
--   newbie  — verified email but no role yet, lands on /onboarding

INSERT INTO users (email, email_verified, role) VALUES
    ('parent@dev.local',  true, 'parent'),
    ('student@dev.local', true, 'student'),
    ('newbie@dev.local',  true, NULL)
ON CONFLICT (email) DO NOTHING;
