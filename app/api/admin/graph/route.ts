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

export async function GET(req: Request) {
  try {
    const { authorized, supabase } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const minSimThreshold = parseFloat(searchParams.get("minSimilarity") || "0.45");

    // Fetch all knowledge chunks
    const { data: chunks, error } = await supabase
      .from("knowledge_base")
      .select("id, document_id, title, category, chunk_id, chunk_text, embedding, keywords, source_url, source_type, created_at, status, metadata")
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

    // 1. Process Nodes
    const nodes = chunks.map(c => {
      // Parse embedding if it was returned as string (though pgvector client returns array)
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

      return {
        id: c.id,
        label: c.title,
        category: c.category || "general",
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
      };
    });

    // 2. Generate Edges based on KNN / Cosine Similarity Threshold
    const edges: any[] = [];
    const nodeDegrees = new Map<string, number>();
    nodes.forEach(n => nodeDegrees.set(n.id, 0));

    let totalSimilaritySum = 0;
    let similarityCount = 0;
    let duplicateEmbeddingsCount = 0;

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
        // Add calculated degree for node sizing
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
        duplicates: Math.floor(duplicateEmbeddingsCount / 2), // pairs counted twice
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
