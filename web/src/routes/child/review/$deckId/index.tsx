import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parentAccount } from "@/data/mock";

export const Route = createFileRoute("/child/review/$deckId/")({
	component: ReviewSessionPage,
});

function ReviewSessionPage() {
	const { deckId } = Route.useParams();
	const navigate = useNavigate();

	const deck = parentAccount.profiles
		.flatMap((p) => p.decks)
		.find((d) => d.id === deckId);

	const today = new Date().toISOString().split("T")[0];
	const cardsToReview =
		deck?.cards.filter(
			(c) => c.status === "accepted" && c.nextReviewAt <= today,
		) ?? [];

	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [results, setResults] = useState<
		{ cardId: string; answer: string; isCorrect: boolean }[]
	>([]);

	const card = cardsToReview[currentIndex];

	if (!card) {
		navigate({
			to: "/child/review/$deckId/result",
			params: { deckId },
			search: { results: JSON.stringify(results) },
		});
		return null;
	}

	function submit() {
		if (!card || !answer.trim()) return;
		const isCorrect =
			answer.trim().toLowerCase() === card.back.trim().toLowerCase();
		const newResults = [
			...results,
			{ cardId: card.id, answer: answer.trim(), isCorrect },
		];
		setResults(newResults);
		setAnswer("");

		if (currentIndex + 1 >= cardsToReview.length) {
			navigate({
				to: "/child/review/$deckId/result",
				params: { deckId },
				search: { results: JSON.stringify(newResults) },
			});
		} else {
			setCurrentIndex((i) => i + 1);
		}
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>
				Carte {currentIndex + 1} / {cardsToReview.length}
			</p>

			<div className="rounded-lg border p-4">
				<p>{card.front}</p>
			</div>

			<Input
				placeholder="Ta réponse..."
				value={answer}
				onChange={(e) => setAnswer(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && submit()}
			/>

			<Button
				className="w-full cursor-pointer"
				disabled={!answer.trim()}
				onClick={submit}
			>
				Valider
			</Button>
		</div>
	);
}
