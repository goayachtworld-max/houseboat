import { useState, useEffect } from "react";
import { authHeaders } from "@/hooks/use-admin-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Trophy, Link as LinkIcon, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


import { API_BASE as API } from "@/lib/api-config";

interface Award {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
}

const AWARDS_KEY = ["awards"];

export default function AdminAwards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: awards = [], isLoading } = useQuery<Award[]>({
    queryKey: AWARDS_KEY,
    queryFn: async () => {
      const res = await fetch(`${API}/awards`, { ...authHeaders() });
      return res.json();
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    link: "",
    sortOrder: 0,
    isActive: true,
  });

  function openNew() {
    setEditingId(null);
    setImagePreview("");
    setImageChanged(false);
    setForm({ title: "", subtitle: "", link: "", sortOrder: awards.length, isActive: true });
    setIsDialogOpen(true);
  }

  function openEdit(a: Award) {
    setEditingId(a.id);
    setImagePreview(a.image || "");
    setImageChanged(false);
    setForm({ title: a.title, subtitle: a.subtitle || "", link: a.link || "", sortOrder: a.sortOrder, isActive: a.isActive });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
    setImagePreview("");
    setImageChanged(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setImageChanged(true);
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder),
        image: imageChanged ? imagePreview || null : undefined,
      };
      const res = editingId !== null
        ? await fetch(`${API}/awards/${editingId}`, { ...authHeaders(),  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`${API}/awards`, { ...authHeaders(),  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, image: imagePreview || undefined }) });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: AWARDS_KEY });
      toast({ title: editingId !== null ? "Award updated" : "Award added" });
      closeDialog();
    } catch {
      toast({ title: "Error", description: "Failed to save award.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: Award) => {
    const res = await fetch(`${API}/awards/${a.id}`, { ...authHeaders(), 
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    if (res.ok) queryClient.invalidateQueries({ queryKey: AWARDS_KEY });
  };

  const handleDelete = async (a: Award) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    const res = await fetch(`${API}/awards/${a.id}`, { ...authHeaders(),  method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: AWARDS_KEY });
      toast({ title: "Award deleted" });
    }
  };

  const sorted = [...awards].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Awards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage awards and certifications displayed in the website footer
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Award
        </Button>
      </div>

      {/* Preview note */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Active awards are shown in the <strong className="text-foreground">Recognition</strong> section at the bottom of every page. Upload badge images from TripAdvisor, Booking.com, or any certification body.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No awards added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first award or certification to display it in the footer</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Add Award
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((award) => (
            <div
              key={award.id}
              className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-opacity ${award.isActive ? "border-border" : "opacity-60 border-dashed"}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />

              {award.image ? (
                <img
                  src={award.image}
                  alt={award.title}
                  className="w-14 h-14 object-contain rounded-lg border border-border bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{award.title}</p>
                {award.subtitle && <p className="text-sm text-muted-foreground truncate">{award.subtitle}</p>}
                {award.link && (
                  <a href={award.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5 truncate hover:underline">
                    <LinkIcon className="w-3 h-3 shrink-0" />
                    {award.link}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${award.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {award.isActive ? "Visible" : "Hidden"}
                </span>
                <button onClick={() => toggleActive(award)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={award.isActive ? "Hide" : "Show"}>
                  {award.isActive ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                </button>
                <button onClick={() => openEdit(award)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(award)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Award" : "Add Award"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Award / Recognition Title *</label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. TripAdvisor Travelers' Choice 2025"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Subtitle / Description</label>
              <Textarea
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="e.g. Rated Excellent by 200+ travellers"
                className="mt-1 min-h-[60px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Badge / Logo Image</label>
              <div className="mt-1 space-y-2">
                {imagePreview && (
                  <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-border bg-white flex items-center justify-center p-2">
                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(""); setImageChanged(true); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {imagePreview ? "Change image" : "Upload badge image"}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Link URL (optional)</label>
              <Input
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://tripadvisor.com/..."
                className="mt-1"
                type="url"
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
                  <label htmlFor="isActive" className="text-sm text-muted-foreground">Show in footer</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId !== null ? "Save Changes" : "Add Award"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
