import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE as API } from "@/lib/api-config";
const STORAGE_KEY = "chat_session_token";

const QUICK_QUESTIONS = [
  "What are your package prices?",
  "What's included in the packages?",
  "How can I make a booking?",
  "Is the houseboat available for my dates?",
  "What activities are available?",
  "Where are you located?",
];

interface Message {
  id: number;
  sender: "visitor" | "admin" | "bot";
  message: string;
  createdAt: string;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

interface ChatWidgetProps {
  color?: string;
  alignment?: "left" | "right";
}

export function ChatWidget({ color = "#10b981", alignment = "right" }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLeft = alignment === "left";
  const posClass = isLeft ? "left-6" : "right-6";

  // Load existing session token
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSessionToken(saved);
      setNameSubmitted(true);
    }
  }, []);

  // SSE connection when we have a token
  useEffect(() => {
    if (!sessionToken) return;
    esRef.current?.close();

    const es = new EventSource(`${API}/chat/session/${sessionToken}/stream`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!open && msg.sender !== "visitor") {
        setUnreadCount(c => c + 1);
      }
    });

    es.addEventListener("session_closed", () => {
      setSessionClosed(true);
    });

    return () => { es.close(); };
  }, [sessionToken]);

  // Fetch existing messages when token is available
  useEffect(() => {
    if (!sessionToken) return;
    fetch(`${API}/chat/session/${sessionToken}/messages`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((msgs: Message[]) => setMessages(msgs))
      .catch(() => {});
  }, [sessionToken]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  const createSession = async (name?: string) => {
    setStarting(true);
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const res = await fetch(`${API}/chat/session`, { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorName: name || "Guest", token: existing }),
      });
      if (!res.ok) throw new Error();
      const session = await res.json();
      setSessionToken(session.token);
      localStorage.setItem(STORAGE_KEY, session.token);
      setNameSubmitted(true);
      setSessionClosed(false);
    } catch {
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionToken || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch(`${API}/chat/session/${sessionToken}/messages`, { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), sender: "visitor" }),
      });
    } catch {}
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [sessionToken, sending]);

  const handleQuickQuestion = async (q: string) => {
    if (!sessionToken) {
      await createSession(visitorName || "Guest");
    }
    await sendMessage(q);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSession(visitorName || "Guest");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-24 z-50 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all group",
          posClass
        )}
        style={{ backgroundColor: color }}
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Unread badge */}
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-[11px] font-bold flex items-center justify-center shadow">
            {unreadCount}
          </span>
        )}
        {/* Tooltip */}
        <span
          className={cn(
            "absolute bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow pointer-events-none",
            isLeft ? "left-full ml-3" : "right-full mr-3"
          )}
        >
          Chat with us
        </span>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={cn(
              "fixed bottom-44 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden shadow-2xl border border-border flex flex-col",
              posClass
            )}
            style={{ height: 480 }}
          >
            {/* Header */}
            <div className="text-white px-4 py-3 flex items-center gap-3 shrink-0" style={{ backgroundColor: color }}>
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">Shubhangi The Boat House</p>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block"></span>
                  Online · Usually replies quickly
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-background p-4 space-y-3">
              {/* Welcome message */}
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: color }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-foreground inline-block max-w-[85%]">
                    <p className="font-medium">👋 Hello! Welcome to Shubhangi The Boat House.</p>
                    <p className="mt-1 text-muted-foreground text-xs">How can we help you today? Choose a question below or type your own.</p>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn("flex gap-2", msg.sender === "visitor" ? "flex-row-reverse" : "flex-row")}
                >
                  {msg.sender !== "visitor" && (
                    <div
                      className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5")}
                      style={{ backgroundColor: msg.sender === "admin" ? "#6366f1" : color }}
                    >
                      {msg.sender === "admin"
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-white" />
                      }
                    </div>
                  )}
                  <div className={cn("max-w-[80%]", msg.sender === "visitor" ? "items-end" : "items-start")} style={{ display: "flex", flexDirection: "column" }}>
                    {msg.sender !== "visitor" && (
                      <span className="text-[10px] text-muted-foreground mb-0.5 ml-1 capitalize">{msg.sender}</span>
                    )}
                    <div
                      className={cn("px-3 py-2 rounded-2xl text-sm", msg.sender === "visitor" ? "rounded-tr-sm text-white" : "bg-muted text-foreground rounded-tl-sm")}
                      style={msg.sender === "visitor" ? { backgroundColor: color } : undefined}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              ))}

              {sessionClosed && (
                <div className="text-center text-xs text-muted-foreground py-2 border-t border-border">
                  This chat session has ended.{" "}
                  <button
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY);
                      setSessionToken(null);
                      setNameSubmitted(false);
                      setMessages([]);
                      setSessionClosed(false);
                    }}
                    className="underline"
                    style={{ color }}
                  >
                    Start new chat
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick questions or name form or input */}
            <div className="bg-background border-t border-border shrink-0">
              {!nameSubmitted ? (
                <form onSubmit={handleNameSubmit} className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Your name (optional)</p>
                  <div className="flex gap-2">
                    <input
                      value={visitorName}
                      onChange={e => setVisitorName(e.target.value)}
                      placeholder="e.g. John"
                      className="flex-1 h-9 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 bg-background"
                      style={{ focusRingColor: color } as React.CSSProperties}
                    />
                    <button
                      type="submit"
                      disabled={starting}
                      className="px-4 h-9 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: color }}
                    >
                      {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Start
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium pt-1">Or pick a quick question:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.slice(0, 3).map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuickQuestion(q)}
                        disabled={starting}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-current transition-colors text-foreground bg-muted/50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </form>
              ) : messages.length > 0 && !sessionClosed ? (
                <div className="p-3">
                  {messages.length < 3 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_QUESTIONS.filter(q => !messages.some(m => m.message === q)).slice(0, 4).map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-current transition-colors text-foreground bg-muted/50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                      placeholder="Type a message…"
                      disabled={sending}
                      className="flex-1 h-9 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 bg-background disabled:opacity-50"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || sending}
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: color }}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : nameSubmitted && messages.length === 0 ? (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Pick a question or type below:</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {QUICK_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-current transition-colors text-foreground bg-muted/50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(input); } }}
                      placeholder="Or type your question…"
                      className="flex-1 h-9 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 bg-background"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim()}
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: color }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
