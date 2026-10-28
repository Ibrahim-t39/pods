"use client";
import { useParams } from "next/navigation";
import { Grounds } from "./Grounds";

export function PodPage() {
  const { podId } = useParams<{ podId: string }>();
  return <Grounds podId={podId} />;
}
