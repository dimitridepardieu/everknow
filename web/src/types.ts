export type AccountType = "parent" | "self";
export type Plan = "free" | "monthly" | "annual";
export type OAuthProvider = "google" | "apple";

export type CardStatus = "pending" | "accepted" | "rejected";
export type Rank = 1 | 2 | 3 | 4 | 5;

export const RANK_NAMES: Record<Rank, string> = {
	1: "Bronze",
	2: "Argent",
	3: "Or",
	4: "Diamant",
	5: "Légende",
};

export type SourceType = "text" | "image" | "pdf" | "url";

export interface Account {
	id: string;
	type: AccountType;
	email: string;
	oauthProvider: OAuthProvider;
	plan: Plan;
	cardsGenerated: number;
	profiles: Profile[];
}

export interface Profile {
	id: string;
	name: string;
	avatar: string;
	decks: Deck[];
}

export interface Deck {
	id: string;
	title: string;
	sourceType: SourceType;
	cards: Card[];
}

export interface Card {
	id: string;
	front: string;
	back: string;
	status: CardStatus;
	rank: Rank;
	nextReviewAt: string;
	reviewLogs: ReviewLog[];
}

export interface ReviewLog {
	id: string;
	answeredAt: string;
	answer: string;
	isCorrect: boolean;
	rankBefore: Rank;
	rankAfter: Rank;
}
