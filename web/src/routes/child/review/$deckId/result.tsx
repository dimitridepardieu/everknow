import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { parentAccount } from "@/data/mock";
import { RANK_NAMES, type Rank } from "@/types";

export const Route = createFileRoute("/child/review/$deckId/result")({
	component: ResultPage,
	validateSearch: (search: Record<string, unknown>) => ({
		results: (search.results as string) ?? "[]",
	}),
});

function ResultPage() {
	const { deckId } = Route.useParams();
	const { results: resultsJson } = Route.useSearch();
	const navigate = useNavigate();

	const results: { cardId: string; answer: string; isCorrect: boolean }[] =
		JSON.parse(resultsJson);

	const deck = parentAccount.profiles
		.flatMap((p) => p.decks)
		.find((d) => d.id === deckId);

	const correct = results.filter((r) => r.isCorrect).length;
	const total = results.length;

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>
				Résultat : {correct} / {total}
			</p>

			<div className="flex flex-col gap-3">
				{results.map((result) => {
					const card = deck?.cards.find((c) => c.id === result.cardId);
					if (!card) return null;
					const newRank = result.isCorrect
						? Math.min(5, card.rank + 1)
						: Math.max(1, card.rank - 1);

					return (
						<div key={result.cardId} className="rounded-lg border p-3">
							<p>{card.front}</p>
							<p>
								Ta réponse : {result.answer} {result.isCorrect ? "✓" : "✗"}
							</p>
							{!result.isCorrect && <p>Bonne réponse : {card.back}</p>}
							<p>
								{RANK_NAMES[card.rank as Rank]} → {RANK_NAMES[newRank as Rank]}
							</p>
						</div>
					);
				})}
			</div>

			<Button
				className="w-full cursor-pointer"
				onClick={() =>
					navigate({ to: "/child", search: { profile: undefined } })
				}
			>
				Retour
			</Button>
		</div>
	);
}
