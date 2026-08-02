// components/Chatbot.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { products, Product } from "../../data/products";

type ChatMessage = {
  id: number;
  from: "user" | "bot";
  text: string;
  sourceChunks?: any[];
  recs?: Product[];
};

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
        const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, "") : line;

        const parseInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
              return (
                <strong key={pIdx} className="font-semibold text-neutral-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });
        };

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-emerald-600 font-bold select-none text-xs">•</span>
              <div className="flex-1 text-neutral-700">{parseInline(cleanLine)}</div>
            </div>
          );
        }

        return <div key={lineIdx} className="text-neutral-700">{parseInline(line)}</div>;
      })}
    </div>
  );
}

// Find recommended products based on the user's specific query keywords and RAG chunks
const getRecommendationsForQuery = (query: string, sourceChunks?: any[]): Product[] => {
  const found: Product[] = [];
  const normalized = query.toLowerCase().trim();
  
  // 1. Scan user query for specific product categories and keywords
  products.forEach(p => {
    const slugKey = p.slug.replace(/-/g, " ");
    const nameWords = p.name.toLowerCase().split(" ").filter(w => w.length > 3);
    
    const matchesSlug = normalized.includes(slugKey);
    const matchesName = nameWords.some(w => normalized.includes(w));
    
    // Add common e-commerce product synonyms
    const isDiaperQuery = (normalized.includes("diaper") || normalized.includes("nappy") || normalized.includes("wipe")) && p.id === "nb-3";
    const isBottleQuery = (normalized.includes("bottle") || normalized.includes("feed") || normalized.includes("milk") || normalized.includes("colic")) && p.id === "nb-2";
    const isSwaddleQuery = (normalized.includes("swaddle") || normalized.includes("wrap")) && p.id === "nb-1";
    const isLotionQuery = (normalized.includes("lotion") || normalized.includes("moistur") || normalized.includes("cream") || normalized.includes("skin")) && p.id === "nb-4";
    const isMatQuery = (normalized.includes("mat") || normalized.includes("play") || normalized.includes("floor")) && p.id === "nb-5";
    const isCarrierQuery = (normalized.includes("carrier") || normalized.includes("travel") || normalized.includes("sling")) && p.id === "nb-6";
    const isTeetherQuery = (normalized.includes("teether") || normalized.includes("teething") || normalized.includes("chew") || normalized.includes("gum")) && p.id === "nb-7";
    const isBlanketQuery = (normalized.includes("blanket") || normalized.includes("crib")) && p.id === "nb-8";
    const isWashQuery = (normalized.includes("wash") || normalized.includes("bath") || normalized.includes("soap") || normalized.includes("shampoo")) && p.id === "nb-9";

    if (
      matchesSlug || 
      matchesName || 
      isDiaperQuery || 
      isBottleQuery || 
      isSwaddleQuery || 
      isLotionQuery || 
      isMatQuery || 
      isCarrierQuery || 
      isTeetherQuery || 
      isBlanketQuery || 
      isWashQuery
    ) {
      if (!found.some(item => item.id === p.id)) {
        found.push(p);
      }
    }
  });

  // 2. Scan categories of matches if query was general but matches were found
  if (sourceChunks && found.length < 2) {
    sourceChunks.forEach(chunk => {
      const cat = chunk.category?.toLowerCase();
      if (cat) {
        products.forEach(p => {
          if (p.category.toLowerCase() === cat && !found.some(item => item.id === p.id)) {
            found.push(p);
          }
        });
      }
    });
  }
  
  return found.slice(0, 2);
};

export function Chatbot({ onAddToCart }: { onAddToCart?: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "bot",
      text: "Hello! Welcome to Oogway 🐢. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oogway_simulated_workspace_id");
      if (stored) {
        setWorkspaceId(stored);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone access was denied. Please allow it in your browser settings.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition failed to start", err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const userQuery = input.trim();
    if (!userQuery || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      from: "user",
      text: userQuery,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Convert UI messages to history format
      const history = messages
        .filter(m => m.id !== 1) // skip the initial greeting
        .map(m => ({
          role: m.from === "user" ? "user" : "model",
          text: m.text
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ 
          message: userQuery,
          customerId: customerId || undefined,
          history,
          workspaceId
        }),
      });

      const data = await res.json();
      
      // Calculate product recommendations based strictly on the user query context
      const recs = getRecommendationsForQuery(userQuery, data.sourceChunks);

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        from: "bot",
        text:
          data.answer ??
          "Sorry, something went wrong. Please try asking again about Oogway products.",
        sourceChunks: data.sourceChunks,
        recs,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          from: "bot",
          text: "Oops, I had trouble replying. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating trigger button utilizing branded turtle logo */}
      <div className="fixed bottom-4 right-4 z-40">
        {!open && (
          <Button
            className="rounded-full h-14 w-14 shadow-lg p-0 overflow-hidden border border-emerald-100 hover:scale-105 transition-all duration-300 bg-white"
            onClick={() => setOpen(true)}
          >
            <img src="/images/oogway_turtle_logo.png" alt="Oogway Logo" className="w-full h-full object-cover" />
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96">
          <Card className="flex flex-col h-[520px] shadow-2xl border border-neutral-200/90 py-2 bg-white">
            {/* Header displaying Oogway Logo and Brand */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200 shrink-0 shadow-sm bg-neutral-50">
                  <img src="/images/oogway_turtle_logo.png" alt="Oogway" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-neutral-900 leading-none">
                    Oogway Assistant
                  </span>
                  <span className="text-[9px] font-bold text-neutral-400 font-mono mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online • Live RAG Engine
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-neutral-950 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Persona Simulator Dropdown */}
            <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Simulate Context:</span>
              <select 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex-1 text-xs bg-white border border-neutral-200 rounded px-1.5 py-1 text-neutral-700 outline-none focus:border-emerald-500 shadow-sm transition-colors"
              >
                <option value="">Anonymous Visitor</option>
                <option value="vip-sarah">VIP Customer (Sarah)</option>
                <option value="new-parent-john">First-time Parent (John)</option>
              </select>
            </div>

            {/* Scrollable Chat Area */}
            <div 
              ref={scrollRef} 
              className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${
                    msg.from === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Bot Avatar Icon next to message bubbles */}
                  {msg.from === "bot" && (
                    <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm mt-0.5">
                      <img src="/images/oogway_turtle_logo.png" alt="Oogway Avatar" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] shadow-sm ${
                      msg.from === "user"
                        ? "bg-emerald-600 text-white text-sm font-medium"
                        : "bg-neutral-100 text-neutral-800"
                    }`}
                  >
                    <FormattedMessage text={msg.text} />
                    
                    {/* Suggested products integration */}
                    {msg.from === "bot" && msg.recs && msg.recs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2.5 w-full font-sans">
                        <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">Suggested Products</p>
                        <div className="flex flex-col gap-2">
                          {msg.recs.map(prod => (
                            <div key={prod.id} className="flex gap-3 bg-white border border-neutral-150 rounded-xl p-2.5 shadow-sm items-center hover:shadow-md transition-all">
                              <div className="w-11 h-11 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 relative overflow-hidden border border-neutral-200">
                                <img 
                                  src={prod.slug === "organic-swaddle-wrap" ? "/images/organic_swaddle.png" : prod.slug === "bamboo-feeding-bottle" ? "/images/bamboo_bottle.png" : "/images/natural_baby_hero.png"} 
                                  alt={prod.name}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-neutral-900 truncate leading-tight">{prod.name}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] font-black text-emerald-600">${prod.price.toFixed(2)}</span>
                                  <span className="text-[8px] text-neutral-500 font-mono">Age: {prod.ageRange}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0 pl-1.5 font-sans">
                                <button
                                  onClick={() => {
                                    const el = document.getElementById("products");
                                    if (el) {
                                      el.scrollIntoView({ behavior: "smooth" });
                                    }
                                  }}
                                  className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-extrabold bg-white hover:bg-neutral-50 text-neutral-600 hover:text-emerald-700 rounded-md transition-all border border-neutral-250 shadow-sm whitespace-nowrap min-w-[48px]"
                                  title="View Details"
                                >
                                  <Eye className="w-2.5 h-2.5" />
                                  View
                                </button>
                                <button
                                  onClick={() => onAddToCart?.(prod)}
                                  className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-all shadow-sm whitespace-nowrap min-w-[48px]"
                                  title="Add to Cart"
                                >
                                  <ShoppingCart className="w-2.5 h-2.5" />
                                  Buy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <img src="/images/oogway_turtle_logo.png" alt="Oogway Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl px-3 py-2 text-sm bg-neutral-100 text-neutral-600 shadow-sm">
                    Typing…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-neutral-100 px-3 pt-2 pb-2 flex gap-2 items-center bg-white">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleListening} 
                className={`shrink-0 rounded-lg h-9 w-9 ${isListening ? "text-red-500 border-red-500 animate-pulse bg-red-50" : "text-neutral-500 border-neutral-200"}`}
                title="Voice Input"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Ask about Oogway products..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="rounded-lg h-9 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus-visible:ring-emerald-500"
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-9 px-4 rounded-lg shadow-sm">
                Send
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
