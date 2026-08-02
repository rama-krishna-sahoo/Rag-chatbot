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

/**
 * Generates a grounded response using gemini-3.5-flash based on the RAG context.
 */
export async function generateGroundedAnswer(
  context: string, 
  question: string,
  customerProfile?: string | null,
  history?: { role: string, text: string }[]
): Promise<string> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Google API Key is not configured.");
  }

  let systemPrompt = `
You are a friendly, brand-trust building e-commerce assistant for the premium organic baby brand "Oogway".
Your goal is to build parent trust and drive sales through short, precise, and highly focused answers.

STRICT FORMATTING RULES:
1. Keep your response extremely brief: a maximum of 2 to 3 concise sentences, or 2 to 3 short bullet points. Do NOT write long paragraphs.
2. Be direct and precise. Parents want quick, skim-friendly answers.
3. Emphasize trust-building values (e.g., "GOTS-certified organic cotton", "dermatologist tested", "BPA-free", "hypoallergenic").
4. Gently drive sales (e.g., "You can view the detailed specifications or add it to your bag directly below").
5. Only answer questions related to Oogway baby products or basic baby care. If out of scope, politely decline.
`.trim();

  if (customerProfile) {
    systemPrompt += `\n\nCUSTOMER CONTEXT:\n${customerProfile}\n\nSTRICT INSTRUCTION FOR RETURNING CUSTOMERS: Personalize your response naturally using this information if it is relevant. Address the customer by name, mention their past purchases if relevant to their current question, and recommend complementary products.`;
  }

  const userContent = `
Context from our product knowledge base:
${context}

User question: ${question}

STRICT INSTRUCTION: Analyze the user question. Is it related to baby products or parenting? 
If NO: Reply ONLY with a polite message stating you can only assist with Oogway baby products. Do not provide any product recommendations in this case.
If YES: Answer in a helpful way based on the context.
`.trim();

  const contents = [];
  
  // To use system instructions properly without throwing off the Gemini API (which expects alternating user/model roles),
  // we combine the system prompt into the first user message if there's no history.
  // If there is history, we inject the system prompt as the first message.
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

  const url = `${BASE_URL}/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini LLM API error: ${response.statusText}. ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Failed to generate content from Gemini LLM.");
  }

  return text;
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
  filename: string
): Promise<ExtractedFeatures> {
  loadLocalEnv();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Google API Key is not configured.");
  }

  const prompt = `
You are an expert document processing assistant.
Your task is to analyze the attached document file and extract its content, structure it, and generate rich metadata.

Please return a JSON object with the following schema:
{
  "text": "A clean, normalized, non-destructive markdown version of the document. Preserve all sections, headings, tables, lists, safety notes, references, and citations. Do not omit any meaningful information.",
  "title": "A concise, descriptive title for this document (e.g. Oogway Silicone Teether Ring User Manual)",
  "category": "The best matching category from this list: Sleep, Feeding, Diapering, Skincare, Play, Travel, Bath, Teething, general",
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
