import { useState } from "react";
import { authHeaders } from "@/hooks/use-admin-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, HelpCircle, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


import { API_BASE as API } from "@/lib/api-config";

interface Faq {
  id: number;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
}

const FAQS_KEY = ["admin-faqs"];

const DEFAULT_FAQS = [
  { question: "How can I book the overnight houseboat trip in Goa / Chapora river?", answer: "To book the overnight houseboat trip or Riceboat trip, you can just send me an email with your required dates and the number of pax and I will get back to you with the availability." },
  { question: "If I have booked the overnight Riceboat trip can it be cancelled?", answer: "Yes, cancellations are possible. Please contact us at least 48 hours before your scheduled trip for a full refund. Cancellations within 48 hours may be subject to a cancellation fee." },
  { question: "What is included in the price for the overnight Goan Rice boat trip?", answer: "The price includes accommodation for the night, all meals (dinner and breakfast), welcome drinks, and access to all onboard facilities. Water sports and additional activities are available at extra cost." },
  { question: "Does the rooms in the Goan overnight boat trip include Air Conditioner?", answer: "Yes, all rooms on the houseboat are fully air-conditioned to ensure your comfort throughout the night." },
  { question: "Can we include an extra person in a single room?", answer: "Yes, an extra mattress can be arranged in the room for an additional charge. Please inform us in advance so we can make the necessary arrangements." },
  { question: "How much time does it take to reach from Candolim to the houseboat at Chapora?", answer: "It typically takes about 45 minutes to 1 hour to reach Chapora river from Candolim by road. We can also assist with arranging transportation if needed." },
];

export default function AdminFaqs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: faqs = [], isLoading } = useQuery<Faq[]>({
    queryKey: FAQS_KEY,
    queryFn: async () => {
      const res = await fetch(`${API}/faqs`, { ...authHeaders() });
      return res.json();
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", sortOrder: 0, isActive: true });

  function openNew() {
    setEditingId(null);
    setForm({ question: "", answer: "", sortOrder: faqs.length, isActive: true });
    setIsDialogOpen(true);
  }

  function openEdit(f: Faq) {
    setEditingId(f.id);
    setForm({ question: f.question, answer: f.answer, sortOrder: f.sortOrder, isActive: f.isActive });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) };
      const res = editingId !== null
        ? await fetch(`${API}/faqs/${editingId}`, { ...authHeaders(),  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`${API}/faqs`, { ...authHeaders(),  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: FAQS_KEY });
      toast({ title: editingId !== null ? "FAQ updated" : "FAQ added" });
      closeDialog();
    } catch {
      toast({ title: "Error", description: "Failed to save FAQ.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: Faq) => {
    await fetch(`${API}/faqs/${f.id}`, { ...authHeaders(), 
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !f.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: FAQS_KEY });
  };

  const handleDelete = async (f: Faq) => {
    if (!confirm(`Delete this FAQ?\n\n"${f.question}"`)) return;
    const res = await fetch(`${API}/faqs/${f.id}`, { ...authHeaders(),  method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: FAQS_KEY });
      toast({ title: "FAQ deleted" });
    }
  };

  const seedDefaults = async () => {
    if (!confirm("This will add the 6 default FAQs based on common houseboat questions. Continue?")) return;
    setSeeding(true);
    try {
      for (let i = 0; i < DEFAULT_FAQS.length; i++) {
        await fetch(`${API}/faqs`, { ...authHeaders(), 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...DEFAULT_FAQS[i], sortOrder: faqs.length + i, isActive: true }),
        });
      }
      queryClient.invalidateQueries({ queryKey: FAQS_KEY });
      toast({ title: "Default FAQs added", description: "6 FAQs have been added. You can now edit them." });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const sorted = [...faqs].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage FAQ items displayed on the website
          </p>
        </div>
        <div className="flex items-center gap-2">
          {faqs.length === 0 && (
            <Button variant="outline" onClick={seedDefaults} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
              Add Default FAQs
            </Button>
          )}
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Active FAQs are displayed in the <strong className="text-foreground">FAQ section</strong> on the homepage in an accordion layout. Use the sort order to control the display sequence.
        </p>
      </div>

      {/* Empty state */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No FAQs added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first FAQ or use the default questions to get started quickly.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={seedDefaults} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Default FAQs
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((faq, idx) => (
            <div
              key={faq.id}
              className={`bg-card border rounded-xl p-4 flex items-start gap-4 transition-opacity ${faq.isActive ? "border-border" : "opacity-60 border-dashed"}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" />
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{faq.question}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${faq.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {faq.isActive ? "Visible" : "Hidden"}
                </span>
                <button onClick={() => toggleActive(faq)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={faq.isActive ? "Hide" : "Show"}>
                  {faq.isActive ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                </button>
                <button onClick={() => openEdit(faq)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(faq)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Question *</label>
              <Input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="e.g. How can I book the overnight houseboat trip?"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Answer *</label>
              <Textarea
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="Write a clear, helpful answer..."
                className="mt-1 min-h-[120px]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Visibility</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="isActive" className="text-sm text-muted-foreground">Show on website</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId !== null ? "Save Changes" : "Add FAQ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
