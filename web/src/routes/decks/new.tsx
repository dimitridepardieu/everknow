import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SourceType } from "@/types";

export const Route = createFileRoute("/decks/new")({
	component: NewDeckPage,
});

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
	{ value: "text", label: "📝 Texte" },
	{ value: "image", label: "📸 Photo" },
	{ value: "pdf", label: "📄 PDF" },
	{ value: "url", label: "🔗 URL" },
];

function NewDeckPage() {
	const navigate = useNavigate();
	const [sourceType, setSourceType] = useState<SourceType>("text");
	const [cardCount, setCardCount] = useState(10);

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>Nouveau deck</p>

			<div className="flex flex-wrap gap-2">
				{SOURCE_TYPES.map((st) => (
					<button
						key={st.value}
						type="button"
						className={`cursor-pointer rounded-lg px-3 py-2 ${sourceType === st.value ? "ring-ring ring-2" : "border"}`}
						onClick={() => setSourceType(st.value)}
					>
						{st.label}
					</button>
				))}
			</div>

			{sourceType === "text" && (
				<Textarea placeholder="Collez ou tapez le contenu ici..." rows={6} />
			)}
			{sourceType === "image" && (
				<div className="flex items-center justify-center rounded-lg border border-dashed p-8">
					📸 Appuyez pour prendre une photo ou choisir un fichier
				</div>
			)}
			{sourceType === "pdf" && (
				<div className="flex items-center justify-center rounded-lg border border-dashed p-8">
					📄 Appuyez pour choisir un PDF
				</div>
			)}
			{sourceType === "url" && <Input placeholder="https://..." />}

			<div>
				<p>Nombre de cartes</p>
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						className="cursor-pointer"
						disabled={cardCount <= 5}
						onClick={() => setCardCount((c) => c - 5)}
					>
						−
					</Button>
					<span>{cardCount}</span>
					<Button
						variant="outline"
						className="cursor-pointer"
						disabled={cardCount >= 30}
						onClick={() => setCardCount((c) => c + 5)}
					>
						+
					</Button>
				</div>
			</div>

			<Button
				className="w-full cursor-pointer"
				onClick={() =>
					navigate({ to: "/decks/$id/filter", params: { id: "deck-1" } })
				}
			>
				Générer
			</Button>
		</div>
	);
}
