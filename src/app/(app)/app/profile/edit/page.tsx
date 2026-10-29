// /app/profile/edit: the edit page (photo, name, interests, communities, free times), saved as you go.
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { ProfileEdit } from "@/components/profile/profile-edit";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ProfileEdit />
    </Suspense>
  );
}
