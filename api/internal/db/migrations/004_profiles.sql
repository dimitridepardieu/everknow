CREATE TABLE profiles (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        text,
    age         smallint CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_user_id_idx ON profiles(user_id);
