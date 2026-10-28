// /app/profile: Your seat (wireframe Y01). The page file renders it inside Suspense (it reads ?sheet=).
"use client";

import { YourSeat } from "@/components/profile/your-seat";

export function ProfileScreen() {
  return <YourSeat />;
}
