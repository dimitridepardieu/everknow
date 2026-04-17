import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { parentAccount } from "@/data/mock";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const account = parentAccount;

	return (
		<div className="flex flex-1 flex-col gap-6 p-4">
			<p>Paramètres</p>

			<div className="flex flex-col gap-3 rounded-lg border p-3">
				<p>Compte</p>
				<p>{account.email}</p>
				<p>
					Connexion via{" "}
					{account.oauthProvider === "google" ? "Google" : "Apple"}
				</p>
				<p>
					Plan :{" "}
					{account.plan === "free"
						? "Gratuit"
						: account.plan === "monthly"
							? "Mensuel"
							: "Annuel"}
				</p>
				<Link
					to="/paywall"
					className="cursor-pointer underline underline-offset-4"
				>
					Gérer l'abonnement
				</Link>
			</div>

			{account.type === "parent" && (
				<div className="flex flex-col gap-3 rounded-lg border p-3">
					<p>Profils enfants</p>
					{account.profiles.map((profile) => (
						<div key={profile.id} className="flex items-center gap-2">
							<span>{profile.avatar}</span>
							<span>{profile.name}</span>
						</div>
					))}
					<Button variant="outline" className="cursor-pointer">
						+ Ajouter un profil
					</Button>
				</div>
			)}

			<Button
				variant="outline"
				className="w-full cursor-pointer"
				onClick={() => navigate({ to: "/" })}
			>
				Se déconnecter
			</Button>
		</div>
	);
}
