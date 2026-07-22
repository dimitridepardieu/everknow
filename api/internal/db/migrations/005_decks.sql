CREATE TABLE decks (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id  bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX decks_profile_id_idx ON decks(profile_id);

CREATE TABLE cards (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deck_id     bigint NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    question    text NOT NULL,
    answer      text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cards_deck_id_idx ON cards(deck_id);
