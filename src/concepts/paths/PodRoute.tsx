"use client";

import { useParams } from "next/navigation";
import { ClearingScreen } from "./Clearing";

export function PodRoute() {
  const { podId } = useParams<{ podId: string }>();
  return <ClearingScreen key={podId} podId={podId} />;
}
