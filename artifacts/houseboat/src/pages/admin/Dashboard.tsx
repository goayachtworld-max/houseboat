import { useState, useEffect } from "react";
import { authHeaders } from "@/hooks/use-admin-auth";
import { useListPackages, useListActivities } from "@workspace/api-client-react";
import {
  MessageSquare, CheckCircle2, Flag, CalendarClock,
  X, Users, Phone, Mail, CalendarDays, Package, Activity as ActivityIcon, Layers,
  ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";


import { API_BASE as API } from "@/lib/api-config";

interface Booking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  packageName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  totalPrice: string;
  notes: string;
  createdAt: string;
}

interface Inquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string;
  createdAt: string;
}

type ModalType = "inquiries" | "confirmed" | "completed" | "upcoming" | null;

const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};

const todayStr = new Date().toISOString().split("T")[0];

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: packages } = useListPackages();
  const { data: activities } = useListActivities();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [modalType, setModalType] = useState<ModalType>(null);

  useEffect(() => {
    fetch(`${API}/bookings`, { ...authHeaders() }).then(r => r.ok ? r.json() : []).then(setBookings).catch(() => {});
    fetch(`${API}/inquiries`, { ...authHeaders() }).then(r => r.ok ? r.json() : []).then(setInquiries).catch(() => {});
  }, []);

  const confirmedBookings = bookings.filter(b => b.status === "confirmed" && b.checkOut >= todayStr);
  const completedBookings = bookings.filter(b => b.checkOut < todayStr && b.status !== "cancelled");
  const upcomingBookings = bookings.filter(b => b.checkIn > todayStr && b.status !== "cancelled");

  const topCards = [
    {
      key: "inquiries" as ModalType,
      label: "Total Inquiries",
      value: inquiries.length,
      icon: MessageSquare,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-200 hover:border-violet-400",
      accent: "bg-violet-500",
    },
    {
      key: "confirmed" as ModalType,
      label: "Confirmed Bookings",
      value: confirmedBookings.length,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200 hover:border-green-400",
      accent: "bg-green-500",
    },
    {
      key: "completed" as ModalType,
      label: "Completed Stays",
      value: completedBookings.length,
      icon: Flag,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200 hover:border-blue-400",
      accent: "bg-blue-500",
    },
    {
      key: "upcoming" as ModalType,
      label: "Upcoming Bookings",
      value: upcomingBookings.length,
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200 hover:border-amber-400",
      accent: "bg-amber-500",
    },
  ];

  const bottomStats = [
    {
      label: "Active Packages",
      value: packages?.filter(p => p.isActive).length ?? "—",
      icon: Package,
      href: "/admin/packages",
      color: "text-blue-500",
    },
    {
      label: "Active Services",
      value: activities?.length ?? "—",
      icon: Layers,
      href: "/admin/activities",
      color: "text-teal-500",
    },
    {
      label: "Activities",
      value: activities?.length ?? "—",
      icon: ActivityIcon,
      href: "/admin/activities",
      color: "text-purple-500",
    },
  ];

  // Modal content
  const modalData: Record<Exclude<ModalType, null>, { title: string; items: (Booking | Inquiry)[]; type: "booking" | "inquiry" }> = {
    inquiries: { title: "All Inquiries", items: inquiries, type: "inquiry" },
    confirmed: { title: "Confirmed Bookings", items: confirmedBookings, type: "booking" },
    completed: { title: "Completed Stays", items: completedBookings, type: "booking" },
    upcoming: { title: "Upcoming Bookings", items: upcomingBookings, type: "booking" },
  };

  const modal = modalType ? modalData[modalType] : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
      </div>

      {/* Top 4 Booking Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {topCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => setModalType(card.key)}
              className={cn(
                "group text-left bg-card rounded-2xl border p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer",
                card.border
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0", card.bg)}>
                    <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", card.color)} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight">{card.label}</p>
                </div>
                <div className={cn("w-1 h-6 sm:w-1.5 sm:h-8 rounded-full opacity-60 shrink-0 ml-1", card.accent)} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground text-center">{card.value}</p>
            </button>
          );
        })}
      </div>

      {/* Bottom 3 Compact Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {bottomStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(s.href)}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
            >
              <Icon className={cn("w-5 h-5 shrink-0", s.color)} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <p className="text-xl font-bold text-foreground leading-tight">{s.value}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {modalType && modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">{modal.title}</h3>
                <p className="text-sm text-muted-foreground">{modal.items.length} record{modal.items.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {modal.items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="font-medium">No records found</p>
                </div>
              ) : modal.type === "inquiry" ? (
                (modal.items as Inquiry[]).map((inq) => (
                  <div key={inq.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{inq.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {inq.email}</span>
                      {inq.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {inq.phone}</span>}
                      {inq.checkIn && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(inq.checkIn)} → {formatDate(inq.checkOut)}</span>}
                      {inq.guests > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inq.guests} guests</span>}
                    </div>
                    {inq.message && <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-1">"{inq.message}"</p>}
                  </div>
                ))
              ) : (
                (modal.items as Booking[]).map((bk) => (
                  <div key={bk.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{bk.guestName}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", STATUS_BADGE[bk.status] || "bg-gray-100 text-gray-700")}>
                        {bk.status}
                      </span>
                    </div>
                    {bk.packageName && <p className="text-sm font-medium text-primary">{bk.packageName}</p>}
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(bk.checkIn)} → {formatDate(bk.checkOut)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {bk.guests} guests</span>
                      {bk.guestEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {bk.guestEmail}</span>}
                      {bk.guestPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {bk.guestPhone}</span>}
                    </div>
                    {bk.totalPrice && (
                      <p className="text-sm font-bold text-green-600">₹{bk.totalPrice}</p>
                    )}
                    {bk.notes && <p className="text-xs text-muted-foreground italic border-t border-border pt-2">"{bk.notes}"</p>}
                  </div>
                ))
              )}
            </div>

            {/* Footer shortcut */}
            <div className="px-6 py-3 border-t border-border shrink-0">
              <button
                onClick={() => { setModalType(null); navigate("/admin/calendar"); }}
                className="text-sm text-primary hover:underline font-medium"
              >
                View full booking calendar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
