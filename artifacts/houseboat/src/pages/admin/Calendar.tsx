import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Edit2, Users, Phone, Mail, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


import { API_BASE as API } from "@/lib/api-config";

type BookingStatus = "confirmed" | "pending" | "cancelled";

interface Booking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  packageName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
  notes: string;
  totalPrice: string;
  createdAt: string;
}

interface DaySummary {
  count: number;
  guests: number;
  bookings: Booking[];
}

interface CalendarData {
  [dateStr: string]: DaySummary;
}

const MAX_GUESTS_PER_DAY = 10;

function dayStatus(day: DaySummary | undefined): "available" | "partial" | "full" {
  if (!day || day.count === 0) return "available";
  if (day.guests >= MAX_GUESTS_PER_DAY) return "full";
  return "partial";
}

const STATUS_CLASSES = {
  available: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  full: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
};

const STATUS_DOT = {
  available: "bg-green-500",
  partial: "bg-yellow-500",
  full: "bg-red-500",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const emptyForm = {
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  packageName: "",
  checkIn: "",
  checkOut: "",
  guests: 2,
  kids: 0,
  status: "confirmed" as BookingStatus,
  notes: "",
  totalPrice: "",
};

export default function AdminCalendar() {
  const { toast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/bookings/calendar/${monthStr}`, { credentials: "include" });
      const data = await res.json();
      setCalendarData(data);
    } catch (e) {
      toast({ title: "Error", description: "Could not load calendar data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function openAdd(date?: string) {
    const checkIn = date || dateStr(today.getDate());
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
    const co = checkOut.toISOString().split("T")[0];
    setForm({ ...emptyForm, checkIn, checkOut: co });
    setEditingBooking(null);
    setShowAddModal(true);
  }

  function openEdit(b: Booking) {
    setForm({
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
      packageName: b.packageName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests,
      kids: (b as any).kids ?? 0,
      status: b.status,
      notes: b.notes || "",
      totalPrice: b.totalPrice || "",
    });
    setEditingBooking(b);
    setShowAddModal(true);
  }

  async function handleSave() {
    if (!form.guestName || !form.checkIn || !form.checkOut) {
      toast({ title: "Missing fields", description: "Please fill in guest name, check-in and check-out dates.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editingBooking ? `${API}/bookings/${editingBooking.id}` : `${API}/bookings`;
      const method = editingBooking ? "PUT" : "POST";
      const res = await fetch(url, { credentials: "include",
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: Number(form.guests), kids: Number(form.kids) }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: editingBooking ? "Booking updated" : "Booking created", description: `${form.guestName}'s booking saved successfully.` });
      setShowAddModal(false);
      fetchCalendar();
    } catch {
      toast({ title: "Error", description: "Could not save booking.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this booking?")) return;
    try {
      await fetch(`${API}/bookings/${id}`, { credentials: "include",  method: "DELETE" });
      toast({ title: "Deleted", description: "Booking removed." });
      fetchCalendar();
      if (selectedDate) {
        const updated = await fetch(`${API}/bookings/calendar/${monthStr}`, { credentials: "include" });
        setCalendarData(await updated.json());
      }
    } catch {
      toast({ title: "Error", description: "Could not delete booking.", variant: "destructive" });
    }
  }

  const selectedDayData = selectedDate ? calendarData[selectedDate] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Calendar</h2>
          <p className="text-muted-foreground text-sm mt-1">Click a date to view or manage bookings</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Booking
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        {(["available", "partial", "full"] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", STATUS_DOT[s])} />
            <span className="text-muted-foreground capitalize">
              {s === "available" ? "Available" : s === "partial" ? "Partially Occupied" : "Fully Sold Out"}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground">
              {MONTHS[month - 1]} {year}
            </h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (d === null) {
                  return <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-border/50 bg-muted/10" />;
                }
                const ds = dateStr(d);
                const dayData = calendarData[ds];
                const status = dayStatus(dayData);
                const isSelected = selectedDate === ds;
                const isToday = ds === today.toISOString().split("T")[0];

                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(isSelected ? null : ds)}
                    className={cn(
                      "min-h-[72px] border-b border-r border-border/50 p-2 text-left transition-all relative",
                      isSelected ? "ring-2 ring-inset ring-primary z-10" : "",
                      status === "available" && "hover:bg-green-50",
                      status === "partial" && "hover:bg-yellow-50",
                      status === "full" && "hover:bg-red-50",
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {d}
                    </div>
                    {dayData && dayData.count > 0 && (
                      <div className={cn("text-xs px-1.5 py-0.5 rounded-full border font-medium inline-flex items-center gap-1", STATUS_CLASSES[status])}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
                        {dayData.count} {dayData.count === 1 ? "booking" : "bookings"}
                      </div>
                    )}
                    {(!dayData || dayData.count === 0) && (
                      <div className="text-xs text-green-600 font-medium">Free</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Detail Panel */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          {selectedDate ? (
            <>
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
                  </h4>
                  {selectedDayData && selectedDayData.count > 0 ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedDayData.count} booking{selectedDayData.count > 1 ? "s" : ""} · {selectedDayData.guests} guests
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-0.5">No bookings — available</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => openAdd(selectedDate)} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!selectedDayData || selectedDayData.count === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No bookings on this day</p>
                  </div>
                ) : (
                  selectedDayData.bookings.map((b) => (
                    <div key={b.id} className="border border-border rounded-xl p-4 space-y-2 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{b.guestName}</p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", BOOKING_STATUS_COLORS[b.status])}>
                            {b.status}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {b.packageName && (
                          <p className="font-medium text-foreground">{b.packageName}</p>
                        )}
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {b.guests} adult{b.guests > 1 ? "s" : ""}{(b as any).kids > 0 ? `, ${(b as any).kids} kid${(b as any).kids > 1 ? "s" : ""}` : ""}
                        </div>
                        {b.guestEmail && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {b.guestEmail}
                          </div>
                        )}
                        {b.guestPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {b.guestPhone}
                          </div>
                        )}
                        {b.totalPrice && (
                          <p className="text-primary font-semibold">₹{b.totalPrice}</p>
                        )}
                        {b.notes && <p className="italic">{b.notes}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">Select a date</p>
              <p className="text-sm mt-1">Click any day on the calendar to view bookings</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingBooking ? "Edit Booking" : "New Booking"}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Guest Name *</label>
                  <Input value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.guestEmail} onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={form.guestPhone} onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Package / Room</label>
                  <Input value={form.packageName} onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))} placeholder="e.g. Royal Suite, Deluxe Cabin..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Check-in Date *</label>
                  <Input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Check-out Date *</label>
                  <Input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Adults</label>
                  <Input type="number" min={1} max={20} value={form.guests} onChange={e => setForm(f => ({ ...f, guests: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Kids (under 12)</label>
                  <Input type="number" min={0} max={20} value={form.kids} onChange={e => setForm(f => ({ ...f, kids: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Total Price (₹)</label>
                  <Input value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} placeholder="e.g. 15000" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as BookingStatus }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Notes</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requests, notes..." />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingBooking ? "Save Changes" : "Create Booking"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
