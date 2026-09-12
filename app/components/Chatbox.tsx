// components/Chatbot.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, ShoppingCart, Eye, KeyRound, ShieldCheck, Lock, Loader2, PhoneCall, Mail, Copy, Share2, Check, Building2, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { products, Product } from "../../data/products";
import { KeyContact } from "@/app/api/contacts/route";

type ChatMessage = {
  id: number;
  from: "user" | "bot";
  text: string;
  sourceChunks?: any[];
  recs?: Product[];
  contacts?: KeyContact[];
};

function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} className="h-1" />;

        // Check if bullet point using regex (matches *, -, bullet characters, •)
        const bulletMatch = trimmed.match(/^([\*\-\u2022\u25E6\u25AA])\s*(.*)$/);
        const isBullet = !!bulletMatch;
        const content = isBullet ? bulletMatch[2] : trimmed;

        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-extrabold text-neutral-950">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-[#B2EA4D] font-extrabold select-none text-xs">•</span>
              <span className="text-neutral-700">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="text-neutral-700">
            {renderedParts}
          </p>
        );
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

export function Chatbot({
  onAddToCart,
  positionStrategy = "fixed",
  isMobilePreview = false,
  embeddedWorkspaceId,
  embeddedOtp,
  isEmbeddedMode,
  hideSimulateContext
}: {
  onAddToCart?: (product: Product) => void,
  positionStrategy?: "fixed" | "absolute",
  isMobilePreview?: boolean,
  embeddedWorkspaceId?: string,
  embeddedOtp?: string,
  isEmbeddedMode?: boolean,
  hideSimulateContext?: boolean
}) {
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
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>(embeddedWorkspaceId || "00000000-0000-0000-0000-000000000000");

  const [leadNameInput, setLeadNameInput] = useState<string>("");
  const [leadContactInput, setLeadContactInput] = useState<string>("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [showLeadPrompt, setShowLeadPrompt] = useState<boolean>(false);

  // Initialize Lead User Info from Browser LocalStorage Cache Memory
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedName = localStorage.getItem("oogway_lead_user_name");
      const cachedContact = localStorage.getItem("oogway_lead_user_contact");

      if (cachedName && cachedName.trim()) {
        setCustomerName(cachedName.trim());
        if (cachedContact && cachedContact.trim()) {
          if (cachedContact.includes("@")) setCustomerEmail(cachedContact.trim());
          else setCustomerPhone(cachedContact.trim());
        }
        setShowLeadPrompt(false);
      } else {
        setShowLeadPrompt(true);
      }
    }
  }, []);

  const generateGreetingMessage = (uName?: string, uContact?: string, targetCompanyName?: string) => {
    const hour = new Date().getHours();
    const targetName = uName ? uName.trim() : "";
    const compName = targetCompanyName || activeCompanyName || "Oogway";

    if (hour >= 5 && hour < 12) {
      return targetName
        ? `Good morning, ${targetName}! ☀️ Welcome to **${compName}** 🐢. How can I help you today?`
        : `Good morning! ☀️ Welcome to **${compName}** 🐢. Please introduce yourself with your Name and Contact details below to get started!`;
    } else if (hour >= 12 && hour < 17) {
      return targetName
        ? `Good afternoon, ${targetName}! 🌤️ Welcome to **${compName}** 🐢. How can I help you today?`
        : `Good afternoon! 🌤️ Welcome to **${compName}** 🐢. Please introduce yourself with your Name and Contact details below to get started!`;
    } else if (hour >= 17 && hour < 22) {
      return targetName
        ? `Good evening, ${targetName}! 🌆 Welcome to **${compName}** 🐢. How can I help you tonight?`
        : `Good evening! 🌆 Welcome to **${compName}** 🐢. Please introduce yourself with your Name and Contact details below to get started!`;
    } else {
      const lateGreetings = targetName ? [
        `Working late, ${targetName}? 🌙 Welcome to **${compName}** 🐢! How can I help you tonight?`,
        `Night owl mode activated, ${targetName}! 🦉 Welcome to **${compName}** 🐢. What can I assist you with tonight?`,
        `Burning the midnight oil, ${targetName}? ✨ Welcome to **${compName}** 🐢. How can I help you tonight?`
      ] : [
        `Working late? 🌙 Welcome to **${compName}** 🐢! Please enter your Name & Contact details below to get started!`,
        `Night owl mode activated! 🦉 Welcome to **${compName}** 🐢. Please enter your Name & Contact details below to get started!`,
        `Burning the midnight oil? ✨ Welcome to **${compName}** 🐢. Please enter your Name & Contact details below to get started!`
      ];
      const pickIdx = Math.abs(targetName.length + hour) % lateGreetings.length;
      return lateGreetings[pickIdx];
    }
  };

  const handleSaveLeadInfo = async () => {
    const name = leadNameInput.trim();
    const contact = leadContactInput.trim();

    if (!name || name.length < 2) {
      setLeadError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!contact || contact.length < 5) {
      setLeadError("Please enter a valid phone number or email address.");
      return;
    }

    setLeadError(null);
    const isEmail = contact.includes("@");

    if (typeof window !== "undefined") {
      localStorage.setItem("oogway_lead_user_name", name);
      localStorage.setItem("oogway_lead_user_contact", contact);
    }

    setCustomerName(name);
    if (isEmail) setCustomerEmail(contact);
    else setCustomerPhone(contact);
    setShowLeadPrompt(false);

    // Save lead to Lead Channel API
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: isEmail ? "" : contact,
          email: isEmail ? contact : "",
          firstQuery: "Started Live Chat Session",
          source: "Embedded Chatbot Widget",
          workspaceId: workspaceId
        })
      });
    } catch (e) {
      console.warn("Failed to submit lead:", e);
    }

    const greetingText = generateGreetingMessage(name, contact, activeCompanyName);

    setMessages([
      {
        id: 1,
        from: "bot",
        text: greetingText
      }
    ]);
  };

  // Determine if running inside an iframe, CodePen, or embedded route on another site
  const [isEmbedded, setIsEmbedded] = useState<boolean>(true); // Default to embedded for security
  const [isDomainAuthorized, setIsDomainAuthorized] = useState<boolean>(true);
  const [userVerifiedOtp, setUserVerifiedOtp] = useState<boolean>(false);
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const inIframe = window.self !== window.top;
      const inEmbedRoute = window.location.pathname.startsWith("/embed");
      const isExt = Boolean(isEmbeddedMode || (embeddedWorkspaceId && embeddedWorkspaceId !== "00000000-0000-0000-0000-000000000000") || inIframe || inEmbedRoute);
      setIsEmbedded(isExt);
    }
  }, [isEmbeddedMode, embeddedWorkspaceId]);

  // Check domain security verification for embedded instance
  useEffect(() => {
    async function checkDomainSecurity() {
      if (!isEmbedded) {
        setIsDomainAuthorized(true);
        return;
      }

      try {
        const referrer = typeof document !== "undefined" ? document.referrer : "";
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const targetWs = embeddedWorkspaceId || workspaceId;

        const res = await fetch(`/api/chatbot/verify?workspaceId=${encodeURIComponent(targetWs)}&origin=${encodeURIComponent(referrer || origin)}`);
        if (res.ok) {
          const data = await res.json();
          setIsDomainAuthorized(Boolean(data.authorized));
        } else {
          setIsDomainAuthorized(true);
        }
      } catch (e) {
        setIsDomainAuthorized(true);
      }
    }

    checkDomainSecurity();
  }, [isEmbedded, embeddedWorkspaceId, workspaceId]);

  // Chatbot is verified ONLY if not embedded, OR domain is authorized, OR user explicitly verifies 1-time Admin OTP
  const isOtpVerified = !isEmbedded || isDomainAuthorized || userVerifiedOtp;
  const [otpInput, setOtpInput] = useState<string>(embeddedOtp || "");
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const targetOtp = (codeToVerify || otpInput || "").trim().toUpperCase();
    if (!targetOtp || targetOtp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP from your Admin Chatbot Control Panel.");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);

      const referrer = typeof document !== "undefined" ? document.referrer : "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const res = await fetch("/api/chatbot/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          otp: targetOtp,
          workspaceId: embeddedWorkspaceId || workspaceId,
          origin: referrer || origin
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setUserVerifiedOtp(true);
        setIsDomainAuthorized(true);
        if (data.workspaceId) {
          setWorkspaceId(data.workspaceId);
        }
        if (data.workspaceName) {
          setActiveCompanyName(data.workspaceName);
        }
        if (data.workspaceIndustry) {
          setActiveCompanyIndustry(data.workspaceIndustry);
        }

        setMessages([
          {
            id: 1,
            from: "bot",
            text: `✓ **Domain Authorized & Chatbot Successfully Linked!**\nConnected to Knowledgebase for **${data.workspaceName || "Workspace"}**.\nHow can I help you today?`,
          }
        ]);
      } else {
        setUserVerifiedOtp(false);
        setOtpError(data.error || "Invalid 6-character OTP. Access denied. Please check your Admin Chatbot Control Panel.");
      }
    } catch (err) {
      setOtpError("Network error verifying OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-detect client logged-in account and isolated workspace ID
  const [activeCompanyName, setActiveCompanyName] = useState<string>("Oogway");
  const [activeCompanyIndustry, setActiveCompanyIndustry] = useState<string>("products and services");

  useEffect(() => {
    async function detectUserAccount() {
      try {
        let detectedWsId = embeddedWorkspaceId;
        let companyName = "";
        let companyIndustry = "";
        let email = "";
        let name = "";

        if (typeof window !== "undefined") {
          const simWs = localStorage.getItem("oogway_simulated_workspace_id");
          const simComp = localStorage.getItem("oogway_simulated_company");
          const simInd = localStorage.getItem("oogway_simulated_industry");

          if (!detectedWsId && simWs && simWs !== "00000000-0000-0000-0000-000000000000") {
            detectedWsId = simWs;
          }
          if (simComp && simComp.trim()) companyName = simComp;
          if (simInd && simInd.trim()) companyIndustry = simInd;
        }

        // 1. Try querying /api/auth/role to get real database role & workspace ID
        const roleRes = await fetch("/api/auth/role").catch(() => null);
        if (roleRes && roleRes.ok) {
          const roleData = await roleRes.json();
          if (roleData.workspaceId && !detectedWsId && roleData.workspaceId !== "ffffffff-ffff-ffff-ffff-ffffffffffff") {
            detectedWsId = roleData.workspaceId;
          }

          if (roleData.workspaceInfo?.name && !companyName) {
            companyName = roleData.workspaceInfo.name;
          }
          if (roleData.workspaceInfo?.industry && !companyIndustry) {
            companyIndustry = roleData.workspaceInfo.industry;
          }

          if (roleData.email) {
            email = roleData.email;
            name = roleData.user?.user_metadata?.full_name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
        }

        const finalWsId = detectedWsId || "00000000-0000-0000-0000-000000000000";
        setWorkspaceId(finalWsId);

        // 2. Fetch workspace info if companyName is not known yet
        if (!companyName && finalWsId !== "00000000-0000-0000-0000-000000000000") {
          try {
            const wsRes = await fetch(`/api/workspace/info?workspaceId=${finalWsId}`).catch(() => null);
            if (wsRes && wsRes.ok) {
              const wsData = await wsRes.json();
              if (wsData.name) companyName = wsData.name;
              if (wsData.industry) companyIndustry = wsData.industry;
            }
          } catch (e) {
            console.warn("Failed to fetch workspace info for chatbox:", e);
          }
        }

        if (!companyName) {
          companyName = "Oogway";
        }
        if (!companyIndustry) {
          companyIndustry = "products and services";
        }

        setActiveCompanyName(companyName);
        setActiveCompanyIndustry(companyIndustry);

        // 3. Fallback to Supabase browser client auth session if email is not resolved
        if (!email) {
          const { createClient } = await import("@/utils/supabase/client");
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (user && user.email) {
            email = user.email;
            const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
            const fallbackName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            name = metaName || fallbackName;
          }
        }

        // Fetch custom welcome message from workspace settings if available
        let customWelcomeMsg: string | null = null;
        if (finalWsId !== "00000000-0000-0000-0000-000000000000") {
          try {
            const wsRes = await fetch(`/api/workspace/info?workspaceId=${finalWsId}`).catch(() => null);
            if (wsRes && wsRes.ok) {
              const wsData = await wsRes.json();
              if (wsData.welcome_message) customWelcomeMsg = wsData.welcome_message;
            }
          } catch (e) {}
        }

        // 4. Resolve effective name: Prioritize browser localStorage cache over admin auth session
        let effectiveName = "";
        let effectiveContact = "";

        if (typeof window !== "undefined") {
          const cachedName = localStorage.getItem("oogway_lead_user_name");
          const cachedContact = localStorage.getItem("oogway_lead_user_contact");
          if (cachedName && cachedName.trim()) {
            effectiveName = cachedName.trim();
          }
          if (cachedContact && cachedContact.trim()) {
            effectiveContact = cachedContact.trim();
          }
        }

        // Fallback to logged-in admin account session if no local visitor cache exists
        if (!effectiveName && name && name.trim()) {
          effectiveName = name.trim();
        }
        if (!effectiveContact && email && email.trim()) {
          effectiveContact = email.trim();
        }

        if (effectiveName) {
          setCustomerName(effectiveName);
          if (effectiveContact) {
            if (effectiveContact.includes("@")) setCustomerEmail(effectiveContact);
            else setCustomerPhone(effectiveContact);
          }
          setShowLeadPrompt(false);

          const greetingText = customWelcomeMsg || generateGreetingMessage(effectiveName, effectiveContact, companyName);

          setMessages([
            {
              id: 1,
              from: "bot",
              text: greetingText,
            },
          ]);
        } else {
          setCustomerEmail("");
          setCustomerName("");
          setShowLeadPrompt(true);

          const guestGreeting = customWelcomeMsg || generateGreetingMessage(undefined, undefined, companyName);

          setMessages([
            {
              id: 1,
              from: "bot",
              text: guestGreeting,
            },
          ]);
        }
      } catch (err) {
        console.warn("Could not auto-detect session user for chatbot:", err);
      }
    }

    detectUserAccount();
  }, [embeddedWorkspaceId]);

  // Tell parent window (if in an iframe) to resize when chat opens/closes
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage(
        { type: "OOGWAY_CHATBOT_STATE", isOpen: open },
        "*"
      );
    }
  }, [open]);

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

  const handleWarmup = () => {
    fetch("/api/chat/warmup").catch(() => { });
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async () => {
    if (showLeadPrompt) return;
    const userQuery = input.trim();
    if (!userQuery) return;

    // Abort previous in-flight stream if user sends a new message quickly
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: ChatMessage = {
      id: Date.now(),
      from: "user",
      text: userQuery,
    };

    // Auto-sync captured lead to Lead Channel API
    if (customerName || leadNameInput) {
      const targetLeadName = customerName || leadNameInput;
      const targetLeadContact = customerEmail || customerPhone || leadContactInput;
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetLeadName,
          phone: targetLeadContact.includes("@") ? "" : targetLeadContact,
          email: targetLeadContact.includes("@") ? targetLeadContact : "",
          firstQuery: userQuery,
          source: "Embedded Chatbot Widget",
          workspaceId: workspaceId
        })
      }).catch(() => {});
    }

    const botMsgId = Date.now() + 1;
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      from: "bot",
      text: "",
    };

    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    setInput("");
    setLoading(true);

    try {
      // Convert UI messages to history format
      const history = messages
        .filter(m => m.id !== 1 && m.text) // skip initial greeting & blank messages
        .map(m => ({
          role: m.from === "user" ? "user" : "model",
          text: m.text
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: userQuery,
          customerEmail: customerEmail || undefined,
          customerName: customerName || undefined,
          history,
          workspaceId,
          workspaceName: activeCompanyName,
          workspaceIndustry: activeCompanyIndustry,
          stream: true
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let sourceChunks: any[] = [];
        let isCacheHit = false;
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataPayload = trimmed.slice(6);
              if (dataPayload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataPayload);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                }
                if (parsed.sourceChunks) {
                  sourceChunks = parsed.sourceChunks;
                }
                if (parsed.isCacheHit) {
                  isCacheHit = true;
                }
              } catch (e) {
                if (dataPayload) accumulatedText += dataPayload;
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId
                    ? { ...msg, text: accumulatedText, sourceChunks }
                    : msg
                )
              );
            }
          }
        }

        if (!accumulatedText) {
          accumulatedText = "I am right here to help you. Could you please rephrase your query?";
        }

        let matchedContacts: KeyContact[] = [];
        const lowerQuery = userQuery.toLowerCase();
        const contactKeywords = ["contact", "phone", "email", "call", "number", "reach", "who to", "officer", "head", "support", "help", "department", "desk", "admission", "placement", "director", "dean", "warden"];
        if (contactKeywords.some(k => lowerQuery.includes(k))) {
          try {
            const cRes = await fetch(`/api/contacts?workspaceId=${encodeURIComponent(workspaceId)}`);
            if (cRes.ok) {
              const cData = await cRes.json();
              const allContacts: KeyContact[] = cData.contacts || [];
              matchedContacts = allContacts.filter(c => {
                const nameMatch = c.name && lowerQuery.includes(c.name.toLowerCase());
                const deptMatch = c.department && lowerQuery.includes(c.department.toLowerCase());
                const roleMatch = c.designation && lowerQuery.includes(c.designation.toLowerCase());
                const kwMatch = Array.isArray(c.keywords) && c.keywords.some((k: string) => lowerQuery.includes(k.toLowerCase()));
                return nameMatch || deptMatch || roleMatch || kwMatch;
              });
              if (matchedContacts.length === 0) matchedContacts = allContacts.slice(0, 3);
            }
          } catch (e) {}
        }

        const isDefaultOogwayStore = (!workspaceId || workspaceId === "00000000-0000-0000-0000-000000000000") && activeCompanyName.toLowerCase() === "oogway";
        const recs = isDefaultOogwayStore
          ? getRecommendationsForQuery(userQuery, sourceChunks)
          : [];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? { ...msg, text: accumulatedText, sourceChunks, recs, contacts: matchedContacts.length > 0 ? matchedContacts : undefined }
              : msg
          )
        );
      } else {
        const data = await res.json();
        let matchedContacts: KeyContact[] = data.contacts || [];
        if (!matchedContacts || matchedContacts.length === 0) {
          const lowerQuery = userQuery.toLowerCase();
          const contactKeywords = ["contact", "phone", "email", "call", "number", "reach", "who to", "officer", "head", "support", "help", "department", "desk", "admission", "placement", "director", "dean", "warden"];
          if (contactKeywords.some(k => lowerQuery.includes(k))) {
            try {
              const cRes = await fetch(`/api/contacts?workspaceId=${encodeURIComponent(workspaceId)}`);
              if (cRes.ok) {
                const cData = await cRes.json();
                const allContacts: KeyContact[] = cData.contacts || [];
                matchedContacts = allContacts.filter(c => {
                  const nameMatch = c.name && lowerQuery.includes(c.name.toLowerCase());
                  const deptMatch = c.department && lowerQuery.includes(c.department.toLowerCase());
                  const roleMatch = c.designation && lowerQuery.includes(c.designation.toLowerCase());
                  const kwMatch = Array.isArray(c.keywords) && c.keywords.some((k: string) => lowerQuery.includes(k.toLowerCase()));
                  return nameMatch || deptMatch || roleMatch || kwMatch;
                });
                if (matchedContacts.length === 0) matchedContacts = allContacts.slice(0, 3);
              }
            } catch (e) {}
          }
        }

        const isDefaultOogwayStore = (!workspaceId || workspaceId === "00000000-0000-0000-0000-000000000000") && activeCompanyName.toLowerCase() === "oogway";
        const recs = isDefaultOogwayStore
          ? getRecommendationsForQuery(userQuery, data.sourceChunks)
          : [];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                ...msg,
                text: data.answer ?? "I'm right here to assist you.",
                sourceChunks: data.sourceChunks,
                recs,
                contacts: matchedContacts.length > 0 ? matchedContacts : undefined,
              }
              : msg
          )
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat request aborted due to new message.");
        return;
      }
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
              ...msg,
              text: "I experienced a connection problem. Please try again so I can support you properly.",
            }
            : msg
        )
      );
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
      <div className={`${positionStrategy} bottom-4 right-4 z-40`}>
        {!open && (
          <Button
            className="rounded-full h-14 w-14 shadow-lg p-0 overflow-hidden border border-emerald-100 hover:scale-105 transition-all duration-300 bg-white cursor-pointer"
            onClick={() => {
              handleWarmup();
              setOpen(true);
            }}
            onMouseEnter={handleWarmup}
          >
            <img src="/images/oogway_turtle_logo.png" alt="Oogway Logo" className="w-full h-full object-cover" />
          </Button>
        )}
      </div>

      {open && (
        <div className={`${positionStrategy} z-50 bottom-4 right-4 h-[520px] ${isMobilePreview ? 'w-[calc(100%-2rem)]' : 'w-[calc(100%-2rem)] sm:w-96'}`}>
          <Card className="flex flex-col h-full bg-white overflow-hidden shadow-2xl border border-neutral-200/90 rounded-xl py-2">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B2EA4D] text-[#203210] animate-pulse" />
                    Online • Support Employee
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

            {!isOtpVerified && isEmbedded ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 space-y-4 font-sans min-h-0 overflow-y-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#B2EA4D]/20 text-[#203210] flex items-center justify-center shadow-md border border-[#B2EA4D]/40 shrink-0">
                  <KeyRound className="w-7 h-7 text-[#203210]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Link Chatbot & Sync Account</h4>
                  <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                    Enter the unique 6-digit alphanumeric OTP from your Chatbot Playground to sync your Account ID & Knowledgebase.
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setOtpInput(val);
                      if (val.length === 6) {
                        handleVerifyOtp(val);
                      }
                    }}
                    className="text-center font-mono text-lg font-black tracking-widest uppercase h-11 border-neutral-300 focus:border-[#B2EA4D] focus:ring-[#B2EA4D] bg-white text-neutral-900"
                  />

                  {otpError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-left flex items-start gap-2">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleVerifyOtp()}
                    disabled={verifyingOtp || otpInput.trim().length !== 6}
                    className="w-full bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#203210] font-extrabold h-10 rounded-lg shadow-sm"
                  >
                    {verifyingOtp ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP...
                      </span>
                    ) : (
                      "Verify & Sync Knowledge Base"
                    )}
                  </Button>

                  <p className="text-[10px] text-neutral-400 font-mono">
                    🔒 Security Gate: Chatbot will not process queries without a valid matching OTP.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable Chat Area */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-4"
                >
                  {/* Inline Lead Capture Prompt Card for New Users */}
                  {showLeadPrompt && (
                    <div className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-[#B2EA4D]/40 rounded-2xl p-3.5 space-y-2.5 font-sans my-2 shadow-md">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#B2EA4D] text-[#203210] shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-neutral-900 leading-tight">Welcome! Introduce Yourself</h5>
                          <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">Please share your Name and Phone/Email so we can assist you better.</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <Input
                          type="text"
                          placeholder="Enter Your Full Name"
                          value={leadNameInput}
                          onChange={(e) => setLeadNameInput(e.target.value)}
                          className="h-8 text-xs bg-white border-neutral-300 text-neutral-900 focus:border-[#B2EA4D]"
                        />
                        <Input
                          type="text"
                          placeholder="Phone Number or Email Address"
                          value={leadContactInput}
                          onChange={(e) => setLeadContactInput(e.target.value)}
                          className="h-8 text-xs bg-white border-neutral-300 text-neutral-900 focus:border-[#B2EA4D]"
                        />
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            onClick={handleSaveLeadInfo}
                            disabled={!leadNameInput.trim() || !leadContactInput.trim()}
                            className="w-full h-8 bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#203210] font-extrabold text-xs rounded-lg shadow-sm cursor-pointer"
                          >
                            Save & Start Conversation 🚀
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 items-start ${msg.from === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                      {/* Bot Avatar Icon next to message bubbles */}
                      {msg.from === "bot" && (
                        <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm mt-0.5">
                          <img src="/images/oogway_turtle_logo.png" alt="Oogway Avatar" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] shadow-sm ${msg.from === "user"
                            ? "bg-[#B2EA4D] text-[#203210] text-white text-sm font-medium"
                            : "bg-neutral-100 text-neutral-800"
                          }`}
                      >
                        {msg.from === "bot" && !msg.text ? (
                          <span className="text-neutral-500 font-medium text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#B2EA4D] animate-ping" />
                            Typing…
                          </span>
                        ) : (
                          <FormattedMessage text={msg.text} />
                        )}

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
                                      <span className="text-[10px] font-black text-[#B2EA4D]">${prod.price.toFixed(2)}</span>
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
                                      className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-extrabold bg-white hover:bg-neutral-50 text-neutral-600 hover:text-[#B2EA4D] rounded-md transition-all border border-neutral-250 shadow-sm whitespace-nowrap min-w-[48px]"
                                      title="View Details"
                                    >
                                      <Eye className="w-2.5 h-2.5" />
                                      View
                                    </button>
                                    <button
                                      onClick={() => onAddToCart?.(prod)}
                                      className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-extrabold bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 text-white rounded-md transition-all shadow-sm whitespace-nowrap min-w-[48px]"
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

                        {/* Key Directory Contact Cards integration */}
                        {msg.from === "bot" && msg.contacts && msg.contacts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2.5 w-full font-sans">
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                              <PhoneCall className="w-3 h-3 text-[#203210]" /> Official Key Contacts ({msg.contacts.length})
                            </p>
                            <div className="flex flex-col gap-2.5">
                              {msg.contacts.map((contact) => {
                                const initials = contact.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase();

                                return (
                                  <div
                                    key={contact.id}
                                    className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all space-y-2 text-neutral-900"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B2EA4D] to-lime-500 text-[#203210] font-black text-xs flex items-center justify-center shrink-0 shadow-sm border border-lime-300 font-mono">
                                          {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h5 className="text-xs font-black text-neutral-900 leading-tight truncate">{contact.name}</h5>
                                          <p className="text-[10px] font-medium text-neutral-500 truncate leading-tight mt-0.5">{contact.designation}</p>
                                        </div>
                                      </div>
                                      <span className="text-[8px] font-extrabold uppercase font-mono px-2 py-0.5 rounded bg-[#B2EA4D]/30 text-[#203210] shrink-0 border border-[#B2EA4D]/40">
                                        {contact.department}
                                      </span>
                                    </div>

                                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-150 space-y-1 text-[10px] font-mono text-neutral-700">
                                      {contact.phone && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-neutral-400">📞 Phone:</span>
                                          <a href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`} className="font-bold text-[#203210] hover:underline">
                                            {contact.phone}
                                          </a>
                                        </div>
                                      )}
                                      {contact.email && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-neutral-400">✉️ Email:</span>
                                          <a href={`mailto:${contact.email}`} className="font-bold text-neutral-800 hover:text-[#203210] hover:underline truncate max-w-[140px]">
                                            {contact.email}
                                          </a>
                                        </div>
                                      )}
                                      {contact.availability && (
                                        <div className="flex items-center justify-between text-neutral-400 text-[9px]">
                                          <span>⏰ Hours:</span>
                                          <span className="truncate">{contact.availability}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action buttons: Call, Email, Copy, Share */}
                                    <div className="grid grid-cols-4 gap-1.5 pt-0.5 font-sans">
                                      {contact.phone ? (
                                        <a
                                          href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                                          className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-black bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 rounded-md transition-all shadow-sm"
                                          title="Direct Call"
                                        >
                                          <PhoneCall className="w-2.5 h-2.5" /> Call
                                        </a>
                                      ) : <div />}

                                      {contact.email ? (
                                        <a
                                          href={`mailto:${contact.email}`}
                                          className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-extrabold bg-neutral-900 text-white hover:bg-neutral-800 rounded-md transition-all shadow-sm"
                                          title="Send Email"
                                        >
                                          <Mail className="w-2.5 h-2.5" /> Email
                                        </a>
                                      ) : <div />}

                                      <button
                                        onClick={() => {
                                          const cardText = `📇 ${contact.name}\n💼 ${contact.designation} (${contact.department})\n📞 Phone: ${contact.phone || "N/A"}\n✉️ Email: ${contact.email || "N/A"}\n⏰ Hours: ${contact.availability || "N/A"}`;
                                          navigator.clipboard.writeText(cardText);
                                          setCopiedContactId(contact.id);
                                          setTimeout(() => setCopiedContactId(null), 2000);
                                        }}
                                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-bold bg-white text-neutral-700 hover:bg-neutral-100 rounded-md border border-neutral-250 transition-all shadow-sm"
                                        title="Copy Details"
                                      >
                                        {copiedContactId === contact.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-neutral-500" />}
                                        {copiedContactId === contact.id ? "Copied" : "Copy"}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const text = `${contact.name} - ${contact.designation}\nPhone: ${contact.phone || ""}\nEmail: ${contact.email || ""}`;
                                          if (navigator.share) {
                                            navigator.share({ title: contact.name, text, url: window.location.href }).catch(() => {});
                                          } else {
                                            navigator.clipboard.writeText(text);
                                            setCopiedContactId(contact.id);
                                            setTimeout(() => setCopiedContactId(null), 2000);
                                          }
                                        }}
                                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[9px] font-bold bg-white text-neutral-700 hover:bg-neutral-100 rounded-md border border-neutral-250 transition-all shadow-sm"
                                        title="Share Contact"
                                      >
                                        <Share2 className="w-2.5 h-2.5 text-amber-500" /> Share
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-neutral-100 px-3 pt-2 pb-2 flex gap-2 items-center bg-white">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleListening}
                    disabled={showLeadPrompt}
                    className={`shrink-0 rounded-lg h-9 w-9 ${isListening ? "text-red-500 border-red-500 animate-pulse bg-red-50" : "text-neutral-500 border-neutral-200"}`}
                    title={showLeadPrompt ? "Please submit your Name & Contact above to start" : "Voice Input"}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Input
                    disabled={showLeadPrompt}
                    placeholder={showLeadPrompt ? "🔒 Enter your Name & Contact above to start..." : "Ask about Oogway products or support..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="rounded-lg h-9 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus-visible:ring-[#B2EA4D]"
                  />
                  <Button onClick={sendMessage} disabled={showLeadPrompt || !input.trim()} className="bg-[#B2EA4D] text-[#203210] hover:bg-[#B2EA4D]/90 text-white font-extrabold h-9 px-4 rounded-lg shadow-sm">
                    Send
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
