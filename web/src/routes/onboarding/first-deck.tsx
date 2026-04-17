import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding/first-deck")({
	component: FirstDeckPage,
});

function FirstDeckPage() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 px-6">
			<div className="text-center">
				<p>Créez votre premier deck !</p>
				<p>
					Prenez en photo un exercice, collez un texte, ou partagez un lien.
				</p>
			</div>

			<div className="flex w-full max-w-sm flex-col gap-3">
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/decks/new" })}
				>
					📸 Photo
				</Button>
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/decks/new" })}
				>
					📝 Texte
				</Button>
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/decks/new" })}
				>
					🔗 Lien / URL
				</Button>
			</div>

			<Link to="/home" className="cursor-pointer underline underline-offset-4">
				Passer pour l'instant
			</Link>
		</div>
	);
}
