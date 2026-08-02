// lib/chunker.ts

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
