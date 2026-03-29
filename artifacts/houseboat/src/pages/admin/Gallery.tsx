import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  useListGallery,
  useAddGalleryImage,
  useDeleteGalleryImage,
  getListGalleryQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  ImageIcon,
  Crop,
  Maximize2,
  RefreshCw,
  CheckCircle,
  X,
  Plus,
  Save,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── shared image-editor types ─────────────────────────────────────────────

type ConvertFmt = "image/jpeg" | "image/png" | "image/webp";

interface EditorState {
  dataUrl: string;
  originalDataUrl: string;
  format: ConvertFmt;
}

function scaleDown(dataUrl: string, maxPx = 1400): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

// ─── ImageEditor component ──────────────────────────────────────────────────

interface ImageEditorProps {
  state: EditorState;
  onChange: (s: EditorState) => void;
  onRemove: () => void;
}

function ImageEditor({ state, onChange, onRemove }: ImageEditorProps) {
  const [tab, setTab] = useState<"crop" | "resize" | "convert">("crop");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeW, setResizeW] = useState("");
  const [resizeH, setResizeH] = useState("");
  const [lockAR, setLockAR] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load image dims
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setResizeW(String(img.width));
      setResizeH(String(img.height));
    };
    img.src = state.dataUrl;
  }, [state.dataUrl]);

  const getRelPos = (e: React.MouseEvent) => {
    const el = previewRef.current!;
    const rect = el.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (tab !== "crop") return;
    const pos = getRelPos(e);
    setDragStart(pos);
    setDragging(true);
    setCropRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const pos = getRelPos(e);
    setCropRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  };
  const onMouseUp = () => setDragging(false);

  const applyCrop = () => {
    if (!cropRect || !imgRef.current) return;
    const img = imgRef.current;
    const sx = (cropRect.x / 100) * img.width;
    const sy = (cropRect.y / 100) * img.height;
    const sw = (cropRect.w / 100) * img.width;
    const sh = (cropRect.h / 100) * img.height;
    if (sw < 4 || sh < 4) return;
    const c = document.createElement("canvas");
    c.width = Math.round(sw); c.height = Math.round(sh);
    c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = c.toDataURL(state.format, 0.9);
    setCropRect(null);
    onChange({ ...state, dataUrl: out });
  };

  const applyResize = () => {
    if (!imgRef.current) return;
    const w = parseInt(resizeW), h = parseInt(resizeH);
    if (!w || !h) return;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(imgRef.current, 0, 0, w, h);
    onChange({ ...state, dataUrl: c.toDataURL(state.format, 0.9) });
  };

  const applyConvert = (fmt: ConvertFmt) => {
    if (!imgRef.current) return;
    const c = document.createElement("canvas");
    c.width = imgRef.current.width; c.height = imgRef.current.height;
    c.getContext("2d")!.drawImage(imgRef.current, 0, 0);
    onChange({ ...state, dataUrl: c.toDataURL(fmt, 0.9), format: fmt });
  };

  const handleResizeWChange = (v: string) => {
    setResizeW(v);
    if (lockAR && imgRef.current && parseInt(v)) {
      setResizeH(String(Math.round(imgRef.current.height * (parseInt(v) / imgRef.current.width))));
    }
  };
  const handleResizeHChange = (v: string) => {
    setResizeH(v);
    if (lockAR && imgRef.current && parseInt(v)) {
      setResizeW(String(Math.round(imgRef.current.width * (parseInt(v) / imgRef.current.height))));
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-muted border-b text-xs flex-wrap">
        {(["crop", "resize", "convert"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-colors capitalize",
              tab === t ? "bg-primary text-white" : "hover:bg-background"
            )}
          >
            {t === "crop" && <Crop className="inline w-3 h-3 mr-1" />}
            {t === "resize" && <Maximize2 className="inline w-3 h-3 mr-1" />}
            {t === "convert" && <RefreshCw className="inline w-3 h-3 mr-1" />}
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => onChange({ ...state, dataUrl: state.originalDataUrl })}
            className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-background flex items-center gap-1"
            title="Reset to original"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={onRemove}
            className="px-2 py-1 rounded text-destructive hover:bg-destructive/10 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      </div>

      {/* Preview */}
      <div
        ref={previewRef}
        className="relative w-full bg-neutral-900 select-none overflow-hidden"
        style={{ height: 200, cursor: tab === "crop" ? "crosshair" : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img src={state.dataUrl} className="w-full h-full object-contain" alt="Edit preview" />
        <canvas ref={canvasRef} className="hidden" />
        {cropRect && tab === "crop" && (
          <div
            className="absolute border-2 border-white/80 bg-white/10"
            style={{
              left: `${cropRect.x}%`,
              top: `${cropRect.y}%`,
              width: `${cropRect.w}%`,
              height: `${cropRect.h}%`,
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-3">
        {tab === "crop" && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground flex-1">
              {cropRect ? "Drag to adjust selection" : "Drag on image to select area"}
            </p>
            {cropRect && (
              <Button size="sm" onClick={applyCrop} className="text-xs h-7">
                <CheckCircle className="w-3 h-3 mr-1" /> Apply Crop
              </Button>
            )}
          </div>
        )}
        {tab === "resize" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Label className="text-xs">W</Label>
              <Input className="h-7 w-20 text-xs" value={resizeW} onChange={(e) => handleResizeWChange(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs">H</Label>
              <Input className="h-7 w-20 text-xs" value={resizeH} onChange={(e) => handleResizeHChange(e.target.value)} />
            </div>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={lockAR} onChange={(e) => setLockAR(e.target.checked)} className="w-3 h-3" />
              Lock AR
            </label>
            <Button size="sm" onClick={applyResize} className="text-xs h-7">
              <CheckCircle className="w-3 h-3 mr-1" /> Apply
            </Button>
          </div>
        )}
        {tab === "convert" && (
          <div className="flex gap-2 flex-wrap">
            {(["image/jpeg", "image/png", "image/webp"] as ConvertFmt[]).map((fmt) => (
              <Button
                key={fmt}
                size="sm"
                variant={state.format === fmt ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => applyConvert(fmt)}
              >
                {fmt.split("/")[1].toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AdminGallery page ────────────────────────────────────────────────

const GALLERY_CATEGORIES = ["general", "houseboat", "dining", "activities", "guests"];

export default function AdminGallery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"banner" | "gallery">("banner");

  // ── Hero Banner ─────────────────────────────────────────────────────────
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [bannerEditor, setBannerEditor] = useState<EditorState | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const currentHero = settings?.heroImage || `${import.meta.env.BASE_URL}images/hero.png`;

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const scaled = await scaleDown(raw, 1600);
      setBannerEditor({ dataUrl: scaled, originalDataUrl: scaled, format: "image/jpeg" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const saveBanner = async () => {
    if (!bannerEditor) return;
    setSavingBanner(true);
    try {
      await updateSettings.mutateAsync({ heroImage: bannerEditor.dataUrl } as any);
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      setBannerEditor(null);
      toast({ title: "Banner saved", description: "Hero image updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save banner.", variant: "destructive" });
    } finally {
      setSavingBanner(false);
    }
  };

  // ── Gallery Photos ───────────────────────────────────────────────────────
  const { data: galleryItems = [], isLoading: galleryLoading } = useListGallery();
  const addImage = useAddGalleryImage();
  const deleteImage = useDeleteGalleryImage();

  interface NewPhoto {
    editor: EditorState;
    caption: string;
    category: string;
  }
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingGallery, setSavingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        const scaled = await scaleDown(raw, 1400);
        setNewPhotos((prev) => [
          ...prev,
          {
            editor: { dataUrl: scaled, originalDataUrl: scaled, format: "image/jpeg" },
            caption: "",
            category: "general",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const updateNewPhoto = (idx: number, patch: Partial<NewPhoto>) => {
    setNewPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removeNewPhoto = (idx: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveNewPhotos = async () => {
    if (!newPhotos.length) return;
    setSavingGallery(true);
    try {
      for (const photo of newPhotos) {
        await addImage.mutateAsync({
          url: photo.editor.dataUrl,
          caption: photo.caption || null,
          category: photo.category,
          sortOrder: galleryItems.length,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListGalleryQueryKey() });
      setNewPhotos([]);
      toast({ title: "Photos saved", description: `${newPhotos.length} photo(s) added to gallery.` });
    } catch {
      toast({ title: "Error", description: "Failed to save photos.", variant: "destructive" });
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteImage.mutateAsync({ id } as any);
      queryClient.invalidateQueries({ queryKey: getListGalleryQueryKey() });
      toast({ title: "Deleted", description: "Photo removed from gallery." });
    } catch {
      toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Gallery Management</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Update the home page hero banner and manage gallery photos.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-0">
        {([
          { id: "banner", label: "Hero Banner" },
          { id: "gallery", label: "Gallery Photos" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Hero Banner Tab ──────────────────────────────────────────── */}
      {activeTab === "banner" && (
        <div className="space-y-5">
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Current Hero Banner
            </div>
            <div className="relative w-full" style={{ height: 280 }}>
              <img
                src={currentHero}
                alt="Current hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <span className="text-white text-sm font-medium drop-shadow">
                  Home page hero / banner image
                </span>
              </div>
            </div>
          </div>

          {bannerEditor ? (
            <div className="space-y-4">
              <ImageEditor
                state={bannerEditor}
                onChange={(s) => setBannerEditor(s)}
                onRemove={() => setBannerEditor(null)}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setBannerEditor(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={saveBanner} disabled={savingBanner} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {savingBanner ? "Saving…" : "Save Banner"}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed flex flex-col gap-1"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload a new banner image
                </span>
                <span className="text-xs text-muted-foreground/60">
                  Supports crop, resize and convert after upload
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Gallery Photos Tab ───────────────────────────────────────── */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          {/* Existing photos grid */}
          {galleryLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading gallery…</div>
          ) : galleryItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No gallery photos yet. Add your first photo below.
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Published Photos ({galleryItems.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryItems.map((img) => (
                  <div key={img.id} className="group relative rounded-lg overflow-hidden border shadow-sm bg-muted aspect-square">
                    <img
                      src={img.url}
                      alt={img.caption || "Gallery"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                      {img.caption && (
                        <p className="text-white text-xs text-center line-clamp-2 mb-1">{img.caption}</p>
                      )}
                      <span className="text-white/70 text-xs capitalize bg-black/30 px-2 py-0.5 rounded-full">
                        {img.category}
                      </span>
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingId === img.id}
                        className="mt-2 flex items-center gap-1 bg-destructive text-white text-xs px-3 py-1 rounded-full hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === img.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New photos staging area */}
          {newPhotos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                New Photos — Staging ({newPhotos.length})
              </h2>
              <div className="space-y-6">
                {newPhotos.map((photo, idx) => (
                  <div key={idx} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-muted border-b flex items-center justify-between">
                      <span className="text-sm font-medium">Photo {idx + 1}</span>
                      <button onClick={() => removeNewPhoto(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <ImageEditor
                        state={photo.editor}
                        onChange={(s) => updateNewPhoto(idx, { editor: s })}
                        onRemove={() => removeNewPhoto(idx)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Caption (optional)</Label>
                          <Input
                            value={photo.caption}
                            onChange={(e) => updateNewPhoto(idx, { caption: e.target.value })}
                            placeholder="e.g. Sunset view from deck"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Category</Label>
                          <select
                            value={photo.category}
                            onChange={(e) => updateNewPhoto(idx, { category: e.target.value })}
                            className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                          >
                            {GALLERY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setNewPhotos([])} className="flex-1">
                  <X className="w-4 h-4 mr-2" /> Discard All
                </Button>
                <Button onClick={saveNewPhotos} disabled={savingGallery} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {savingGallery ? "Saving…" : `Save ${newPhotos.length} Photo${newPhotos.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <Button
              variant="outline"
              className="w-full h-20 border-dashed flex flex-col gap-1"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Add photos to gallery (select multiple at once)
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
