"use client";

import { useSearchParams } from "next/navigation";
import { Chatbot } from "@/app/components/Chatbox";
import { Suspense, useEffect } from "react";

function EmbedContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") || undefined;

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("background-color", "transparent", "important");
      document.documentElement.style.setProperty("background", "transparent", "important");
      document.body.style.setProperty("background-color", "transparent", "important");
      document.body.style.setProperty("background", "transparent", "important");
    }
  }, []);

  return (
    <div className="w-full h-full bg-transparent">
      <style>{`
        html, body {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>
      <Chatbot positionStrategy="fixed" embeddedWorkspaceId={workspaceId} hideSimulateContext={true} isEmbeddedMode={true} />
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
