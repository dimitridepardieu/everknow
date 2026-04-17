import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { parentAccount } from "@/data/mock";

export const Route = createFileRoute("/paywall")({
	component: PaywallPage,
});

function PaywallPage() {
	const navigate = useNavigate();
	const account = parentAccount;

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
			<div className="text-center">
				<p>Vous avez utilisé {account.cardsGenerated} / 30 cartes gratuites</p>
				<p>Passez à un plan payant pour continuer à générer des cartes.</p>
			</div>

			<div className="flex w-full max-w-sm flex-col gap-3">
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/home" })}
				>
					Mensuel — prix à définir
				</Button>
				<Button
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/home" })}
				>
					Annuel — prix à définir
				</Button>
			</div>
		</div>
	);
}
