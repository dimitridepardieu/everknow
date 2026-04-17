import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 px-6">
			<h1>Flashcard Academy</h1>

			<div className="flex w-full max-w-sm flex-col gap-3">
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/onboarding/account-type" })}
				>
					Continuer avec Apple
				</Button>
				<Button
					variant="outline"
					className="w-full cursor-pointer"
					onClick={() => navigate({ to: "/onboarding/account-type" })}
				>
					Continuer avec Google
				</Button>
			</div>
		</div>
	);
}
