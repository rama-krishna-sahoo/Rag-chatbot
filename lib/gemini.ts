import fs from "fs";
import path from "path";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Dynamically read keys from .env.local if dev server wasn't restarted
function loadLocalEnv() {
  if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) return;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const [key, ...values] = line.split("=");
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join("=").trim();
        }
      });
    }
  } catch (err) {
    console.warn("Failed to load .env.local dynamically in gemini wrapper:", err);
  }
}

/**
 * Generates a 1536-dimension vector embedding for the given text using gemini-embedding-2.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Google API Key is not configured.");
  }

  // Normalize text by removing excessive newlines and spaces
  const normalizedText = text.replace(/\s+/g, " ").trim();

  const url = `${BASE_URL}/gemini-embedding-2:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text: normalizedText }],
      },
      outputDimensionality: 1536,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini Embedding API error: ${response.statusText}. ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("Failed to retrieve embedding vector from Gemini response.");
  }

  return values;
}

export function analyzeMessageEscalation(message: string): {
  shouldEscalate: boolean;
  priority: "urgent" | "high" | "normal";
  subject: string;
  sentiment: string;
} {
  const text = message.toLowerCase().trim();

  const urgentKeywords = ["refund", "double charged", "charged twice", "wrong bill", "stolen", "fraud", "hacked", "unauthorized", "legal", "scam", "money back", "billing error"];
  const highKeywords = ["damaged", "broken", "missing order", "never arrived", "not received", "cancel order", "defective", "worst", "terrible", "furious", "angry", "speak to human", "manager", "support ticket", "help me"];

  const isUrgent = urgentKeywords.some(kw => text.includes(kw));
  const isHigh = highKeywords.some(kw => text.includes(kw));

  if (isUrgent) {
    return {
      shouldEscalate: true,
      priority: "urgent",
      subject: "Urgent Financial / Refund Inquiry",
      sentiment: "frustrated",
    };
  }

  if (isHigh) {
    return {
      shouldEscalate: true,
      priority: "high",
      subject: "High Priority Customer Service Escalation",
      sentiment: "disappointed",
    };
  }

  return {
    shouldEscalate: false,
    priority: "normal",
    subject: "General Customer Support Inquiry",
    sentiment: "neutral",
  };
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

function getGroundedLocalFallback(
  context: string,
  question: string,
  customerProfile: string | null | undefined,
  workspaceName: string,
  isFollowUp: boolean = false
): string {
  let nameGreeting = "";
  if (!isFollowUp && customerProfile) {
    const match = customerProfile.match(/Customer Name:\s*([^\,.\n]+)/i);
    if (match && match[1]) {
      nameGreeting = `Hi ${match[1].trim().split(" ")[0]}! `;
    }
  }

  const prefix = isFollowUp ? "" : (nameGreeting || "Hello! ");

  if (context && context.trim() && !context.includes("No specific document context found")) {
    const cleanContext = context.replace(/Document Title:/g, "📌").replace(/Category:/g, "Tag:");
    return `${prefix}${isFollowUp ? "" : `Welcome to ${workspaceName}. `}Here is the exact detail from our official Knowledge Base:\n\n${cleanContext.slice(0, 450)}`;
  }

  return `${prefix}${isFollowUp ? "" : `Welcome to ${workspaceName} 🐢. `}How can I assist you today with our products, policies, or services?`;
}

async function fetchGeminiWithFailover(apiKey: string, contents: any[]): Promise<Response> {
  let lastError: Error | null = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      };
      if (model === "gemini-3.5-flash") {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return res;
      }
      const errJson = await res.json().catch(() => ({}));
      console.warn(`Gemini model ${model} returned HTTP ${res.status}:`, errJson?.error?.message || res.statusText);
      lastError = new Error(`Gemini model ${model} error: ${res.statusText}`);
    } catch (err: any) {
      console.warn(`Fetch error for Gemini model ${model}:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini LLM models failed or hit rate limits.");
}

async function fetchGeminiStreamWithFailover(apiKey: string, contents: any[]): Promise<Response> {
  let lastError: Error | null = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `${BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const payload: any = {
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      };
      if (model === "gemini-3.5-flash") {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.body) {
        return res;
      }
      const errJson = await res.json().catch(() => ({}));
      console.warn(`Gemini stream model ${model} returned HTTP ${res.status}:`, errJson?.error?.message || res.statusText);
      lastError = new Error(`Gemini stream model ${model} error: ${res.statusText}`);
    } catch (err: any) {
      console.warn(`Fetch error for Gemini stream model ${model}:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini LLM stream models failed or hit rate limits.");
}

/**
 * Generates a grounded response using multi-model failover based on the RAG context.
 */
export async function generateGroundedAnswer(
  context: string, 
  question: string,
  customerProfile?: string | null,
  history?: { role: string, text: string }[],
  workspaceName: string = "Oogway",
  workspaceIndustry: string = "products and services"
): Promise<string> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  const isFollowUp = !!(history && history.length > 0);
  
  if (!apiKey) {
    return getGroundedLocalFallback(context, question, customerProfile, workspaceName, isFollowUp);
  }

  let systemPrompt = `
You are an executive, ultra-concise AI assistant representing ${workspaceName} (${workspaceIndustry}).

STRICT LENGTH & RESPONSE RULES:
1. ULTRA-CONCISE & FAST TO READ: Keep your response under 35 words (1 to 2 crisp, direct sentences maximum). The customer MUST be able to read and understand your complete answer in under 3 seconds!
2. NO VERBOSE INTROS OR FLUFF: Do NOT output repetitive intros, meta-text, or broken markdown. Get straight to the point immediately.
3. GROUNDED IN KNOWLEDGE BASE: Use the Knowledge Base Context below as your absolute primary source of truth. State exact facts, product details, ingredients, or policies directly from it.
4. WARM & DIRECT: Be warm, professional, employee-like, and highly responsive.
`.trim();

  if (isFollowUp) {
    if (customerProfile) {
      systemPrompt += `\n\nCUSTOMER CONTEXT:\n${customerProfile}\n\nSTRICT INSTRUCTION: This is an ongoing conversation. Do NOT output any opening greeting like "Hi Sarah!" or "Hello!". Answer the question directly without any opening greeting line.`;
    } else {
      systemPrompt += `\n\nSTRICT INSTRUCTION: This is an ongoing conversation. Do NOT output any opening greeting like "Hello!". Answer the question directly without any opening greeting line.`;
    }
  } else {
    if (customerProfile) {
      systemPrompt += `\n\nCUSTOMER CONTEXT (LOGGED-IN USER):\n${customerProfile}\n\nSTRICT INSTRUCTION: Greet the customer by their first name ONCE in 3 words or less (e.g., "Hi Sarah!"), then give the answer.`;
    }
  }

  const userContent = `
=== OFFICIAL KNOWLEDGE BASE CONTEXT FOR ${workspaceName.toUpperCase()} ===
${context ? context : "No specific document context found for this exact query."}
====================================================

User question: ${question}

STRICT INSTRUCTIONS: 
1. If the Knowledge Base Context contains details related to the user's question, answer IMMEDIATELY with the exact details in 1 to 2 short, crisp sentences.
2. Keep the response clean, ultra-short, and effortless to read in under 3 seconds.
`.trim();

  const contents = [];
  if (history && history.length > 0) {
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    history.forEach(msg => {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    });
    contents.push({ role: "user", parts: [{ text: userContent }] });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
    });
  }

  try {
    const response = await fetchGeminiWithFailover(apiKey, contents);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
  } catch (err) {
    console.warn("All Gemini API models failed in generateGroundedAnswer. Using local knowledge fallback:", err);
  }

  return getGroundedLocalFallback(context, question, customerProfile, workspaceName, isFollowUp);
}

/**
 * Streams a grounded response from Gemini Flash via Server-Sent Events (SSE).
 * Enables sub-150ms Time-to-First-Token (TTFT) perceived latency.
 */
export async function generateGroundedAnswerStream(
  context: string,
  question: string,
  customerProfile?: string | null,
  history?: { role: string; text: string }[],
  workspaceName: string = "Oogway",
  workspaceIndustry: string = "products and services"
): Promise<ReadableStream<Uint8Array>> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  const encoder = new TextEncoder();
  const isFollowUp = !!(history && history.length > 0);

  if (!apiKey) {
    const fallbackText = getGroundedLocalFallback(context, question, customerProfile, workspaceName, isFollowUp);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackText })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });
  }

  let systemPrompt = `
You are an executive, ultra-concise AI assistant representing ${workspaceName} (${workspaceIndustry}).

STRICT LENGTH & RESPONSE RULES:
1. ULTRA-CONCISE & FAST TO READ: Keep your response under 35 words (1 to 2 crisp, direct sentences maximum). The customer MUST be able to read and understand your complete answer in under 3 seconds!
2. NO VERBOSE INTROS OR FLUFF: Do NOT output repetitive intros, meta-text, or broken markdown. Get straight to the point immediately.
3. GROUNDED IN KNOWLEDGE BASE: Use the Knowledge Base Context below as your absolute primary source of truth. State exact facts, product details, ingredients, or policies directly from it.
4. WARM & DIRECT: Be warm, professional, employee-like, and highly responsive.
`.trim();

  if (isFollowUp) {
    if (customerProfile) {
      systemPrompt += `\n\nCUSTOMER CONTEXT:\n${customerProfile}\n\nSTRICT INSTRUCTION: This is an ongoing conversation. Do NOT output any opening greeting like "Hi Sarah!" or "Hello!". Answer the question directly without any opening greeting line.`;
    } else {
      systemPrompt += `\n\nSTRICT INSTRUCTION: This is an ongoing conversation. Do NOT output any opening greeting like "Hello!". Answer the question directly without any opening greeting line.`;
    }
  } else {
    if (customerProfile) {
      systemPrompt += `\n\nCUSTOMER CONTEXT (LOGGED-IN USER):\n${customerProfile}\n\nSTRICT INSTRUCTION: Greet the customer by their first name ONCE in 3 words or less (e.g., "Hi Sarah!"), then give the answer.`;
    }
  }

  const userContent = `
=== OFFICIAL KNOWLEDGE BASE CONTEXT FOR ${workspaceName.toUpperCase()} ===
${context ? context : "No specific document context found for this exact query."}
====================================================

User question: ${question}

STRICT INSTRUCTIONS: 
1. If the Knowledge Base Context contains details related to the user's question, answer IMMEDIATELY with the exact details in 1 to 2 short, crisp sentences.
2. Keep the response clean, ultra-short, and effortless to read in under 3 seconds.
`.trim();

  const contents = [];
  if (history && history.length > 0) {
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    history.forEach(msg => {
      contents.push({ role: msg.role, parts: [{ text: msg.text }] });
    });
    contents.push({ role: "user", parts: [{ text: userContent }] });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
    });
  }

  let response: Response;
  try {
    response = await fetchGeminiStreamWithFailover(apiKey, contents);
  } catch (streamErr) {
    console.warn("All Gemini stream models failed. Using grounded local fallback:", streamErr);
    const fallbackText = getGroundedLocalFallback(context, question, customerProfile, workspaceName, isFollowUp);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackText })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const candidateText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidateText) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: candidateText })}\n\n`));
                }
              } catch (e) {}
            }
          }
        }

        if (buffer.trim().startsWith("data: ")) {
          const jsonStr = buffer.trim().slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const candidateText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: candidateText })}\n\n`));
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error reading Gemini stream:", err);
      } finally {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    }
  });
}

export type ExtractedFeatures = {
  text: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  safetyInformation: string;
  attributes: Record<string, string>;
};

/**
 * Sends file content (either as inline data or text) to Gemini to parse, clean, and extract features/metadata.
 */
export async function extractDocumentFeatures(
  fileData: { base64?: string; text?: string; mimeType: string },
  filename: string,
  contextHint?: string
): Promise<ExtractedFeatures> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Google API Key is not configured.");
  }

  const prompt = `
You are an expert document processing assistant.
Your task is to analyze the attached document file and extract its content, structure it, and generate rich metadata.
${contextHint ? `Context / Website hint: ${contextHint}` : ""}

Please return a JSON object with the following schema:
{
  "text": "A clean, normalized, non-destructive markdown version of the document. Preserve all sections, headings, tables, lists, safety notes, references, and citations. Do not omit any meaningful information.",
  "title": "A concise, descriptive title for this document",
  "category": "A concise, capitalized 1 to 3 word business or content category for this document based on the website and content (e.g., 'Shipping & Returns', 'Apparel', 'Skincare', 'Footwear', 'Customer Support', 'Pricing', 'Policies', 'Documentation', etc.). Do not return generic placeholders like 'general' unless no specific category applies.",
  "description": "A 1-2 sentence description summarizing what this document is about.",
  "keywords": ["an", "array", "of", "relevant", "keywords", "or", "tags"],
  "safetyInformation": "Summarize any safety guidelines or safety warnings mentioned in the document. If none, write 'No specific safety notes.'",
  "attributes": {
     "Any specific attributes or specifications found (e.g., 'Material': '100% Organic Cotton', 'Age Range': '0-4 months', etc.) as key-value pairs."
  }
}

STRICT RULE: You must return ONLY the raw JSON object. Do not wrap it in markdown code blocks like \`\`\`json. The response must be a valid JSON parseable string.
`.trim();

  const parts: any[] = [];

  if (fileData.base64) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.base64,
      },
    });
  } else if (fileData.text) {
    parts.push({
      text: `Document Content:\n\n${fileData.text}`,
    });
  }

  parts.push({ text: prompt });

  const url = `${BASE_URL}/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini Feature Extraction API error: ${response.statusText}. ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    throw new Error("Failed to retrieve feature extraction response from Gemini.");
  }

  try {
    const features: ExtractedFeatures = JSON.parse(jsonText.trim());
    return features;
  } catch (err) {
    console.error("JSON parsing error on Gemini output:", jsonText);
    throw new Error(`Failed to parse Gemini feature extraction output as JSON: ${(err as Error).message}`);
  }
}
