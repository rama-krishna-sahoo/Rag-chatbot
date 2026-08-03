"use client";

import { useSearchParams } from "next/navigation";
import { Chatbot } from "@/app/components/Chatbox";
import { Suspense } from "react";

function EmbedContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") || undefined;
  
  return (
    <div className="w-full h-full bg-transparent">
      {/* 
        We use positionStrategy="absolute" so the chatbot positions itself 
        relative to the iframe bounds instead of the screen bounds, but 
        "fixed" actually works fine too since the iframe is the window.
      */}
      <Chatbot positionStrategy="fixed" embeddedWorkspaceId={workspaceId} />
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div />}>
      <EmbedContent />
    </Suspense>
  );
}
