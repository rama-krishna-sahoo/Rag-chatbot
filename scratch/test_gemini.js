// scratch/test_gemini.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local variables first
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    process.env[key.trim()] = values.join('=').trim();
  }
});

async function test() {
  try {
    // Dynamic import to ensure process.env keys are loaded first
    const { generateGroundedAnswer } = await import('../lib/gemini');
    
    console.log("Calling Gemini with short prompt...");
    const answer = await generateGroundedAnswer(
      "Source: Understanding Baby Lotion and Skincare\nContent: Daily use of baby lotion is safe. Always do a patch test first to check for any irritation.",
      "Is baby lotion safe to use daily?"
    );
    console.log("=== GEMINI ANSWER ===");
    console.log(answer);
  } catch (err) {
    console.error("Gemini failed:", err);
  }
}

test();
