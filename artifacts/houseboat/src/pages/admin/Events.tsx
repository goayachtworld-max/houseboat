import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, PartyPopper, X, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


import { API_BASE as API } from "@/lib/api-config";

interface EventChargeable {
  name: string;
  price: number;
}

interface BoatEvent {
  id: number;
  name: string;
  description: string;
  image: string | null;
  amenities: string;
  chargeables: EventChargeable[];
  minHours: number;
  sortOrder: number;
  isActive: boolean;
}

const chargeableSchema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
});

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().default(""),
  amenities: z.string().default(""),
  chargeables: z.array(chargeableSchema).default([]),
  minHours: z.coerce.number().min(1, "Minimum 1 hour").default(2),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type EventForm = z.infer<typeof eventSchema>;

const EMPTY_FORM: EventForm = {
  name: "",
  description: "",
  amenities: "",
  chargeables: [],
  minHours: 2,
  sortOrder: 0,
  isActive: true,
};

export default function AdminEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: events = [], isLoading } = useQuery<BoatEvent[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const res = await fetch(`${API}/events`, { credentials: "include" });
      return res.json();
    },
  });

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: EMPTY_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "chargeables",
  });

  const openCreate = () => {
    setEditingId(null);
    setImagePreview("");
    setImageChanged(false);
    form.reset(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (event: BoatEvent) => {
    setEditingId(event.id);
    setImagePreview(event.image || "");
    setImageChanged(false);
    form.reset({
      name: event.name,
      description: event.description || "",
      amenities: event.amenities || "",
      chargeables: event.chargeables || [],
      minHours: event.minHours || 2,
      sortOrder: event.sortOrder || 0,
      isActive: event.isActive,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setImagePreview("");
    setImageChanged(false);
    form.reset(EMPTY_FORM);
  };

  const handleImageFile = async (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target?.result as string);
      setImageChanged(true);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToServer = async (dataUrl: string): Promise<string | null> => {
    if (!dataUrl.startsWith("data:")) return dataUrl;
    const res = await fetch(`${API}/gallery/upload-base64`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials: "include",
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  };

  const onSubmit = async (values: EventForm) => {
    let imageUrl: string | null = editingId
      ? (events.find(e => e.id === editingId)?.image ?? null)
      : null;

    if (imageChanged && imagePreview) {
      const uploaded = await uploadImageToServer(imagePreview);
      imageUrl = uploaded;
    } else if (imageChanged && !imagePreview) {
      imageUrl = null;
    }

    const payload = { ...values, image: imageUrl };

    const url = editingId ? `${API}/events/${editingId}` : `${API}/events`;
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      credentials: "include",
      method,
      headers: { "Content-Type": "application/json" },
      // credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast({ title: "Error", description: "Failed to save event.", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    toast({ title: editingId ? "Event updated" : "Event created" });
    closeDialog();
  };

  const toggleActive = async (event: BoatEvent) => {
    await fetch(`${API}/events/${event.id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // credentials: "include",
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    toast({ title: event.isActive ? "Event hidden" : "Event shown" });
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`${API}/events/${id}`, { method: "DELETE", credentials: "include" });
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    toast({ title: "Event deleted" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm">Manage bookable events shown on the Events page</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <PartyPopper className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm">Add events like Birthday Party, Anniversary, Bachelorette, etc.</p>
          <Button onClick={openCreate} variant="outline" className="mt-2 gap-2">
            <Plus className="w-4 h-4" /> Add First Event
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

              {event.image && (
                <img src={event.image} alt={event.name} className="w-16 h-12 object-cover rounded-lg shrink-0" />
              )}
              {!event.image && (
                <div className="w-16 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <PartyPopper className="w-6 h-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{event.name}</p>
                  <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                    Min {event.minHours}h
                  </span>
                  {event.chargeables.length > 0 && (
                    <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full">
                      {event.chargeables.length} add-on{event.chargeables.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{event.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(event)}
                  className={`p-2 rounded-lg transition-colors ${event.isActive ? "text-green-600 hover:bg-green-50" : "text-muted-foreground hover:bg-muted"}`}
                  title={event.isActive ? "Hide" : "Show"}
                >
                  {event.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(event)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Event" : "Add New Event"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* Name + Min Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <label className="text-sm font-medium">Event Name *</label>
                <Input {...form.register("name")} placeholder="e.g. Birthday Party" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <label className="text-sm font-medium">Minimum Duration (hours)</label>
                <Input type="number" min={1} {...form.register("minHours")} placeholder="2" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                {...form.register("description")}
                placeholder="Brief description of the event experience…"
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Image upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Event Photo</label>
              {imagePreview && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted mb-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(""); setImageChanged(true); }}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
              />
              {uploading && <p className="text-xs text-muted-foreground">Processing image…</p>}
            </div>

            {/* Amenities */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Included Amenities</label>
              <Textarea
                {...form.register("amenities")}
                placeholder="Enter each amenity on a new line or comma-separated&#10;e.g. Welcome drinks&#10;Flower decoration&#10;Sound system&#10;Dedicated crew"
                className="min-h-[100px] resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">One per line or comma-separated</p>
            </div>

            {/* Chargeables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Extra Chargeables (Add-ons)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => append({ name: "", price: 0 })}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No add-ons yet. Click "Add Item" to add chargeable extras.</p>
              )}

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...form.register(`chargeables.${index}.name`)}
                      placeholder="e.g. DJ Music, Photography"
                      className="flex-1"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
                      <Input
                        type="number"
                        min={0}
                        {...form.register(`chargeables.${index}.price`)}
                        placeholder="0"
                        className="pl-7 w-28"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sort order + Active */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sort Order</label>
                <Input type="number" {...form.register("sortOrder")} placeholder="0" />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register("isActive")}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Show on Events page</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1 gap-2">
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
