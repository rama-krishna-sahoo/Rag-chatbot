// lib/rag-fallback.ts

import { products, Product } from "@/data/products";

// Parse age from user query (e.g. "2month", "2 month", "newborn", "6 months", "1 year")
function extractAgeInMonths(query: string): number | null {
  if (/\b(newborn|infant|0 month|0month)\b/i.test(query)) return 0;

  const mMatch = query.match(/(\d+)\s*(?:month|mth|mths|months|mon|mo|m)\b/i);
  if (mMatch) return parseInt(mMatch[1], 10);

  const yMatch = query.match(/(\d+)\s*(?:year|yr|yrs|years)\b/i);
  if (yMatch) return parseInt(yMatch[1], 10) * 12;

  return null;
}

// Parse product age range string (e.g., "0–4 months", "3–24 months", "0+ months")
function parseProductAgeRange(ageRangeStr: string): { min: number; max: number } {
  const str = ageRangeStr.toLowerCase().replace(/[–—]/g, "-");
  if (str.includes("0+")) return { min: 0, max: 999 };

  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1], 10),
      max: parseInt(rangeMatch[2], 10),
    };
  }
  return { min: 0, max: 999 };
}

// Check if a target age (in months) is suitable for a product
function isAgeSuitable(productAgeRange: string, targetAgeMonths: number): boolean {
  const { min, max } = parseProductAgeRange(productAgeRange);
  return targetAgeMonths >= min && targetAgeMonths <= max;
}

export function getLocalProductAnswer(userMessage: string): string {
  const query = userMessage.toLowerCase().trim();
  const targetAgeMonths = extractAgeInMonths(query);

  // Check if user is asking for items Natural Baby does NOT sell (e.g. dress, clothes, shoes)
  const clothingTerms = ["dress", "dresses", "cloth", "clothes", "clothing", "shirt", "pant", "pants", "outfit", "shoe", "shoes", "sock", "socks"];
  const isAskingClothing = clothingTerms.some((term) => query.includes(term));

  // Clean prompt and remove common filler words
  const cleanQuery = query
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(tell|me|about|what|is|are|the|how|do|you|have|can|i|get|for|with|a|an|in|on|to|show|info|details|please|thanks|want|buy|my|baby)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Greeting check
  if (
    query === "hi" ||
    query === "hello" ||
    query === "hey" ||
    query === "hi there" ||
    query === "greetings" ||
    query === "good morning" ||
    query === "good evening"
  ) {
    return "Hi 👶! I'm the Natural Baby assistant. How can I help you today? You can ask me about our organic swaddles, bamboo feeding bottles, hypoallergenic diapers, soothing body lotions, foam play mats, ergonomic carriers, silicone teether rings, crib blankets, or gentle hair & body washes!";
  }

  // Handle clothing/unsupported category queries with age filtering
  if (isAskingClothing) {
    const ageLabel = targetAgeMonths !== null ? `${targetAgeMonths}-month-old` : "baby";
    
    // Filter products suitable for target age
    const suitableProducts = targetAgeMonths !== null
      ? products.filter((p) => isAgeSuitable(p.ageRange, targetAgeMonths))
      : products.slice(0, 5);

    const productListFormatted = suitableProducts
      .map((p) => `• **${p.name}** (${p.category}, Age: ${p.ageRange})\n  ${p.shortDescription}`)
      .join("\n\n");

    return `Note: We don't currently offer baby clothing or dresses. However, here are our top baby-safe essentials suitable for a **${ageLabel}**:

${productListFormatted}

Please ask if you would like more details about any of these items!`;
  }

  // Calculate match scores for all products
  const matches = products.map((product) => {
    let score = 0;
    const name = product.name.toLowerCase();
    const category = product.category.toLowerCase();
    const shortDesc = product.shortDescription.toLowerCase();
    const longDesc = product.longDescription.toLowerCase();
    const materials = product.materials.toLowerCase();
    const safety = product.safetyNotes.toLowerCase();
    const features = product.keyFeatures.map((f) => f.toLowerCase()).join(" ");

    // Age suitability filter scoring: Penalize products not suitable for target age!
    if (targetAgeMonths !== null) {
      if (isAgeSuitable(product.ageRange, targetAgeMonths)) {
        score += 25; // Bonus for age match
      } else {
        score -= 100; // Strong penalty for age mismatch (e.g. carrier 3-24m for 2m baby)
      }
    }

    // Check full query and cleaned query against product text
    const searchTerms = [cleanQuery, ...cleanQuery.split(" ").filter((w) => w.length > 2)];

    for (const term of searchTerms) {
      if (!term) continue;

      if (name.includes(term)) score += 15;
      if (category.includes(term)) score += 10;
      if (shortDesc.includes(term)) score += 8;
      if (features.includes(term)) score += 6;
      if (longDesc.includes(term)) score += 4;
      if (materials.includes(term)) score += 4;
      if (safety.includes(term)) score += 4;
    }

    // Category / topic keywords mapping
    if ((query.includes("diaper") || query.includes("nappy")) && (name.includes("diaper") || category.includes("diaper"))) score += 40;
    if ((query.includes("bottle") || query.includes("feed") || query.includes("milk") || query.includes("colic")) && (name.includes("bottle") || category.includes("feed"))) score += 40;
    if ((query.includes("swaddle") || query.includes("wrap") || query.includes("sleep")) && (name.includes("swaddle") || category.includes("sleep"))) score += 40;
    if ((query.includes("lotion") || query.includes("moistur") || query.includes("cream")) && (name.includes("lotion") || category.includes("skin"))) score += 40;
    if ((query.includes("mat") || query.includes("tummy") || query.includes("crawl")) && (name.includes("mat") || category.includes("play"))) score += 40;
    if ((query.includes("carrier") || query.includes("travel") || query.includes("hold")) && (name.includes("carrier") || category.includes("travel"))) score += 40;
    if ((query.includes("teeth") || query.includes("chew") || query.includes("gum")) && (name.includes("teether") || category.includes("teeth"))) score += 40;
    if ((query.includes("wash") || query.includes("bath") || query.includes("soap") || query.includes("shampoo")) && (name.includes("wash") || category.includes("bath"))) score += 40;

    return { product, score };
  });

  matches.sort((a, b) => b.score - a.score);
  const bestMatch = matches[0];

  if (bestMatch && bestMatch.score > 0) {
    const p = bestMatch.product;
    return `**${p.name}** (${p.category})

${p.longDescription}

• **Age Suitability:** ${p.ageRange}
• **Materials:** ${p.materials}
• **Key Features:**
${p.keyFeatures.map((f) => `  - ${f}`).join("\n")}
• **Safety Notes:** ${p.safetyNotes}`;
  }

  // If specific age was requested but no product matched specific keywords, list all products suitable for that age
  if (targetAgeMonths !== null) {
    const ageSuitableList = products.filter((p) => isAgeSuitable(p.ageRange, targetAgeMonths));
    const listFormatted = ageSuitableList
      .map((p) => `• **${p.name}** (${p.category}, Age: ${p.ageRange})\n  ${p.shortDescription}`)
      .join("\n\n");

    return `Here are our Natural Baby products suitable for a **${targetAgeMonths}-month-old** baby:

${listFormatted}

Please ask about any specific item for detailed ingredients and features!`;
  }

  // Fallback for general questions
  return `I can help you with questions about Natural Baby products! Here is our current product lineup:

• 🌙 **Sleep:** Natural Baby Organic Swaddle Wrap, Convertible Crib Blanket
• 🍼 **Feeding:** Natural Baby Bamboo Feeding Bottle (Anti-colic)
• 👶 **Diapering:** Natural Baby Hypoallergenic Diapers
• 🧴 **Skincare & Bath:** Natural Baby Soothing Body Lotion, Gentle Hair & Body Wash
• 🧸 **Play & Teething:** Natural Baby Foam Play Mat, Silicone Teether Ring
• 🎒 **Travel:** Natural Baby Ergonomic Carrier

Please ask about any specific product, ingredients, age suitability, or safety recommendations!`;
}
