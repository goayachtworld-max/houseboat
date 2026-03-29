import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, User, Bot, Circle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { API_BASE as API } from "@/lib/api-config";

interface ChatSession {
  id: number;
  token: string;
  visitorName: string;
  status: "active" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    sender: string;
    message: string;
    createdAt: string;
  } | null;
}

interface Message {
  id: number;
  sessionId: number;
  sender: "visitor" | "admin" | "bot";
  message: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function AdminChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Load sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/sessions`, { credentials: "include" });
      if (res.ok) setSessions(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // SSE admin stream
  useEffect(() => {
    esRef.current?.close();
    const es = new EventSource(`${API}/chat/admin/stream`);
    esRef.current = es;

    es.addEventListener("message", (e) => {
      const payload = JSON.parse(e.data);
      const token = payload.sessionToken as string;

      // If this message is for the currently selected session, add it
      setSelectedToken(current => {
        if (current === token) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.id)) return prev;
            return [...prev, payload as Message];
          });
        } else if (payload.sender !== "admin") {
          // Track unread for other sessions
          setUnreadMap(u => ({ ...u, [token]: (u[token] || 0) + 1 }));
        }
        return current;
      });

      // Refresh session list to update "lastMessage"
      fetchSessions();
    });

    es.addEventListener("session_new", () => { fetchSessions(); });
    es.addEventListener("session_closed", () => { fetchSessions(); });

    return () => { es.close(); };
  }, [fetchSessions]);

  // Load messages for selected session
  useEffect(() => {
    if (!selectedToken) { setMessages([]); return; }
    setUnreadMap(u => { const n = { ...u }; delete n[selectedToken]; return n; });

    fetch(`${API}/chat/session/${selectedToken}/messages`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((msgs: Message[]) => setMessages(msgs))
      .catch(() => {});
  }, [selectedToken]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!input.trim() || !selectedToken || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    const optimistic: Message = {
      id: Date.now(),
      sessionId: 0,
      sender: "admin",
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await fetch(`${API}/chat/session/${selectedToken}/messages`, { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sender: "admin" }),
      });
    } catch {}
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSession = async (token: string) => {
    try {
      await fetch(`${API}/chat/session/${token}/close`, { credentials: "include",  method: "PATCH" });
      if (selectedToken === token) setSelectedToken(null);
      fetchSessions();
    } catch {}
  };

  const activeSessions = sessions.filter(s => s.status === "active");
  const closedSessions = sessions.filter(s => s.status === "closed");
  const selectedSession = sessions.find(s => s.token === selectedToken);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: session list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-lg text-primary flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Live Chats
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeSessions.length} active · {closedSessions.length} closed
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeSessions.length === 0 && closedSessions.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
              No chats yet. They'll appear here when visitors start a conversation.
            </div>
          )}

          {activeSessions.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Active</p>
              {activeSessions.map(s => (
                <SessionItem
                  key={s.token}
                  session={s}
                  isSelected={selectedToken === s.token}
                  unread={unreadMap[s.token] || 0}
                  onClick={() => setSelectedToken(s.token)}
                  onClose={() => closeSession(s.token)}
                />
              ))}
            </div>
          )}

          {closedSessions.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Closed</p>
              {closedSessions.map(s => (
                <SessionItem
                  key={s.token}
                  session={s}
                  isSelected={selectedToken === s.token}
                  unread={0}
                  onClick={() => setSelectedToken(s.token)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: conversation */}
      <div className="flex-1 flex flex-col bg-muted/20">
        {selectedSession ? (
          <>
            {/* Conversation header */}
            <div className="bg-background border-b border-border px-5 py-3 flex items-center gap-3 shrink-0">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                selectedSession.status === "active" ? "bg-primary" : "bg-muted-foreground"
              )}>
                {selectedSession.visitorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{selectedSession.visitorName}</p>
                <p className={cn("text-xs flex items-center gap-1", selectedSession.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                  {selectedSession.status === "active"
                    ? <><Circle className="w-2 h-2 fill-green-500 text-green-500" /> Active</>
                    : <><CheckCircle className="w-3 h-3" /> Closed</>
                  }
                </p>
              </div>
              {selectedSession.status === "active" && (
                <button
                  onClick={() => closeSession(selectedSession.token)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Close Chat
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn("flex gap-2", msg.sender === "admin" ? "flex-row-reverse" : "flex-row")}
                >
                  {msg.sender !== "admin" && (
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white", msg.sender === "bot" ? "bg-primary" : "bg-muted-foreground")}>
                      {msg.sender === "bot" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <div className={cn("flex flex-col max-w-[70%]", msg.sender === "admin" ? "items-end" : "items-start")}>
                    <span className="text-[10px] text-muted-foreground mb-0.5 mx-1 capitalize">{msg.sender}</span>
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-sm",
                      msg.sender === "admin"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-background text-foreground rounded-tl-sm border border-border shadow-sm"
                    )}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selectedSession.status === "active" ? (
              <div className="bg-background border-t border-border p-4 shrink-0">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder={`Reply to ${selectedSession.visitorName}…`}
                    className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!input.trim() || sending}
                    className="px-5 h-10 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-background border-t border-border px-5 py-3 text-sm text-muted-foreground text-center shrink-0">
                This chat is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <MessageSquare className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground mb-2">Select a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Choose a chat session from the left panel to view messages and reply in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionItem({ session, isSelected, unread, onClick, onClose }: {
  session: ChatSession;
  isSelected: boolean;
  unread: number;
  onClick: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-1 group",
        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
        session.status === "active" ? "bg-primary" : "bg-muted-foreground"
      )}>
        {session.visitorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
            {session.visitorName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(session.updatedAt)}</span>
        </div>
        {session.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {session.lastMessage.sender === "admin" ? "You: " : ""}
            {session.lastMessage.message}
          </p>
        )}
      </div>
      {unread > 0 && (
        <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread}
        </span>
      )}
      {onClose && session.status === "active" && (
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-destructive"
          title="Close chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
