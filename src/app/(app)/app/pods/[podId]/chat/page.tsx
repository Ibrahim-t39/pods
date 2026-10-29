// /app/pods/[id]/chat. Laptop (≥1024): the chat is its own page (chat-room.tsx), thread in the centre and the pod
// beside it. Phone: the full-screen thread opens over the pod's table (the table renders in ../layout.tsx and opens
// its Talk sheet for this path; pod-table.tsx sheetForPath).
"use client";

import { useParams } from "next/navigation";
import { ChatRoom } from "@/components/pods/chat-room";

export default function Page() {
  const { podId } = useParams<{ podId: string }>();
  return <ChatRoom podId={podId} />;
}
