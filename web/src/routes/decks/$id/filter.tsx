import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parentAccount } from "@/data/mock";
import type { CardStatus } from "@/types";

export const Route = createFileRoute("/decks/$id/filter")({
	component: FilterCardsPage,
});

interface CardDecision {
	status: CardStatus | "improved";
	editedFront?: string;
	editedBack?: string;
}

function FilterCardsPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const deck = parentAccount.profiles
		.flatMap((p) => p.decks)
		.find((d) => d.id === id);
	const cards = deck?.cards ?? [];

	const [currentIndex, setCurrentIndex] = useState(0);
	const [decisions, setDecisions] = useState<Map<string, CardDecision>>(
		new Map(),
	);
	const [editing, setEditing] = useState(false);
	const [editFront, setEditFront] = useState("");
	const [editBack, setEditBack] = useState("");

	const card = cards[currentIndex];
	const isFinished = currentIndex >= cards.length;

	function decide(status: CardDecision["status"]) {
		if (!card) return;
		const next = new Map(decisions);
		next.set(card.id, {
			status,
			editedFront: editing ? editFront : undefined,
			editedBack: editing ? editBack : undefined,
		});
		setDecisions(next);
		setEditing(false);
		setCurrentIndex((i) => i + 1);
	}

	function startEdit() {
		if (!card) return;
		setEditFront(card.front);
		setEditBack(card.back);
		setEditing(true);
	}

	if (isFinished) {
		const accepted = [...decisions.values()].filter(
			(d) => d.status === "accepted",
		).length;
		const rejected = [...decisions.values()].filter(
			(d) => d.status === "rejected",
		).length;
		const improved = [...decisions.values()].filter(
			(d) => d.status === "improved",
		).length;
		const edited = [...decisions.values()].filter(
			(d) => d.editedFront || d.editedBack,
		).length;

		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<p>Filtrage terminé</p>
				<p>✓ {accepted} acceptées</p>
				<p>✗ {rejected} rejetées</p>
				<p>✨ {improved} améliorées</p>
				{edited > 0 && <p>✎ {edited} modifiées</p>}
				<Button
					className="cursor-pointer"
					onClick={() => navigate({ to: "/home" })}
				>
					Terminer
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>
				Carte {currentIndex + 1} / {cards.length}
			</p>

			{editing ? (
				<div className="flex flex-col gap-3 rounded-lg border p-4">
					<Input
						value={editFront}
						onChange={(e) => setEditFront(e.target.value)}
					/>
					<Input
						value={editBack}
						onChange={(e) => setEditBack(e.target.value)}
					/>
					<Button className="cursor-pointer" onClick={() => decide("accepted")}>
						Valider la modification
					</Button>
					<Button
						variant="outline"
						className="cursor-pointer"
						onClick={() => setEditing(false)}
					>
						Annuler
					</Button>
				</div>
			) : (
				<div className="flex flex-col gap-3 rounded-lg border p-4">
					<p>{card.front}</p>
					<hr />
					<p>{card.back}</p>
				</div>
			)}

			{!editing && (
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1 cursor-pointer"
						onClick={() => decide("accepted")}
					>
						✓
					</Button>
					<Button
						variant="outline"
						className="flex-1 cursor-pointer"
						onClick={startEdit}
					>
						✎
					</Button>
					<Button
						variant="outline"
						className="flex-1 cursor-pointer"
						onClick={() => decide("rejected")}
					>
						✗
					</Button>
					<Button
						variant="outline"
						className="flex-1 cursor-pointer"
						onClick={() => decide("improved")}
					>
						✨
					</Button>
				</div>
			)}
		</div>
	);
}
