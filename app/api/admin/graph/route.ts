// app/api/admin/graph/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

function getCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Derive a distinct semantic concept label for each individual chunk node
function getChunkConceptLabel(docTitle: string, chunkText: string, chunkId: number, keywords: string[]): string {
  if (!chunkText || !chunkText.trim()) return `${docTitle} #${chunkId + 1}`;

  const text = chunkText.trim();
  const cleanTitle = (docTitle || "Document").replace(/^Website:\s*/i, "").trim();

  // 1. Look for explicit Markdown headings inside the chunk
  const headingMatch = text.match(/^(?:#+\s*|\*\*)\s*([^\n\*]+)/m);
  if (headingMatch && headingMatch[1].trim().length > 3) {
    let heading = headingMatch[1].replace(/[\*\#\:]/g, "").trim();
    if (heading.length > 35) {
      heading = heading.substring(0, 32) + "...";
    }
    if (heading.toLowerCase() !== cleanTitle.toLowerCase()) {
      return heading;
    }
  }

  // 2. Look for the first meaningful line / sentence
  const lines = text
    .split("\n")
    .map(l => l.replace(/^[#\*\-\s\d\.\:\•\✓]+/, "").trim())
    .filter(l => l.length > 8);

  for (const line of lines) {
    let cleanLine = line;
    if (cleanTitle && cleanLine.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
      cleanLine = cleanLine.substring(cleanTitle.length).replace(/^[\s\:\-\|\,]+/, "").trim();
    }
    if (cleanLine.length > 35) {
      cleanLine = cleanLine.substring(0, 32) + "...";
    }
    if (cleanLine.length >= 4 && cleanLine.toLowerCase() !== cleanTitle.toLowerCase()) {
      return cleanLine;
    }
  }

  // 3. Look for keywords if present
  if (keywords && keywords.length > 0) {
    const topK = keywords.slice(0, 2).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(", ");
    return `${topK} (${cleanTitle.substring(0, 12)})`;
  }

  // 4. Default fallback with chunk index
  return `${cleanTitle.substring(0, 18)}... #${chunkId + 1}`;
}

export async function GET(req: Request) {
  try {
    const { authorized, workspaceId, supabase } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const minSimThreshold = parseFloat(searchParams.get("minSimilarity") || "0.45");

    // Fetch all knowledge chunks for the active workspace
    const { data: chunks, error } = await supabase
      .from("knowledge_base")
      .select("id, document_id, title, category, chunk_id, chunk_text, embedding, keywords, source_url, source_type, created_at, status, metadata")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        statistics: {
          density: 0,
          avgDegree: 0,
          orphans: 0,
          duplicates: 0,
          averageSimilarity: 0,
          largestCluster: "None",
          smallestCluster: "None"
        }
      });
    }

    // 1. Process and Deduplicate Nodes
    const seenContent = new Set<string>();
    const nodes: any[] = [];
    let duplicateEmbeddingsCount = 0;

    for (const c of chunks) {
      const normalizedContent = (c.chunk_text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Deduplicate exact or near-identical text content chunks
      if (normalizedContent && normalizedContent.length > 30) {
        if (seenContent.has(normalizedContent)) {
          duplicateEmbeddingsCount++;
          continue;
        }
        seenContent.add(normalizedContent);
      }

      // Parse embedding
      let embedding: number[] = [];
      if (c.embedding) {
        if (typeof c.embedding === "string") {
          try {
            embedding = JSON.parse(c.embedding);
          } catch (e) {
            embedding = (c.embedding as string).replace(/[\[\]]/g, "").split(",").map(Number);
          }
        } else if (Array.isArray(c.embedding)) {
          embedding = c.embedding;
        }
      }

      const conceptLabel = getChunkConceptLabel(c.title || "Document", c.chunk_text || "", c.chunk_id || 0, c.keywords || []);

      nodes.push({
        id: c.id,
        label: conceptLabel,
        documentTitle: c.title,
        category: c.category || "General",
        chunkId: c.chunk_id,
        chunkText: c.chunk_text,
        docId: c.document_id,
        date: c.created_at,
        status: c.status,
        keywords: c.keywords || [],
        sourceUrl: c.source_url,
        sourceType: c.source_type,
        embedding,
        metadata: c.metadata || {}
      });
    }

    // 2. Generate Edges based on KNN / Cosine Similarity Threshold
    const edges: any[] = [];
    const nodeDegrees = new Map<string, number>();
    nodes.forEach(n => nodeDegrees.set(n.id, 0));

    let totalSimilaritySum = 0;
    let similarityCount = 0;

    // For each node, find its top similarities and connect
    const KNN_K = 3; // nearest-neighbor connections cap
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];
      if (nodeA.embedding.length === 0) continue;

      const similarities: { index: number; score: number }[] = [];

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const nodeB = nodes[j];
        if (nodeB.embedding.length === 0) continue;

        const score = getCosineSimilarity(nodeA.embedding, nodeB.embedding);
        
        if (score > 0.98) {
          duplicateEmbeddingsCount++;
        }

        if (score >= minSimThreshold) {
          similarities.push({ index: j, score });
          totalSimilaritySum += score;
          similarityCount++;
        }
      }

      // Sort similarities descending and connect top K
      similarities.sort((a, b) => b.score - a.score);
      const topK = similarities.slice(0, KNN_K);

      topK.forEach(sim => {
        const nodeB = nodes[sim.index];
        
        // Prevent duplicate undirected edges in payload
        const edgeExists = edges.some(e => 
          (e.source === nodeA.id && e.target === nodeB.id) || 
          (e.source === nodeB.id && e.target === nodeA.id)
        );

        if (!edgeExists) {
          edges.push({
            id: `edge_${nodeA.id}_${nodeB.id}`,
            source: nodeA.id,
            target: nodeB.id,
            similarity: sim.score
          });

          nodeDegrees.set(nodeA.id, (nodeDegrees.get(nodeA.id) || 0) + 1);
          nodeDegrees.set(nodeB.id, (nodeDegrees.get(nodeB.id) || 0) + 1);
        }
      });
    }

    // 3. Compute Graph Topology Stats
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const orphans = Array.from(nodeDegrees.values()).filter(d => d === 0).length;
    
    // Density = E / (V * (V - 1) / 2)
    const possibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = possibleEdges > 0 ? (edgeCount / possibleEdges) : 0;
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    // Calculate cluster counts
    const clusterSizes = new Map<string, number>();
    nodes.forEach(n => {
      clusterSizes.set(n.category, (clusterSizes.get(n.category) || 0) + 1);
    });

    let largestClusterName = "None";
    let largestClusterSize = -1;
    let smallestClusterName = "None";
    let smallestClusterSize = Infinity;

    clusterSizes.forEach((size, name) => {
      if (size > largestClusterSize) {
        largestClusterSize = size;
        largestClusterName = name;
      }
      if (size < smallestClusterSize) {
        smallestClusterSize = size;
        smallestClusterName = name;
      }
    });

    if (smallestClusterSize === Infinity) smallestClusterSize = 0;

    // Clean up embedding arrays in nodes payload to keep response size optimal
    const nodesPayload = nodes.map(n => {
      const { embedding, ...rest } = n;
      return {
        ...rest,
        degree: nodeDegrees.get(n.id) || 0
      };
    });

    const averageSimilarity = similarityCount > 0 ? (totalSimilaritySum / similarityCount) : 0;

    return NextResponse.json({
      nodes: nodesPayload,
      edges,
      statistics: {
        density: parseFloat(density.toFixed(5)),
        avgDegree: parseFloat(avgDegree.toFixed(2)),
        orphans,
        duplicates: duplicateEmbeddingsCount,
        averageSimilarity: parseFloat(averageSimilarity.toFixed(3)),
        largestCluster: `${largestClusterName} (${largestClusterSize} nodes)`,
        smallestCluster: `${smallestClusterName} (${smallestClusterSize} nodes)`
      }
    });

  } catch (err: any) {
    console.error("Error in GET /api/admin/graph:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
