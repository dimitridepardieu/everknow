import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { parentAccount } from "@/data/mock";

export const Route = createFileRoute("/child/")({
	component: ChildHomePage,
	validateSearch: (search: Record<string, unknown>) => ({
		profile: search.profile as string | undefined,
	}),
});

function ChildHomePage() {
	const { profile: profileId } = Route.useSearch();
	const profile =
		parentAccount.profiles.find((p) => p.id === profileId) ??
		parentAccount.profiles[0];
	const today = new Date().toISOString().split("T")[0];

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>
				{profile.avatar} Bonjour {profile.name} !
			</p>

			<div className="flex flex-col gap-3">
				{profile.decks.map((deck) => {
					const accepted = deck.cards.filter((c) => c.status === "accepted");
					const toReview = accepted.filter((c) => c.nextReviewAt <= today);

					return (
						<div
							key={deck.id}
							className="flex flex-col gap-2 rounded-lg border p-3"
						>
							<p>{deck.title}</p>
							<p>{toReview.length} carte(s) à réviser</p>
							{toReview.length > 0 && (
								<Link to="/child/review/$deckId" params={{ deckId: deck.id }}>
									<Button className="w-full cursor-pointer">Réviser !</Button>
								</Link>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
