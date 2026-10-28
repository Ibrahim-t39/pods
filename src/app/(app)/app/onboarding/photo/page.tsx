// /app/onboarding/photo: the photo left first run (optional, later, in Your seat; H #9). Old links land on /app,
// which sends the person to their next step.
import { Hop } from "@/components/onboarding/hop";

export default function Page() {
  return <Hop to="/app" />;
}
