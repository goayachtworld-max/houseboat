import { useState } from "react";
import { useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Loader2, Activity as ActivityIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as LucideIcons from "lucide-react";


import { API_BASE as API } from "@/lib/api-config";

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().default("Activity"),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type ActivityForm = z.infer<typeof activitySchema>;

const COMMON_ICONS = [
  "Anchor", "Waves", "Wind", "Sun", "Coffee", "Utensils", "Bike", "Ship",
  "Fish", "Tent", "Compass", "Camera", "Star", "Sunset", "Sailboat",
  "Activity", "Zap", "Mountain", "TreePalm", "Flame",
];

export default function AdminActivities() {
  const { data: activities = [], isLoading } = useListActivities();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);

  const createMutation = useCreateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        toast({ title: "Activity created" });
        closeDialog();
      },
      onError: () => toast({ title: "Error", description: "Failed to create activity.", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        toast({ title: "Activity updated" });
        closeDialog();
      },
      onError: () => toast({ title: "Error", description: "Failed to update activity.", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        toast({ title: "Activity deleted" });
      },
      onError: () => toast({ title: "Error", description: "Failed to delete activity.", variant: "destructive" }),
    },
  });

  const form = useForm<ActivityForm>({ resolver: zodResolver(activitySchema) });
  const watchedIcon = form.watch("icon") || "Activity";

  function openNew() {
    setEditingId(null);
    setImagePreview("");
    setImageChanged(false);
    form.reset({ name: "", description: "", icon: "Activity", sortOrder: activities.length, isActive: true });
    setIsDialogOpen(true);
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setImagePreview(a.image || "");
    setImageChanged(false);
    form.reset({
      name: a.name,
      description: a.description,
      icon: a.icon || "Activity",
      sortOrder: a.sortOrder ?? 0,
      isActive: a.isActive ?? true,
    });
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

  const onSubmit = (data: ActivityForm) => {
    const payload = { ...data, image: imageChanged ? imagePreview : undefined };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload as any });
    } else {
      createMutation.mutate({ data: { ...payload, image: imagePreview || undefined } as any });
    }
  };

  const toggleActive = (a: any) => {
    updateMutation.mutate({ id: a.id, data: { isActive: !a.isActive } as any });
  };

  const sorted = [...activities].sort((a, b) => a.sortOrder - b.sortOrder);

  const IconPreview = (LucideIcons as any)[watchedIcon] || ActivityIcon;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage activities shown on the Activities page and Home page
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Activity
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <ActivityIcon className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No activities yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first activity to display it on the website</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Add Activity
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((activity) => {
            const Icon = (LucideIcons as any)[activity.icon] || ActivityIcon;
            return (
              <div
                key={activity.id}
                className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-opacity ${activity.isActive ? "border-border" : "opacity-60 border-dashed"}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />

                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                {activity.image && (
                  <img
                    src={activity.image}
                    alt={activity.name}
                    className="w-14 h-10 object-cover rounded-lg shrink-0 border border-border"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{activity.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {activity.isActive ? "Visible" : "Hidden"}
                  </span>
                  <button
                    onClick={() => toggleActive(activity)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title={activity.isActive ? "Hide" : "Show"}
                  >
                    {activity.isActive ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                  </button>
                  <button
                    onClick={() => openEdit(activity)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${activity.name}"?`)) {
                        deleteMutation.mutate({ id: activity.id });
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Activity" : "New Activity"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input {...form.register("name")} placeholder="e.g. Kayaking" className="mt-1" />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea {...form.register("description")} placeholder="Short description..." className="mt-1 min-h-[80px]" />
              {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Icon</label>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IconPreview className="w-5 h-5 text-primary" />
                </div>
                <Input {...form.register("icon")} placeholder="e.g. Anchor" className="flex-1" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ICONS.map(name => {
                  const Ic = (LucideIcons as any)[name] || ActivityIcon;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => form.setValue("icon", name)}
                      title={name}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${watchedIcon === name ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-primary/10 border-transparent"}`}
                    >
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Image (optional)</label>
              <div className="mt-1 space-y-2">
                {imagePreview && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(""); setImageChanged(true); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      ×
                    </button>
                  </div>
                )}
                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {imagePreview ? "Change image" : "Upload image"}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input type="number" {...form.register("sortOrder")} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Visibility</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="checkbox" id="isActive" {...form.register("isActive")} className="w-4 h-4 accent-primary" />
                  <label htmlFor="isActive" className="text-sm text-muted-foreground">Show on website</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId !== null ? "Save Changes" : "Create Activity"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
