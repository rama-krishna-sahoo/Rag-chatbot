import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const query = "baby lotion";
  console.log("Generating embedding for:", query);
  
  const text = query.replace(/\s+/g, " ").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 1536,
    }),
  });

  const data = await response.json();
  const embedding = data?.embedding?.values;

  if (!embedding) {
    console.error("Failed to generate embedding", data);
    return;
  }
  
  console.log("Embedding generated. Length:", embedding.length);

  console.log("Running match_knowledge...");
  const { data: matches, error } = await supabase.rpc("match_knowledge", {
    query_embedding: embedding,
    filter_workspace_id: "6079ce7b-13e2-4458-b9fa-a8a5c1adfc06", // The user's workspace
    match_count: 5,
    filter_category: null,
    filter_status: null
  });

  if (error) {
    console.error("RPC Error:", error);
    return;
  }

  console.log(`Found ${matches?.length || 0} matches.`);
  if (matches && matches.length > 0) {
    console.log("First match:", matches[0].chunk_text, "Similarity:", matches[0].similarity);
  }
}

run();
