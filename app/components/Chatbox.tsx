// components/Chatbot.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  id: number;
  from: "user" | "bot";
  text: string;
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
                <strong key={pIdx} className="font-semibold text-foreground">
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
              <span className="text-primary font-bold select-none text-xs">•</span>
              <div className="flex-1">{parseInline(cleanLine)}</div>
            </div>
          );
        }

        return <div key={lineIdx}>{parseInline(line)}</div>;
      })}
    </div>
  );
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "bot",
      text: "Hi 🐢, I'm the Oogway assistant. Ask me anything about our baby products!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const toggleListening = () => {
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      from: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg.text }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        from: "bot",
        text:
          data.answer ??
          "Sorry, something went wrong. Please try asking again about Oogway products.",
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
      <div className="fixed bottom-4 right-4 z-40">
        {!open && (
          <Button
            className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96">
          <Card className="flex flex-col h-[520px] shadow-xl border border-gray-200 py-2">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  Oogway Assistant
                </span>
                <span className="text-xs text-muted-foreground">
                  Ask about our baby products
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-3 py-2 h-[300px]">
              <div className="space-y-2 pr-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.from === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[88%] ${
                        msg.from === "user"
                          ? "bg-primary text-primary-foreground text-sm"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <FormattedMessage text={msg.text} />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2 text-sm bg-muted">
                      Typing…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t px-3 pt-2 pb-2 flex gap-2 items-center">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleListening} 
                className={`shrink-0 ${isListening ? "text-red-500 border-red-500 animate-pulse" : "text-neutral-500"}`}
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
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                Send
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
