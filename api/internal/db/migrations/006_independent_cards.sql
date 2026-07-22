-- A card becomes independent: it carries its own learner, its own rank and its
-- own due date. A deck is now just an optional name laid over a set of cards,
-- so deleting a deck drops the label, not the child's work.
--
-- due_at IS NULL is what "mastered" means: the card has climbed the whole
-- ladder and never comes back. The top rank is deliberately NOT encoded here
-- (no CHECK naming a maximum) so adding a sixth rank is a one-line change in
-- Go with no migration — and cards already mastered stay mastered.
ALTER TABLE cards
    ADD COLUMN profile_id bigint      REFERENCES profiles(id) ON DELETE CASCADE,
    ADD COLUMN rank       smallint    NOT NULL DEFAULT 1 CHECK (rank >= 1),
    ADD COLUMN due_at     timestamptz DEFAULT now();

-- Every existing card sits in a deck, and the deck knows the learner.
UPDATE cards SET profile_id = decks.profile_id FROM decks WHERE cards.deck_id = decks.id;

ALTER TABLE cards
    ALTER COLUMN profile_id SET NOT NULL,
    ALTER COLUMN deck_id DROP NOT NULL,
    DROP CONSTRAINT cards_deck_id_fkey,
    ADD CONSTRAINT cards_deck_id_fkey
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL;

-- Serves both halves of the feature: the due-cards lookup filters on
-- (profile_id, due_at), and the leading column covers the profile cascade.
DROP INDEX cards_deck_id_idx;
CREATE INDEX cards_deck_id_idx ON cards(deck_id) WHERE deck_id IS NOT NULL;
CREATE INDEX cards_profile_id_due_at_idx ON cards(profile_id, due_at);
