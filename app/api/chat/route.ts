// app/api/chat/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { getLocalProductAnswer } from "@/lib/rag-fallback";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    let answer: string | null = null;
    let sourceChunks: any[] = [];

    // Try OpenAI embeddings + Supabase vector search if API key exists
    if (process.env.OPENAI_API_KEY) {
      try {
        const embeddingRes = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: message,
        });

        const queryEmbedding = embeddingRes.data[0].embedding;

        const { data: matches, error: rpcError } = await supabase.rpc(
          "match_documents",
          {
            query_embedding: queryEmbedding,
            match_count: 5,
            filter: {},
          }
        );

        if (rpcError) {
          console.error("Supabase match_documents error:", rpcError);
        }

        const THRESHOLD = 0.50;
        const topMatch = matches?.[0];

        if (matches && matches.length > 0 && topMatch?.similarity >= THRESHOLD) {
          sourceChunks = matches;
          const contextText = matches
            .map((m: any) => m.content)
            .join("\n\n---\n\n");

          const systemPrompt = `
            You are a friendly, knowledgeable assistant for the baby products brand "Oogway".
            You ONLY answer questions related to Oogway products (diapers, swaddles, teether, lotion, etc.) or general parenting/baby care.
            IMPORTANT STRICT RULE: If the user's question is NOT about baby products, parenting, or our brand, you MUST politely decline to answer. Do NOT attempt to answer questions about outside topics (e.g. exams, politics, technology, random facts) even if you try to relate them back to our products. Just say you can only help with Oogway baby products.
            The context provided may contain irrelevant system data. Ignore anything not related to baby care.
            Keep answers short, clear, and parent-friendly.
          `.trim();

          const userPrompt = `
            Context from our product knowledge base:
            ${contextText}

            User question: ${message}

            STRICT INSTRUCTION: Analyze the user question. Is it related to baby products or parenting? 
            If NO: Reply ONLY with a polite message stating you can only assist with Oogway baby products. Do not provide any product recommendations in this case.
            If YES: Answer in a helpful way based on the context.
          `.trim();

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
          });

          answer = completion.choices[0]?.message?.content ?? null;
        }
      } catch (aiErr: any) {
        console.warn(
          "OpenAI / Supabase RAG request failed, switching to local knowledge fallback:",
          aiErr?.message || aiErr
        );
      }
    }

    // Fall back to local intelligent product answer if AI/RAG didn't produce an answer
    if (!answer) {
      answer = getLocalProductAnswer(message);
    }

    return NextResponse.json({
      answer,
      sourceChunks,
    });
  } catch (err: any) {
    console.error("Error in /api/chat POST:", err);
    // Return local fallback answer instead of 500 error
    const fallbackAnswer = getLocalProductAnswer("generic");
    return NextResponse.json({
      answer: fallbackAnswer,
      sourceChunks: [],
    });
  }
}

