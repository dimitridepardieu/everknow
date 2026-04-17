import {
	createRootRoute,
	Link,
	Outlet,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { Button } from "@/components/ui/button";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const router = useRouter();
	const pathname = router.state.location.pathname;
	const isFullscreen = pathname === "/" || pathname.startsWith("/onboarding");

	if (isFullscreen) {
		return <Outlet />;
	}

	return (
		<div className="flex min-h-svh flex-col">
			<header className="flex items-center gap-2 border-b px-4 py-3">
				<Button
					variant="ghost"
					size="icon-sm"
					className="cursor-pointer"
					onClick={() => router.history.back()}
				>
					<ArrowLeft className="size-4" />
				</Button>
				<Link to="/" className="flex-1">
					Flashcard Academy
				</Link>
				<ProfileSwitcher />
			</header>
			<main className="flex flex-1 flex-col">
				<Outlet />
			</main>
		</div>
	);
}
