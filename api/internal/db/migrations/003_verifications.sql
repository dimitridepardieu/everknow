CREATE TABLE verifications (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identifier  text NOT NULL,
    value       bytea NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verifications_identifier_idx ON verifications(identifier);
