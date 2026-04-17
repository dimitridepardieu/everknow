import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { parentAccount } from "@/data/mock";

export const Route = createFileRoute("/home")({
	component: HomePage,
});

function HomePage() {
	const navigate = useNavigate();
	const account = parentAccount;

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			{account.profiles.map((profile) => (
				<div key={profile.id} className="flex flex-col gap-3">
					<p>
						{profile.avatar} {profile.name}
					</p>
					{profile.decks.map((deck) => {
						const acceptedCards = deck.cards.filter(
							(c) => c.status === "accepted",
						);
						const toReview = acceptedCards.filter(
							(c) => c.nextReviewAt <= new Date().toISOString().split("T")[0],
						);
						return (
							<Link
								key={deck.id}
								to="/decks/$id/filter"
								params={{ id: deck.id }}
								className="cursor-pointer rounded-lg border p-3"
							>
								<p>{deck.title}</p>
								<p>
									{acceptedCards.length} cartes · {toReview.length} à réviser
								</p>
							</Link>
						);
					})}
				</div>
			))}

			<Button
				variant="outline"
				className="w-full cursor-pointer"
				onClick={() => navigate({ to: "/decks/new" })}
			>
				+ Nouveau deck
			</Button>

			<Link
				to="/settings"
				className="cursor-pointer underline underline-offset-4"
			>
				⚙ Paramètres
			</Link>
		</div>
	);
}
