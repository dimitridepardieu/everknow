import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/onboarding/create-profile")({
	component: CreateProfilePage,
});

const AVATARS = ["🦊", "🦋", "🐸", "🦁", "🐼", "🦄", "🐶", "🐱", "🐰", "🐻"];

function CreateProfilePage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [avatar, setAvatar] = useState("🦊");

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 px-6">
			<p>Créez le profil de votre enfant</p>

			<div className="flex w-full max-w-sm flex-col gap-6">
				<Input
					placeholder="Prénom"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<div className="flex flex-wrap justify-center gap-2">
					{AVATARS.map((emoji) => (
						<button
							key={emoji}
							type="button"
							className={`cursor-pointer rounded-xl p-2 text-2xl ${avatar === emoji ? "ring-ring ring-2" : ""}`}
							onClick={() => setAvatar(emoji)}
						>
							{emoji}
						</button>
					))}
				</div>

				<Button
					className="w-full cursor-pointer"
					disabled={!name.trim()}
					onClick={() => navigate({ to: "/onboarding/first-deck" })}
				>
					Continuer
				</Button>
			</div>
		</div>
	);
}
