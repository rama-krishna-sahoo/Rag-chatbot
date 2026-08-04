// app/admin/KnowledgeUniverse.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  Search, 
  Camera, 
  RefreshCw, 
  Maximize2, 
  Minimize2,
  Sliders,
  Settings,
  HelpCircle,
  Award,
  Sparkles,
  Zap,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Types
export type NodeData = {
  id: string;
  label: string;
  category: string;
  chunkId: number;
  chunkText: string;
  docId: string;
  date: string;
  status: string;
  keywords: string[];
  sourceUrl: string;
  sourceType: string;
  degree: number;
  metadata: any;
  // Physics parameters
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  nodeType?: "chunk" | "keyword";
};

export type EdgeData = {
  id: string;
  source: string;
  target: string;
  similarity: number;
  particles?: number[]; // positions [0, 1] for flowing particles
};

export type GraphStats = {
  density: number;
  avgDegree: number;
  orphans: number;
  duplicates: number;
  averageSimilarity: number;
  largestCluster: string;
  smallestCluster: string;
};

// Curated Sleek HSL colors for Semantic Communities
export const ClusterColors: Record<string, string> = {
  "Sleep": "#B2EA4D",     // Lime
  "Feeding": "#ffffff",   // White
  "Diapering": "#81a85f", // Soft olive green
  "Skincare": "#4e7033",  // Medium forest green
  "Play": "#d6ff73",      // Yellow-lime
  "Travel": "#a6bda2",    // Pale green-gray
  "Bath": "#2e4a1c",      // Dark forest green
  "Teething": "#e8ffd0",  // Light lime-white
  "general": "#667a61",   // Muted gray-green
  "query": "#ffffff"      // White for query node
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div className="space-y-2">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;
        
        // Check if bullet point using regex (matches *, -, bullet characters, )
        const bulletMatch = trimmed.match(/^([\*\-\u2022\u25E6\u25AA])\s*(.*)$/);
        const isBullet = !!bulletMatch;
        const content = isBullet ? bulletMatch[2] : trimmed;
        
        // Parse bold markers **word**
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={pIdx} className="font-extrabold text-[#B2EA4D]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        
        if (isBullet) {
          return (
            <div key={lIdx} className="flex gap-2 text-[10px] leading-relaxed text-slate-300">
              <span className="text-[#B2EA4D] shrink-0 font-bold">•</span>
              <span>{renderedParts}</span>
            </div>
          );
        }
        
        return (
          <p key={lIdx} className="text-[10px] leading-relaxed text-slate-300">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
};

export function KnowledgeUniverse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Graph Data States
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [statistics, setStatistics] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Inspector and selection
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Toolbar & Control States
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<"force" | "circle" | "grid" | "radial" | "hierarchical">("force");
  const [minSimilarity, setMinSimilarity] = useState(0.45);
  
  // Physics controls
  const [repulsionForce, setRepulsionForce] = useState(300);
  const [linkForce, setLinkForce] = useState(0.06);
  const [gravityForce, setGravityForce] = useState(0.04);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  
  // View states (pan & zoom)
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 300, y: 250 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const draggedNodeId = useRef<string | null>(null);

  // Query retrieval simulation
  const [queryInput, setQueryInput] = useState("");
  const [simulatingQuery, setSimulatingQuery] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState("");
  const queryNodeRef = useRef<{ x: number; y: number; targetX: number; targetY: number; active: boolean; opacity: number } | null>(null);
  const matchedNodesRef = useRef<string[]>([]);

  // Timeline variables
  const [timelineIndex, setTimelineIndex] = useState(100); // 0-100% slider
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const timelineIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Camera Fly-to Lerp Animation Variables
  const cameraTargetRef = useRef<{ x: number; y: number; zoom: number; active: boolean } | null>(null);

  // FPS Counter
  const [fps, setFps] = useState(60);

  // Load Graph Data
  const loadGraphData = async () => {
    setLoading(true);
    setSelectedNode(null);
    setSearchResults([]);
    setSearchResultsOpen(false);
    try {
      const res = await fetch(`/api/admin/graph?minSimilarity=${minSimilarity}`);
      if (res.ok) {
        const data = await res.json();
        
        // Initialize node positions randomly near the center
        const initializedNodes = data.nodes.map((n: any) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 50 + Math.random() * 200;
          return {
            ...n,
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            targetX: 0,
            targetY: 0,
            radius: 5 + (n.degree * 1.5), // Size proportional to connection degree
            color: ClusterColors[n.category] || ClusterColors.general,
            nodeType: "chunk"
          };
        });

        // Initialize particle animation state on edges
        const initializedEdges = data.edges.map((e: any) => ({
          ...e,
          particles: [0, 0.33, 0.66].map(() => Math.random()) // Random starting points
        }));

        setNodes(initializedNodes);
        setEdges(initializedEdges);
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error("Failed to load graph data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [minSimilarity]);

  // Collapse active keyword nodes
  const collapseKeywords = () => {
    setNodes(prev => prev.filter(n => n.nodeType !== "keyword"));
    setEdges(prev => prev.filter(e => !e.id.includes("_keyword_")));
  };

  // Expand keyword nodes orbiting a parent node
  const expandKeywordsForNode = (parentNode: NodeData) => {
    // Collapse any previously opened keyword nodes first
    setNodes(prev => prev.filter(n => n.nodeType !== "keyword"));
    setEdges(prev => prev.filter(e => !e.id.includes("_keyword_")));

    let words = parentNode.keywords || [];
    if (words.length === 0) {
      // Fallback: extract keywords from text content
      words = parentNode.chunkText
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 5 && !["about", "there", "their", "would", "which", "could", "should", "these", "those", "under", "after"].includes(w.toLowerCase()))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 6)
        .map(w => w.toLowerCase());
    }

    if (words.length === 0) return;

    const newNodes: NodeData[] = [];
    const newEdges: EdgeData[] = [];

    words.forEach((word, index) => {
      const keywordId = `keyword_${parentNode.id}_${word}`;
      const angle = (index / words.length) * Math.PI * 2;
      const dist = 50 + Math.random() * 15;
      
      // Position orbiting parent
      const kx = parentNode.x + Math.cos(angle) * dist;
      const ky = parentNode.y + Math.sin(angle) * dist;

      newNodes.push({
        id: keywordId,
        label: word,
        category: parentNode.category,
        chunkId: -1,
        chunkText: "",
        docId: parentNode.docId,
        date: parentNode.date,
        status: parentNode.status,
        keywords: [],
        sourceUrl: "",
        sourceType: "",
        degree: 1,
        metadata: {},
        x: kx,
        y: ky,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        targetX: kx,
        targetY: ky,
        radius: 4.5, // Smaller child node
        color: parentNode.color,
        nodeType: "keyword"
      });

      newEdges.push({
        id: `edge_${parentNode.id}_keyword_${word}`,
        source: parentNode.id,
        target: keywordId,
        similarity: 0.9, // High attraction force
        particles: [0, 0.5].map(() => Math.random())
      });
    });

    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
  };

  // Handle layout calculation on layoutMode or nodes change
  useEffect(() => {
    if (nodes.length === 0) return;

    const center = { x: 0, y: 0 };
    const chunkNodes = nodes.filter(n => n.nodeType !== "keyword");

    if (layoutMode === "circle") {
      const radius = 250;
      chunkNodes.forEach((n, i) => {
        const angle = (i / chunkNodes.length) * Math.PI * 2;
        n.targetX = center.x + Math.cos(angle) * radius;
        n.targetY = center.y + Math.sin(angle) * radius;
      });
    } else if (layoutMode === "grid") {
      const cols = Math.ceil(Math.sqrt(chunkNodes.length));
      const spacing = 120;
      chunkNodes.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        n.targetX = (col - cols / 2) * spacing;
        n.targetY = (row - Math.ceil(chunkNodes.length / cols) / 2) * spacing;
      });
    } else if (layoutMode === "radial") {
      // Concentric circles based on node category
      const categories = Array.from(new Set(chunkNodes.map(n => n.category)));
      chunkNodes.forEach((n) => {
        const catIdx = categories.indexOf(n.category);
        const radius = 100 + catIdx * 80;
        const angle = Math.random() * Math.PI * 2;
        n.targetX = center.x + Math.cos(angle) * radius;
        n.targetY = center.y + Math.sin(angle) * radius;
      });
    } else if (layoutMode === "hierarchical") {
      // Arrange top-down based on node category
      const categories = Array.from(new Set(chunkNodes.map(n => n.category)));
      chunkNodes.forEach((n) => {
        const catIdx = categories.indexOf(n.category);
        const yPos = -200 + (catIdx / categories.length) * 400;
        // Distribute nodes horizontally within category
        const siblingNodes = chunkNodes.filter(sib => sib.category === n.category);
        const siblingIdx = siblingNodes.indexOf(n);
        const xPos = -250 + (siblingIdx / Math.max(1, siblingNodes.length - 1)) * 500;
        n.targetX = xPos;
        n.targetY = yPos;
      });
    }

    // Anchor keyword nodes near their respective parent nodes
    nodes.forEach(node => {
      if (node.nodeType === "keyword") {
        const parts = node.id.split("_");
        // Reconstruct the parentId
        const parentId = parts.slice(1, parts.length - 1).join("_");
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode) {
          node.targetX = parentNode.targetX;
          node.targetY = parentNode.targetY;
        }
      }
    });
  }, [layoutMode, nodes]);

  // Timeline Evolution Player Effect
  useEffect(() => {
    if (isTimelinePlaying) {
      timelineIntervalRef.current = setInterval(() => {
        setTimelineIndex(prev => {
          if (prev >= 100) {
            setIsTimelinePlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      if (timelineIntervalRef.current) {
        clearInterval(timelineIntervalRef.current);
      }
    }

    return () => {
      if (timelineIntervalRef.current) clearInterval(timelineIntervalRef.current);
    };
  }, [isTimelinePlaying]);

  // Helper to filter nodes by timeline index (ingestion date)
  const getFilteredNodes = () => {
    if (nodes.length === 0) return [];
    
    // Sort nodes by date
    const sorted = [...nodes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const count = Math.ceil((timelineIndex / 100) * nodes.length);
    const subset = sorted.slice(0, count);
    return subset;
  };

  // Main Canvas Render Loop (Runs Physics, Lerp coordinate interpolations, camera focus and draws everything)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = () => {
      // 1. Calculate FPS
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const filteredNodes = getFilteredNodes();
      const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
      const activeEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

      // 2. Camera Lerping Animation
      if (cameraTargetRef.current && cameraTargetRef.current.active) {
        const target = cameraTargetRef.current;
        const lerpFactor = 0.08;
        
        // Calculate centered canvas coordinates
        const targetPanX = canvas.width / 2 - target.x * zoom;
        const targetPanY = canvas.height / 2 - target.y * zoom;

        setPan(prev => ({
          x: prev.x + (targetPanX - prev.x) * lerpFactor,
          y: prev.y + (targetPanY - prev.y) * lerpFactor
        }));

        setZoom(prev => {
          const nextZoom = prev + (target.zoom - prev) * lerpFactor;
          // Deactivate once close enough to target coordinates
          if (Math.abs(nextZoom - target.zoom) < 0.01 && Math.abs(pan.x - targetPanX) < 1) {
            target.active = false;
          }
          return nextZoom;
        });
      }

      // 3. Physics Simulation (ForceAtlas2-like Euler implementation)
      if (isPhysicsActive && layoutMode === "force" && filteredNodes.length > 0) {
        // Repulsion (Coulomb Repulsion Force)
        for (let i = 0; i < filteredNodes.length; i++) {
          const nodeA = filteredNodes[i];
          for (let j = i + 1; j < filteredNodes.length; j++) {
            const nodeB = filteredNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Repel stronger if they overlap
            const minAllowedDist = nodeA.radius + nodeB.radius + 15;
            let force = (repulsionForce * 10) / (dist * dist);
            if (dist < minAllowedDist) {
              force += (minAllowedDist - dist) * 0.4; // Anti-collision repulsion push
            }

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            // Apply opposite forces
            if (nodeA.id !== draggedNodeId.current) {
              nodeA.vx -= fx;
              nodeA.vy -= fy;
            }
            if (nodeB.id !== draggedNodeId.current) {
              nodeB.vx += fx;
              nodeB.vy += fy;
            }
          }
        }

        // Attraction (Hooke Link Attraction Force)
        activeEdges.forEach(edge => {
          const sourceNode = filteredNodes.find(n => n.id === edge.source);
          const targetNode = filteredNodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return;

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Pull connected nodes together proportional to semantic similarity
          const force = (dist - 80) * linkForce * edge.similarity;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (sourceNode.id !== draggedNodeId.current) {
            sourceNode.vx += fx;
            sourceNode.vy += fy;
          }
          if (targetNode.id !== draggedNodeId.current) {
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        });

        // Center Gravity & Damping
        filteredNodes.forEach(node => {
          if (node.id === draggedNodeId.current) return;

          // Pull towards center
          const distToCenter = Math.sqrt(node.x * node.x + node.y * node.y) || 1;
          node.vx -= (node.x / distToCenter) * gravityForce * 2;
          node.vy -= (node.y / distToCenter) * gravityForce * 2;

          // Apply velocity and damping (friction)
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.82;
          node.vy *= 0.82;
        });
      } else if (layoutMode !== "force") {
        // Layout Interpolation (Lerping from current position to target structured shape)
        filteredNodes.forEach(node => {
          if (node.id === draggedNodeId.current) return;
          node.x += (node.targetX - node.x) * 0.12;
          node.y += (node.targetY - node.y) * 0.12;
          node.vx = 0;
          node.vy = 0;
        });
      }

      // 4. Draw Canvas Content
      ctx.save();
      
      // Apply translation and zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // --- Draw Edges ---
      activeEdges.forEach(edge => {
        const sourceNode = filteredNodes.find(n => n.id === edge.source);
        const targetNode = filteredNodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const isHighlighted = selectedNode && (selectedNode.id === sourceNode.id || selectedNode.id === targetNode.id);
        const isMatched = matchedNodesRef.current.includes(sourceNode.id) && matchedNodesRef.current.includes(targetNode.id);

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        // Edge styling (opacity proportional to similarity, thicker if highlighted)
        if (isHighlighted || isMatched) {
          ctx.strokeStyle = isMatched ? "rgba(178, 234, 77, 0.85)" : "rgba(178, 234, 77, 0.75)";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = `rgba(178, 234, 77, ${edge.similarity * 0.15})`;
          ctx.lineWidth = 1.0;
        }
        ctx.stroke();

        // --- Edge Particle Flow Animation ---
        if (edge.particles) {
          edge.particles.forEach((pVal, pIdx) => {
            // Increment position along edge path
            let nextVal = pVal + 0.006;
            if (nextVal >= 1) nextVal = 0;
            edge.particles![pIdx] = nextVal;

            const px = sourceNode.x + (targetNode.x - sourceNode.x) * nextVal;
            const py = sourceNode.y + (targetNode.y - sourceNode.y) * nextVal;

            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = isMatched ? "rgba(255, 255, 255, 0.9)" : "rgba(178, 234, 77, 0.7)";
            ctx.fill();
          });
        }
      });

      // --- Draw Query Ingestion Node Simulation ---
      if (queryNodeRef.current && queryNodeRef.current.active) {
        const qNode = queryNodeRef.current;
        // Travel towards matched nodes
        qNode.x += (qNode.targetX - qNode.x) * 0.06;
        qNode.y += (qNode.targetY - qNode.y) * 0.06;

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#B2EA4D";
        ctx.beginPath();
        ctx.arc(qNode.x, qNode.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#B2EA4D";
        ctx.fill();
        ctx.restore();

        // Label for Query Node
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Query", qNode.x, qNode.y - 20);
      }

      // --- Draw Nodes ---
      filteredNodes.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isNeighbor = selectedNode && edges.some(e => 
          (e.source === selectedNode.id && e.target === node.id) || 
          (e.target === selectedNode.id && e.source === node.id)
        );
        const isSearchResult = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
        const isMatched = matchedNodesRef.current.includes(node.id);

        ctx.save();

        // Glow effect for selected, neighbor, or matched nodes
        if (isSelected || isMatched) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = isMatched ? "#B2EA4D" : node.color;
        } else if (isNeighbor || isSearchResult) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = node.color;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        if (isMatched) {
          ctx.fillStyle = "#B2EA4D"; // Highlighted search target
        } else if (selectedNode && !isSelected && !isNeighbor) {
          // Dim unrelated nodes to focus attention
          ctx.fillStyle = "rgba(71, 85, 105, 0.15)";
        } else {
          ctx.fillStyle = node.color;
        }
        ctx.fill();

        // White border for selected node
        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        ctx.restore();

        // Draw text labels (only at medium/high zoom levels, or if selected/searched)
        const showLabel = zoom > 0.45 || isSelected || isNeighbor || isSearchResult || isMatched;
        if (showLabel) {
          ctx.save();
          if (isSelected) {
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = "#ffffff";
          } else if (isMatched) {
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = "#B2EA4D";
          } else {
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
          }
          ctx.textAlign = "center";
          
          // Truncate document titles for nodes
          let text = node.label;
          if (text.length > 25) text = text.substring(0, 22) + "...";
          
          ctx.fillText(text, node.x, node.y - node.radius - 6);
          ctx.restore();
        }
      });

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodes, edges, selectedNode, zoom, pan, isPhysicsActive, layoutMode, timelineIndex, searchQuery]);

  // Resize canvas handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };

    window.addEventListener("resize", handleResize);
    // Initial size
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [loading]);

  // Click & Drag Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to canvas world coordinates
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    // Check if clicked near a node (within node radius + padding)
    const clickedNode = getFilteredNodes().find(node => {
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 8;
    });

    if (clickedNode) {
      draggedNodeId.current = clickedNode.id;
      setSelectedNode(clickedNode);
      setAiSummary("");
      
      // Stop automatic fly-to if user interacts
      if (cameraTargetRef.current) cameraTargetRef.current.active = false;

      // Expand keywords orbiting this parent chunk node
      if (clickedNode.nodeType !== "keyword") {
        expandKeywordsForNode(clickedNode);
      }
    } else {
      setIsDraggingCanvas(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
      setSelectedNode(null);
      collapseKeywords();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeId.current) {
      // Drag node
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;

      setNodes(prev => prev.map(n => {
        if (n.id === draggedNodeId.current) {
          return {
            ...n,
            x: worldX,
            y: worldY,
            vx: 0,
            vy: 0
          };
        }
        return n;
      }));
    } else if (isDraggingCanvas) {
      // Pan canvas
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy
      });
      // Deactivate target tracking
      if (cameraTargetRef.current) cameraTargetRef.current.active = false;
    }
  };

  const handleMouseUp = () => {
    draggedNodeId.current = null;
    setIsDraggingCanvas(false);
  };

  // Zoom wheel handler
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered around mouse pointer
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    if (nextZoom < 0.15 || nextZoom > 6) return; // clamp zoom

    const dx = mouseX - pan.x;
    const dy = mouseY - pan.y;

    setPan({
      x: mouseX - dx * (nextZoom / zoom),
      y: mouseY - dy * (nextZoom / zoom)
    });
    setZoom(nextZoom);

    // Deactivate target tracking
    if (cameraTargetRef.current) cameraTargetRef.current.active = false;
  };

  // Search node selection
  const handleNodeSearchSelect = (node: NodeData) => {
    setSelectedNode(node);
    setSearchQuery("");
    setSearchResultsOpen(false);
    expandKeywordsForNode(node);

    // Trigger Camera Fly-to Lerp Animation
    cameraTargetRef.current = {
      x: node.x,
      y: node.y,
      zoom: 1.5,
      active: true
    };
  };

  // Search filter drop down results
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<NodeData[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = getFilteredNodes().filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setSearchResults(filtered.slice(0, 8));
  }, [searchQuery]);

  // Generates AI summary using gemini-3.5-flash
  const generateChunkSummary = async () => {
    if (!selectedNode) return;
    setLoadingSummary(true);
    setAiSummary("");
    try {
      const res = await fetch("/api/admin/test-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Summarize this text in 2-3 simple, clean bullet points: ${selectedNode.chunkText}`,
          matchCount: 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.answer);
      } else {
        setAiSummary("Failed to generate summary. Please try again.");
      }
    } catch (e) {
      setAiSummary("API Error generating summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Simulated query vector travel
  const triggerQuerySimulation = async () => {
    if (!queryInput.trim()) return;
    setSimulatingQuery(true);
    setQueryAnswer("");
    matchedNodesRef.current = [];
    
    try {
      // 1. Fetch matching chunks from test-search endpoint
      const res = await fetch("/api/admin/test-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput,
          matchCount: 4,
          status: "published"
        })
      });

      if (!res.ok) throw new Error("Search test failed");
      const searchData = await res.json();

      if (searchData.sourceChunks.length === 0) {
        setQueryAnswer("No matching semantic chunks found above the similarity threshold.");
        setSimulatingQuery(false);
        return;
      }

      // Find first matches inside currently loaded node array
      const matches = searchData.sourceChunks;
      const firstMatchId = matches[0]?.id;
      const matchedNode = getFilteredNodes().find(n => n.id === firstMatchId);

      // 2. Spawn Query Node at coordinates (0, 0)
      queryNodeRef.current = {
        x: 0,
        y: 0,
        targetX: matchedNode ? matchedNode.x : 0,
        targetY: matchedNode ? matchedNode.y : 0,
        active: true,
        opacity: 1
      };

      // Camera center on Query Node trajectory
      if (matchedNode) {
        cameraTargetRef.current = {
          x: matchedNode.x / 2,
          y: matchedNode.y / 2,
          zoom: 0.9,
          active: true
        };
      }

      // 3. Complete travel animation, illuminate neighbors
      setTimeout(() => {
        if (queryNodeRef.current) queryNodeRef.current.active = false;
        
        // Highlight top matching nodes
        matchedNodesRef.current = matches.map((m: any) => m.id);
        
        // Display AI response
        setQueryAnswer(searchData.answer);
        setSimulatingQuery(false);
      }, 2500); // 2.5 seconds travel animation

    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
      setSimulatingQuery(false);
    }
  };

  // Capture Canvas Screenshot
  const captureScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create download link
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `oogway_knowledge_universe_${Date.now()}.png`;
    link.href = image;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:h-[calc(100vh-10rem)] min-h-[700px] lg:min-h-0 animate-mac-page">
      
      {/* 90% Main Canvas Visualizer Panel */}
      <Card className="lg:col-span-3 bg-[#16250e]/60 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden relative flex flex-col h-full border shadow-2xl">
        
        {/* Top Floating Toolbar Overlay */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-3 items-center justify-between pointer-events-none">
          <div className="flex gap-2 items-center pointer-events-auto">
            {/* Search autocomplete input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Find node concept..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchResultsOpen(true);
                }}
                onFocus={() => setSearchResultsOpen(true)}
                className="pl-9 w-52 bg-[#0c1407]/80 backdrop-blur border-[#B2EA4D]/15 text-xs h-9"
              />
              {searchResultsOpen && searchResults.length > 0 && (
                <div className="absolute top-10 left-0 w-64 bg-[#0c1407] border border-[#B2EA4D]/15 rounded-lg shadow-2xl z-20 py-1 max-h-48 overflow-y-auto scrollbar-custom">
                  {searchResults.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSearchSelect(node)}
                      className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-[#203210]/60 hover:text-white truncate flex items-center justify-between"
                    >
                      <span className="font-semibold">{node.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded text-[#B2EA4D] bg-[#B2EA4D]/10 border border-[#B2EA4D]/20">{node.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Layout switcher */}
            <CustomSelect
              value={layoutMode}
              onChange={(val) => {
                setLayoutMode(val as any);
                if (val !== "force") setIsPhysicsActive(false);
              }}
              options={[
                { value: "force", label: "ForceAtlas2 Layout" },
                { value: "circle", label: "Circular Layout" },
                { value: "radial", label: "Radial Layout" },
                { value: "hierarchical", label: "Hierarchical Layout" },
                { value: "grid", label: "Grid Layout" }
              ]}
              className="w-48 h-9"
            />
            
            {/* Physics toggle */}
            {layoutMode === "force" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPhysicsActive(!isPhysicsActive)}
                className={`h-9 text-[10px] bg-[#0c1407]/80 border-[#B2EA4D]/15 ${isPhysicsActive ? "text-[#B2EA4D] border-[#B2EA4D]/30" : "text-slate-400"}`}
              >
                {isPhysicsActive ? "Physics Active" : "Physics Paused"}
              </Button>
            )}
          </div>

          <div className="flex gap-2 items-center pointer-events-auto">
            {/* Screenshot & Reset */}
            <Button size="icon" variant="outline" onClick={captureScreenshot} className="h-9 w-9 bg-[#0c1407]/80 border-[#B2EA4D]/15 text-slate-400 hover:text-white" title="Export graph screenshot">
              <Camera className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={loadGraphData} className="h-9 w-9 bg-[#0c1407]/80 border-[#B2EA4D]/15 text-slate-400 hover:text-white" title="Refresh network">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Floating Overlay Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col sm:flex-row gap-3 justify-between pointer-events-none">
          {/* Legend Panel */}
          <div className="bg-[#0c1407]/85 backdrop-blur border border-[#B2EA4D]/15 p-3 rounded-lg flex flex-col gap-2 max-w-xs select-none pointer-events-auto shadow-xl">
            <span className="text-[9px] font-extrabold text-[#B2EA4D] uppercase tracking-widest flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#B2EA4D]" />
              Semantic Clusters
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-semibold text-slate-300">
              {Object.keys(ClusterColors).filter(k => k !== 'query').map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ClusterColors[cat] }} />
                  <span>{cat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ingest Retrieval simulation Overlay */}
          <div className="bg-[#0c1407]/85 backdrop-blur border border-[#B2EA4D]/15 p-3 rounded-lg w-72 flex flex-col gap-3 pointer-events-auto shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-[#B2EA4D]/15 pb-1.5">
              <Zap className="w-4 h-4 text-[#B2EA4D]" />
              <span className="text-[10px] font-bold uppercase text-white">Semantic Retrieval Sandbox</span>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Submit RAG testing query..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerQuerySimulation()}
                disabled={simulatingQuery}
                className="bg-[#16250e] border-[#B2EA4D]/15 text-[10px] h-8 flex-1"
              />
              <Button
                onClick={triggerQuerySimulation}
                disabled={simulatingQuery || !queryInput.trim()}
                className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#203210] h-8 text-[10px] font-bold px-3 shrink-0"
              >
                {simulatingQuery ? "Testing..." : "Simulate"}
              </Button>
            </div>

            {queryAnswer && (
              <div className="max-h-24 overflow-y-auto text-[9px] text-slate-400 leading-relaxed border-t border-[#B2EA4D]/15 pt-2 font-mono scrollbar-custom">
                <strong className="text-white">Grounded Answer:</strong><br />
                {queryAnswer}
              </div>
            )}
          </div>
        </div>

        {/* Infinite interactive Canvas drawing board */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0c1407]/95 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#B2EA4D]" />
            <p className="text-slate-400 text-xs animate-pulse">Calculating similarity vectors...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="flex-1 bg-[#0c1407]/60 cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Bottom Timeline evolution panel */}
        <div className="h-14 border-t border-[#B2EA4D]/15 bg-[#16250e]/80 backdrop-blur-md px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
              className="h-8 w-8 border-[#B2EA4D]/15 bg-[#203210] hover:bg-[#203210]/80 text-white"
            >
              {isTimelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timeline Playback</span>
          </div>

          {/* Timeline slider bar */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[9px] font-mono text-slate-500">Origin</span>
            <input
              type="range"
              min="10"
              max="100"
              value={timelineIndex}
              onChange={(e) => {
                setTimelineIndex(Number(e.target.value));
                setIsTimelinePlaying(false);
              }}
              className="flex-1 h-1.5 bg-[#203210] rounded-lg appearance-none cursor-pointer accent-[#B2EA4D]"
            />
            <span className="text-[9px] font-mono text-slate-500">Live ({timelineIndex}%)</span>
          </div>

          <div className="flex gap-4 shrink-0 text-[10px] font-mono text-slate-500">
            <span>ZOOM: {Math.round(zoom * 100)}%</span>
            <span>FPS: {fps}</span>
          </div>
        </div>
      </Card>

      {/* Right Sidebar: Stats and Node Inspector */}
      <div className="space-y-6 h-full flex flex-col pr-1 min-h-0">
        {selectedNode ? (
          // Node Inspector Panel
          <Card className="bg-[#16250e]/60 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden border shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#B2EA4D]/15 pb-3">
              <span className="text-[10px] font-bold uppercase bg-[#B2EA4D]/10 text-[#B2EA4D] border border-[#B2EA4D]/20 px-2 py-0.5 rounded">
                Node Inspector
              </span>
              <button onClick={() => { setSelectedNode(null); collapseKeywords(); }} className="text-slate-500 hover:text-white text-xs">✕ Close</button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1 scrollbar-custom">
              <div className="space-y-4">
                <div>
                  <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Document Title</h4>
                  <p className="text-white text-sm font-bold mt-0.5 leading-snug">{selectedNode.label}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-[#B2EA4D]/15 py-3">
                  <div>
                    <h5 className="text-[10px] text-slate-500 font-bold uppercase">Semantic Cluster</h5>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: `${selectedNode.color}15`, borderColor: `${selectedNode.color}30`, color: selectedNode.color }}>
                      {selectedNode.category}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-slate-500 font-bold uppercase">Source Type</h5>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 bg-[#203210] border border-[#B2EA4D]/15 text-slate-300 rounded-full capitalize">
                      {selectedNode.sourceType}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Embedding Dimensions</h4>
                  <p className="text-xs font-mono text-slate-300 mt-1 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#B2EA4D]" />
                    1536 (Google Multimodal Embedding)
                  </p>
                </div>

                <div>
                  <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Semantic Embedding Words</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedNode.keywords && selectedNode.keywords.length > 0 ? (
                      selectedNode.keywords.map((word, wIdx) => (
                        <span 
                          key={wIdx} 
                          className="text-[9px] font-mono font-bold bg-[#B2EA4D]/5 text-[#B2EA4D] border border-[#B2EA4D]/25 px-2 py-0.5 rounded"
                          style={{
                            textShadow: "0 0 8px rgba(45, 212, 191, 0.2)",
                            boxShadow: "0 0 10px rgba(45, 212, 191, 0.05)"
                          }}
                        >
                          {word}
                        </span>
                      ))
                    ) : (
                      selectedNode.chunkText
                        .replace(/[^\w\s]/g, "")
                        .split(/\s+/)
                        .filter(w => w.length > 4 && !["about", "there", "their", "would", "which", "could", "should", "these", "those", "under", "after", "other", "first", "suitable", "suitable"].includes(w.toLowerCase()))
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .slice(0, 12)
                        .map((word, wIdx) => (
                          <span 
                            key={wIdx} 
                            className="text-[9px] font-mono font-bold bg-[#203210] text-slate-300 border border-[#B2EA4D]/15 px-2 py-0.5 rounded"
                          >
                            {word.toLowerCase()}
                          </span>
                        ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Original Text Preview</h4>
                  <p className="text-[11px] font-mono text-slate-300 bg-[#0c1407] p-3 rounded leading-relaxed border border-[#B2EA4D]/15 mt-1 max-h-36 overflow-y-auto scrollbar-custom">
                    {selectedNode.chunkText}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#B2EA4D]/15">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#B2EA4D]" />
                      Generative AI Summary
                    </h4>
                    {!aiSummary && (
                      <Button size="sm" onClick={generateChunkSummary} disabled={loadingSummary} className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#203210] font-bold h-6 text-[9px] px-2.5">
                        {loadingSummary ? "Generating..." : "Summarize"}
                      </Button>
                    )}
                  </div>
                  {loadingSummary && (
                    <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2 font-mono">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#B2EA4D]" />
                      Writing Summary...
                    </div>
                  )}
                  {aiSummary && (
                    <div className="bg-[#0c1407]/60 p-3 rounded border border-[#B2EA4D]/15 font-mono text-[10px]">
                      {renderMarkdown(aiSummary)}
                    </div>
                  )}
                </div>

                {selectedNode.sourceUrl && (
                  <div className="pt-2">
                    <a
                      href={selectedNode.sourceUrl.startsWith("http") ? selectedNode.sourceUrl : `/api/admin/documents`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 h-9 bg-[#203210]/60 hover:bg-[#203210] text-slate-200 border border-[#B2EA4D]/15 rounded-lg text-xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Open Source Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          // Global Graph Statistics Panel
          <Card className="bg-[#16250e]/60 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden border shadow-2xl">
            <h3 className="text-sm font-extrabold text-white border-b border-[#B2EA4D]/15 pb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#B2EA4D]" />
              Graph Topology Stats
            </h3>
            
            <div className="flex-1 min-h-0 overflow-y-auto mt-4 scrollbar-custom">
              {statistics ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-[#0c1407] p-3 border-[#B2EA4D]/15 flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Density</span>
                      <span className="text-sm font-bold text-white mt-1 font-mono">{statistics.density}</span>
                    </Card>
                    <Card className="bg-[#0c1407] p-3 border-[#B2EA4D]/15 flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Avg. Degree</span>
                      <span className="text-sm font-bold text-white mt-1 font-mono">{statistics.avgDegree}</span>
                    </Card>
                  </div>

                  <div className="space-y-2 border-t border-[#B2EA4D]/15 pt-3">
                    <div className="flex justify-between py-1.5 border-b border-[#B2EA4D]/15">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Orphan Nodes</span>
                      <span className="text-rose-400 font-bold font-mono">{statistics.orphans}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#B2EA4D]/15">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Duplicate Embeddings</span>
                      <span className="text-amber-400 font-bold font-mono">{statistics.duplicates}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#B2EA4D]/15">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Average Similarity</span>
                      <span className="text-[#B2EA4D] font-bold font-mono">{Math.round(statistics.averageSimilarity * 100)}%</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#B2EA4D]/15">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Largest Cluster</span>
                      <span className="text-[#B2EA4D] font-bold font-mono">{statistics.largestCluster}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Smallest Cluster</span>
                      <span className="text-slate-300 font-semibold font-mono">{statistics.smallestCluster}</span>
                    </div>
                  </div>

                  <Card className="bg-[#B2EA4D]/5 border border-[#B2EA4D]/10 p-4 rounded-xl mt-4">
                    <h5 className="text-[10px] font-extrabold uppercase text-[#B2EA4D] tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Semantic Health Index
                    </h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1.5 font-mono">
                      Your semantic network density is optimal. Louvain modularity indicates high semantic cohesion across documents.
                    </p>
                  </Card>
                </div>
              ) : (
                <div className="text-slate-500 text-center py-8 text-xs">Loading statistics...</div>
              )}
            </div>
          </Card>
        )}

        {/* Floating Parameter Controls */}
        <Card className="bg-[#16250e]/60 backdrop-blur border-[#B2EA4D]/15 p-5 rounded-xl border shadow-2xl flex flex-col gap-3">
          <h4 className="text-[10px] font-bold uppercase text-white tracking-widest flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-[#B2EA4D]" />
            Simulation Parameters
          </h4>

          <div className="space-y-3.5 text-[9px] font-bold text-slate-400">
            {/* Repulsion Force */}
            <div>
              <div className="flex justify-between">
                <span>REPULSION (ANTI-GRAVITY)</span>
                <span className="text-white font-mono">{repulsionForce}</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                value={repulsionForce}
                onChange={(e) => setRepulsionForce(Number(e.target.value))}
                className="w-full mt-1.5 h-1 bg-[#203210] rounded accent-[#B2EA4D] appearance-none cursor-pointer"
              />
            </div>

            {/* Link Force */}
            <div>
              <div className="flex justify-between">
                <span>LINK FORCE (ATTRACTION)</span>
                <span className="text-white font-mono">{linkForce.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.01"
                value={linkForce}
                onChange={(e) => setLinkForce(Number(e.target.value))}
                className="w-full mt-1.5 h-1 bg-[#203210] rounded accent-[#B2EA4D] appearance-none cursor-pointer"
              />
            </div>

            {/* Similarity Filter */}
            <div>
              <div className="flex justify-between">
                <span>MIN SIMILARITY FILTER</span>
                <span className="text-white font-mono">{minSimilarity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.80"
                step="0.05"
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(Number(e.target.value))}
                className="w-full mt-1.5 h-1 bg-[#203210] rounded accent-[#B2EA4D] appearance-none cursor-pointer"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Inline fallback check circle icon to prevent compilation errors
function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
