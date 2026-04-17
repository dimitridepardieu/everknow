import { useNavigate, useRouterState } from "@tanstack/react-router";
import { parentAccount } from "@/data/mock";

export function ProfileSwitcher() {
	const navigate = useNavigate();
	const { location } = useRouterState();
	const activeProfile = (location.search as { profile?: string }).profile;

	const account = parentAccount;
	if (account.type !== "parent") return null;

	const isParentActive = !activeProfile;

	return (
		<div className="flex gap-1">
			<button
				type="button"
				className={`cursor-pointer rounded-lg px-2 py-1 ${isParentActive ? "ring-ring ring-2" : ""}`}
				onClick={() => navigate({ to: "/home" })}
			>
				👩
			</button>
			{account.profiles.map((profile) => (
				<button
					key={profile.id}
					type="button"
					className={`cursor-pointer rounded-lg px-2 py-1 ${activeProfile === profile.id ? "ring-ring ring-2" : ""}`}
					onClick={() =>
						navigate({
							to: "/child",
							search: { profile: profile.id },
						})
					}
				>
					{profile.avatar}
				</button>
			))}
		</div>
	);
}
