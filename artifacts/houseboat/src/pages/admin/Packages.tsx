import { useState } from "react";
import { useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, getListPackagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Tag, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  pricePerNight: z.string().min(1, "Offer price is required"),
  mrpPerNight: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity required"),
  inclusions: z.string(),
  images: z.string(),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type PackageForm = z.infer<typeof packageSchema>;

function fmt(val: string | null | undefined) {
  const n = parseFloat(val ?? "");
  if (isNaN(n)) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function DiscountPreview({ price, mrp }: { price: string; mrp: string }) {
  const p = parseFloat(price);
  const m = parseFloat(mrp);
  if (!mrp || isNaN(p) || isNaN(m) || m <= p) return null;
  const disc = Math.round(((m - p) / m) * 100);
  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
      <TrendingDown className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
      <div className="text-sm space-y-0.5">
        <p className="text-muted-foreground line-through text-xs">MRP: ₹{m.toLocaleString("en-IN")}/night</p>
        <p className="text-green-700 font-bold">Offer: ₹{p.toLocaleString("en-IN")}/night</p>
        <p className="text-green-600 font-semibold">{disc}% OFF — this is how it'll look on the website</p>
      </div>
    </div>
  );
}

export default function AdminPackages() {
  const { data: packages = [], isLoading } = useListPackages();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const createMutation = useCreatePackage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Success", description: "Package created" });
      }
    }
  });

  const updateMutation = useUpdatePackage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Success", description: "Package updated" });
      }
    }
  });

  const deleteMutation = useDeletePackage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        toast({ title: "Deleted", description: "Package removed" });
      }
    }
  });

  const form = useForm<PackageForm>({
    resolver: zodResolver(packageSchema),
    defaultValues: { isActive: true, sortOrder: 0, inclusions: "", images: "", mrpPerNight: "" }
  });

  const watchedPrice = useWatch({ control: form.control, name: "pricePerNight" });
  const watchedMrp = useWatch({ control: form.control, name: "mrpPerNight" });

  const openEdit = (pkg: any) => {
    setEditingId(pkg.id);
    form.reset({
      name: pkg.name,
      description: pkg.description,
      pricePerNight: pkg.pricePerNight,
      mrpPerNight: pkg.mrpPerNight || "",
      capacity: pkg.capacity,
      inclusions: pkg.inclusions?.join(", ") || "",
      images: pkg.images?.join(", ") || "",
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", pricePerNight: "", mrpPerNight: "", capacity: 2, inclusions: "", images: "", sortOrder: 0, isActive: true });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PackageForm) => {
    const payload = {
      ...data,
      mrpPerNight: data.mrpPerNight || undefined,
      inclusions: data.inclusions.split(",").map(s => s.trim()).filter(Boolean),
      images: data.images.split(",").map(s => s.trim()).filter(Boolean),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  if (isLoading) return <div>Loading packages...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Packages</h2>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Package</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Offer Price / Night</th>
              <th className="px-6 py-4 font-medium">MRP / Night</th>
              <th className="px-6 py-4 font-medium">Discount</th>
              <th className="px-6 py-4 font-medium">Capacity</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {packages.map(pkg => {
              const price = parseFloat(pkg.pricePerNight);
              const mrp = parseFloat((pkg as any).mrpPerNight ?? "");
              const hasDiscount = !isNaN(price) && !isNaN(mrp) && mrp > price;
              const disc = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : null;

              return (
                <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{pkg.name}</td>
                  <td className="px-6 py-4 font-semibold text-green-700">
                    {fmt(pkg.pricePerNight) ?? pkg.pricePerNight}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {(pkg as any).mrpPerNight
                      ? <span className="line-through">{fmt((pkg as any).mrpPerNight) ?? (pkg as any).mrpPerNight}</span>
                      : <span className="text-xs text-muted-foreground/50">—</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    {disc !== null
                      ? <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full"><Tag className="w-3 h-3" />{disc}% OFF</span>
                      : <span className="text-xs text-muted-foreground/50">—</span>
                    }
                  </td>
                  <td className="px-6 py-4">{pkg.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="danger" size="sm" onClick={() => {
                      if (window.confirm("Delete this package?")) deleteMutation.mutate({ id: pkg.id });
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Package" : "Create Package"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...form.register("name")} />
              </div>

              {/* Pricing side by side */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Offer Price / Night (INR)
                </label>
                <Input {...form.register("pricePerNight")} placeholder="e.g. 12000" />
                <p className="text-xs text-muted-foreground">The actual price guests will pay</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  MRP / Night (INR)
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input {...form.register("mrpPerNight")} placeholder="e.g. 18000" />
                <p className="text-xs text-muted-foreground">Original price — shown crossed out</p>
              </div>
            </div>

            {/* Live discount preview */}
            <DiscountPreview price={watchedPrice} mrp={watchedMrp ?? ""} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capacity (Max Guests)</label>
                <Input type="number" {...form.register("capacity")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input type="number" {...form.register("sortOrder")} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea {...form.register("description")} className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inclusions (comma separated)</label>
              <Input {...form.register("inclusions")} placeholder="Breakfast, WiFi, Kayaking" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image URLs (comma separated)</label>
              <Input {...form.register("images")} placeholder="https://..." />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="isActive" {...form.register("isActive")} className="w-4 h-4" />
              <label htmlFor="isActive" className="text-sm font-medium">Active (visible on website)</label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save Package</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
