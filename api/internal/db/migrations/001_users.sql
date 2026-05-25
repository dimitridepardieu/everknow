CREATE TYPE user_role AS ENUM ('family', 'individual');

CREATE TABLE users (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            text,
    email           text NOT NULL UNIQUE CHECK (email = lower(email)),
    email_verified  boolean NOT NULL DEFAULT false,
    role            user_role,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
