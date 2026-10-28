// /app/search (core area). PLATFORM_SPEC §F.
import { Suspense } from "react";
import { Search } from "@/components/pods/search";

export default function Page() {
  return (
    <Suspense>
      <Search />
    </Suspense>
  );
}
