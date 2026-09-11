// app/api/admin/categories/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { inferCategoryFromUrlOrTitle } from "@/lib/website-processor";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/([ -/&])/)
    .map(word => {
      if (!word || word.match(/^[ -/&]$/)) return word;
      if (['and', '&', 'of', 'for', 'in', 'to'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

export async function GET(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryWebsite = searchParams.get("website") || "";

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, website_url, industry")
      .eq("id", workspaceId)
      .maybeSingle();

    const websiteUrl = queryWebsite || workspace?.website_url || "";
    const companyName = workspace?.name || "";
    const industry = workspace?.industry || "";

    // 2. Query all existing knowledge base chunks for this workspace
    const { data: chunks = [] } = await supabase
      .from("knowledge_base")
      .select("id, category, title, source_url")
      .eq("workspace_id", workspaceId);

    const categoriesSet = new Set<string>();
    const chunksToUpdate: { id: string; newCategory: string }[] = [];

    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
        let cat = (chunk.category || "").trim();

        // If category is generic or empty, try inferring from source_url and title
        if (!cat || cat.toLowerCase() === "general") {
          const inferred = inferCategoryFromUrlOrTitle(chunk.source_url || "", chunk.title || "");
          if (inferred) {
            cat = inferred;
            chunksToUpdate.push({ id: chunk.id, newCategory: inferred });
          }
        }

        if (cat && cat.toLowerCase() !== "general") {
          categoriesSet.add(toTitleCase(cat));
        }
      }

      // Batch update any chunks that were auto-upgraded from "general"
      if (chunksToUpdate.length > 0) {
        for (const update of chunksToUpdate) {
          await supabase
            .from("knowledge_base")
            .update({ category: update.newCategory })
            .eq("id", update.id)
            .eq("workspace_id", workspaceId);
        }
      }
    }

    // 3. Inspect uploaded documents (crawled website pages) to extract additional URL categories
    const { data: docs = [] } = await supabase
      .from("uploaded_documents")
      .select("filename, storage_path")
      .eq("workspace_id", workspaceId);

    if (docs && docs.length > 0) {
      for (const doc of docs) {
        const inferred = inferCategoryFromUrlOrTitle(doc.storage_path || "", doc.filename || "");
        if (inferred) {
          categoriesSet.add(toTitleCase(inferred));
        }
      }
    }

    // 4. If categories are empty or very sparse, and a website is connected, auto-generate categories for this website
    if (categoriesSet.size === 0 && websiteUrl) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
        if (apiKey) {
          const prompt = `You are an expert e-commerce and website catalog assistant.
Given the following website details:
- Website URL: ${websiteUrl}
- Brand / Company Name: ${companyName}
- Industry: ${industry || "General E-commerce"}

Generate 4 to 6 concise, capitalized 1-2 word customer-facing categories suitable for this website's chatbot playground (e.g., product lines, services, support topics, shipping & returns).
Return ONLY a valid JSON array of strings, for example: ["Category 1", "Category 2", "Category 3"].
Do NOT include markdown backticks or explanations.`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.2
                }
              })
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const generated = JSON.parse(text.trim());
              if (Array.isArray(generated)) {
                generated.forEach((c: string) => {
                  if (typeof c === "string" && c.trim()) {
                    categoriesSet.add(toTitleCase(c.trim()));
                  }
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Auto-generating website categories via Gemini failed:", e);
      }
    }

    // 5. Fallback ONLY for the demo Oogway baby brand if no custom categories found
    const isOogwayBaby = websiteUrl.includes("oogwaybaby.com") || companyName.toLowerCase().includes("oogway");
    if (categoriesSet.size === 0 && isOogwayBaby) {
      ["Sleep", "Feeding", "Diapering", "Skincare", "Play", "Travel", "Bath", "Teething"].forEach(c => categoriesSet.add(c));
    }

    const sortedCategories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      categories: sortedCategories,
      website: websiteUrl,
      companyName
    });
  } catch (err: any) {
    console.error("Error in /api/admin/categories:", err);
    return NextResponse.json({ error: err.message || "Failed to load categories" }, { status: 500 });
  }
}
