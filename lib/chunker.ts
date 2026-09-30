// lib/chunker.ts

/**
 * GAP 6 FIX: FAQ-aware chunker.
 * Splits text into chunks by Q&A pairs. Each Q+A pair becomes its own chunk,
 * preserving the full semantic unit so retrieval never splits a question from its answer.
 *
 * Recognised patterns:
 *   Q: ... A: ...
 *   Question: ... Answer: ...
 *   **Q.** ... **A.** ...
 *   1. Q: ... A: ...
 */
export function chunkFaq(text: string): string[] {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const qaPattern =
    /^(Q:|Question:|Q\s*\d+[\.\):]|\d+[\.\)]\s*(Q:|Question:)|\*\*Q[\.\)]?\*\*)/i;
  const ansPattern = /^(A:|Answer:|\*\*A[\.\)]?\*\*)/i;

  const chunks: string[] = [];
  let currentQ = "";
  let currentA = "";
  let inAnswer = false;

  const flushPair = () => {
    if (currentQ.trim()) {
      const combined = [currentQ.trim(), currentA.trim()]
        .filter(Boolean)
        .join("\n");
      if (combined.length > 5) chunks.push(combined);
    }
    currentQ = "";
    currentA = "";
    inAnswer = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (qaPattern.test(trimmed)) {
      // Start of a new question — flush any previous pair
      flushPair();
      currentQ = trimmed;
      inAnswer = false;
    } else if (ansPattern.test(trimmed)) {
      inAnswer = true;
      currentA = trimmed;
    } else if (inAnswer) {
      currentA += "\n" + trimmed;
    } else if (currentQ) {
      // Continuation of question text before the answer marker
      currentQ += "\n" + trimmed;
    }
  }

  flushPair();

  // If no Q/A pairs found, fall back to standard markdown chunker
  if (chunks.length === 0) {
    return chunkMarkdown(text);
  }

  return chunks;
}

/**
 * Splits a markdown document into semantic chunks by headers and paragraphs.
 * 
 * @param text The full document text in markdown format.
 * @param maxWords Maximum word count per chunk.
 * @param overlapWords Number of words to overlap between sequential chunks.
 */
export function chunkMarkdown(text: string, maxWords: number = 800, overlapWords: number = 120): string[] {
  if (!text) return [];

  // Split by markdown headers (# Header, ## Header, ### Header)
  // Positive lookahead ensures the headers are kept as part of the split sections.
  const sections = text.split(/\n(?=(?:#+\s+))/);
  const chunks: string[] = [];

  for (let section of sections) {
    section = section.trim();
    if (!section) continue;

    const words = section.split(/\s+/);
    if (words.length <= maxWords) {
      chunks.push(section);
    } else {
      // If the section exceeds maxWords, split it by paragraphs
      const paragraphs = section.split(/\n\s*\n/);
      let currentChunk: string[] = [];
      let currentSize = 0;

      for (const para of paragraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;

        const paraWords = trimmedPara.split(/\s+/).length;
        
        // If adding this paragraph exceeds the chunk size limit
        if (currentSize + paraWords > maxWords) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.join("\n\n"));
            
            // Build overlap from the end of the current chunk
            const overlapChunk: string[] = [];
            let overlapSize = 0;
            for (let i = currentChunk.length - 1; i >= 0; i--) {
              const len = currentChunk[i].split(/\s+/).length;
              if (overlapSize + len <= overlapWords) {
                overlapChunk.unshift(currentChunk[i]);
                overlapSize += len;
              } else {
                break;
              }
            }
            currentChunk = overlapChunk;
            currentSize = overlapSize;
          }
        }
        
        currentChunk.push(trimmedPara);
        currentSize += paraWords;
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n\n"));
      }
    }
  }

  return chunks;
}
