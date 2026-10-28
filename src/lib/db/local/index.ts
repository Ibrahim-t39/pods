// [U0] LocalRepo = compose(domain modules). Each module owns a slice of the Repo interface (see CONTRACTS.md).
// TypeScript checks the composition: a missing or extra method fails `npm run typecheck`.
import type { Repo } from "@/lib/db/repo";
import { ctx } from "./context";
import { authRepo } from "./auth";
import { onboardingRepo } from "./onboarding";
import { podsRepo } from "./pods";
import { chatRepo } from "./chat";
import { hangoutsRepo } from "./hangouts";
import { profileRepo } from "./profile";
import { safetyRepo } from "./safety";
import { notificationsRepo } from "./notifications";
import { adminRepo } from "./admin";
import { socialRepo } from "./social";

export function createLocalRepo(): Repo {
  return {
    ...authRepo(ctx),
    ...onboardingRepo(ctx),
    ...podsRepo(ctx),
    ...chatRepo(ctx),
    ...hangoutsRepo(ctx),
    ...profileRepo(ctx),
    ...safetyRepo(ctx),
    ...notificationsRepo(ctx),
    ...socialRepo(ctx),
    admin: adminRepo(ctx),
  } satisfies Repo;
}

let singleton: Repo | null = null;
export function localRepo(): Repo {
  singleton ??= createLocalRepo();
  return singleton;
}
