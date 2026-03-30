import { useState, useRef, useCallback, useEffect } from "react";
import { authHeaders } from "@/hooks/use-admin-auth";
import {
  useListPendingBlogPosts, useListBlogPosts, useApproveBlogPost, useDeleteBlogPost,
  getListPendingBlogPostsQueryKey, getListBlogPostsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Trash2, Eye, Plus, X, Upload, Crop, Maximize2,
  RefreshCw, FileImage, Hash, Link2, User, Type, AlignLeft, Send, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";


import { API_BASE as API } from "@/lib/api-config";
const MAX_PHOTOS = 5;
const MAX_DIM = 1200;

type Tab = "create" | "pending" | "published";
type Format = "image/jpeg" | "image/png" | "image/webp";

// ─── Image Editor ─────────────────────────────────────────────────────────────
interface CropRect { x: number; y: number; w: number; h: number }

interface ImageEditorProps {
  index: number;
  onResult: (dataUrl: string) => void;
  onRemove: () => void;
  initialSrc?: string;
}

function ImageEditor({ index, onResult, onRemove, initialSrc }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(initialSrc || null);
  const [displaySrc, setDisplaySrc] = useState<string | null>(initialSrc || null);
  const [mode, setMode] = useState<"view" | "crop" | "resize">("view");
  const [format, setFormat] = useState<Format>("image/jpeg");
  const [resizeW, setResizeW] = useState(800);
  const [resizeH, setResizeH] = useState(600);
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTools, setShowTools] = useState(false);

  // Scale factors between natural image size and display size
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Auto-scale large images
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      }
      setNaturalSize({ w, h });
      setResizeW(w);
      setResizeH(h);
      setAspectRatio(w / h);
      renderToCanvas(img, 0, 0, img.naturalWidth, img.naturalHeight, w, h, format, src);
    };
    img.src = src;
  }, [format]);

  function renderToCanvas(
    img: HTMLImageElement,
    sx: number, sy: number, sw: number, sh: number,
    dw: number, dh: number,
    fmt: Format,
    fallbackSrc: string
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d")!;
    if (fmt === "image/png" || fmt === "image/webp") {
      ctx.clearRect(0, 0, dw, dh);
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, dw, dh);
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    const quality = fmt === "image/png" ? undefined : 0.88;
    const result = canvas.toDataURL(fmt, quality);
    setDisplaySrc(result);
    onResult(result);
  }

  useEffect(() => {
    if (originalSrc) loadImage(originalSrc);
  }, [originalSrc]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setOriginalSrc(src);
      setMode("view");
      setCrop(null);
    };
    reader.readAsDataURL(file);
  }

  // Display dimensions capped for the preview pane
  const previewW = Math.min(naturalSize.w, 260);
  const previewH = naturalSize.w > 0 ? Math.round(naturalSize.h * previewW / naturalSize.w) : 160;

  // Map display coords → natural image coords
  const toNatural = (px: number, py: number) => ({
    x: Math.round(px * naturalSize.w / previewW),
    y: Math.round(py * naturalSize.h / previewH),
  });

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "crop") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setCrop({ x, y, w: 0, h: 0 });
    setDragging(true);
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging || mode !== "crop") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrop({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    });
  }
  function onMouseUp() { setDragging(false); }

  function applyCrop() {
    if (!crop || !imgRef.current || crop.w < 5 || crop.h < 5) return;
    const nat = toNatural(crop.x, crop.y);
    const natEnd = toNatural(crop.x + crop.w, crop.y + crop.h);
    const sw = natEnd.x - nat.x;
    const sh = natEnd.y - nat.y;
    renderToCanvas(imgRef.current, nat.x, nat.y, sw, sh, sw, sh, format, originalSrc!);
    setNaturalSize({ w: sw, h: sh });
    setResizeW(sw);
    setResizeH(sh);
    setAspectRatio(sw / sh);
    setCrop(null);
    setMode("view");
  }

  function applyResize() {
    if (!imgRef.current) return;
    renderToCanvas(imgRef.current, 0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight, resizeW, resizeH, format, originalSrc!);
    setNaturalSize({ w: resizeW, h: resizeH });
    setMode("view");
  }

  function applyFormat(fmt: Format) {
    setFormat(fmt);
    if (!imgRef.current) return;
    renderToCanvas(imgRef.current, 0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight, naturalSize.w, naturalSize.h, fmt, originalSrc!);
  }

  function reset() {
    if (!originalSrc) return;
    loadImage(originalSrc);
    setCrop(null);
    setMode("view");
  }

  const ext: Record<Format, string> = { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WebP" };

  if (!displaySrc) {
    return (
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">Photo {index + 1}</span>
        <span className="text-xs text-muted-foreground/60 mt-0.5">Click to upload</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Preview */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-muted/20 flex items-center justify-center"
        style={{ width: previewW, height: previewH, cursor: mode === "crop" ? "crosshair" : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img src={displaySrc} alt="" style={{ width: previewW, height: previewH, objectFit: "cover", userSelect: "none", pointerEvents: "none" }} />
        {mode === "crop" && crop && crop.w > 2 && (
          <div
            style={{ position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h, border: "2px solid #f59e0b", background: "rgba(245,158,11,0.15)", pointerEvents: "none" }}
          />
        )}
        <button onClick={onRemove} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Tool bar */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowTools(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-1.5"><FileImage className="w-3.5 h-3.5" /> Edit Tools</span>
          {showTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTools && (
          <div className="px-3 pb-3 space-y-3 border-t border-border/50 bg-muted/10">
            {/* Mode toggle */}
            <div className="flex gap-1 pt-2">
              {(["view", "crop", "resize"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors capitalize", mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {m === "crop" ? <><Crop className="w-3 h-3 inline mr-1" />Crop</> : m === "resize" ? <><Maximize2 className="w-3 h-3 inline mr-1" />Resize</> : "Preview"}
                </button>
              ))}
            </div>

            {/* Crop instructions */}
            {mode === "crop" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Drag on the image above to select the crop area</p>
                <Button size="sm" className="w-full h-7 text-xs" onClick={applyCrop} disabled={!crop || crop.w < 5}>Apply Crop</Button>
              </div>
            )}

            {/* Resize controls */}
            {mode === "resize" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Width (px)</label>
                    <Input type="number" value={resizeW} min={10} max={3000}
                      onChange={e => {
                        const w = Number(e.target.value);
                        setResizeW(w);
                        if (keepAspect) setResizeH(Math.round(w / aspectRatio));
                      }}
                      className="h-7 text-xs" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Height (px)</label>
                    <Input type="number" value={resizeH} min={10} max={3000}
                      onChange={e => {
                        const h = Number(e.target.value);
                        setResizeH(h);
                        if (keepAspect) setResizeW(Math.round(h * aspectRatio));
                      }}
                      className="h-7 text-xs" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={keepAspect} onChange={e => setKeepAspect(e.target.checked)} className="rounded" />
                  Lock aspect ratio
                </label>
                <Button size="sm" className="w-full h-7 text-xs" onClick={applyResize}>Apply Resize</Button>
              </div>
            )}

            {/* Convert format */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Convert Format</label>
              <div className="flex gap-1">
                {(["image/jpeg", "image/png", "image/webp"] as Format[]).map(f => (
                  <button key={f} onClick={() => applyFormat(f)}
                    className={cn("flex-1 text-[10px] py-1 rounded font-medium transition-colors", format === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    {ext[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset + re-upload */}
            <div className="flex gap-1">
              <button onClick={reset} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
              <label className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer">
                <Upload className="w-3 h-3" /> New
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Blog Admin Page ─────────────────────────────────────────────────────
export default function AdminBlog() {
  const { data: pending = [] } = useListPendingBlogPosts();
  const { data: publishedData } = useListBlogPosts({ query: { limit: 50 } });
  const published = publishedData?.posts || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [posting, setPosting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [images, setImages] = useState<(string | null)[]>(Array(MAX_PHOTOS).fill(null));

  const approveMutation = useApproveBlogPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPendingBlogPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
        toast({ title: "Approved", description: "Post is now live." });
      }
    }
  });

  const deleteMutation = useDeleteBlogPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPendingBlogPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
        toast({ title: "Deleted", description: "Post removed." });
      }
    }
  });

  function addHashtag() {
    const tag = hashtagInput.replace(/^#/, "").trim();
    if (!tag || hashtags.includes(tag)) return;
    setHashtags(prev => [...prev, tag]);
    setHashtagInput("");
  }

  function addLink() {
    const l = linkInput.trim();
    if (!l) return;
    setLinks(prev => [...prev, l]);
    setLinkInput("");
  }

  function setImage(i: number, src: string) {
    setImages(prev => { const n = [...prev]; n[i] = src; return n; });
  }
  function removeImage(i: number) {
    setImages(prev => { const n = [...prev]; n[i] = null; return n; });
  }

  function resetForm() {
    setTitle(""); setSummary(""); setContent(""); setDisplayName("");
    setHashtags([]); setHashtagInput("");
    setLinks([]); setLinkInput("");
    setImages(Array(MAX_PHOTOS).fill(null));
  }

  async function handlePost() {
    if (!title.trim()) { toast({ title: "Required", description: "Please enter a title.", variant: "destructive" }); return; }
    if (!content.trim()) { toast({ title: "Required", description: "Please add a description.", variant: "destructive" }); return; }
    if (!displayName.trim()) { toast({ title: "Required", description: "Please enter a display name.", variant: "destructive" }); return; }

    setPosting(true);
    try {
      const res = await fetch(`${API}/admin/blog`, { ...authHeaders(), 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          authorName: displayName.trim(),
          images: images.filter(Boolean),
          hashtags,
          links,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
      toast({ title: "Published!", description: `"${title}" is now live on the blog.` });
      resetForm();
      setActiveTab("published");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  }

  const tabs = [
    { key: "create" as Tab, label: "Create Post" },
    { key: "pending" as Tab, label: `Pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key: "published" as Tab, label: "Published" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CREATE POST ────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — main form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Type className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Title & Summary</h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter blog post title..." className="text-base" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Summary <span className="text-muted-foreground font-normal">(optional short summary)</span></label>
                <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="A one-line summary of this post..." />
              </div>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <AlignLeft className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Description *</h3>
              </div>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your full blog post content here..."
                className="min-h-[220px] text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground text-right">{content.length} characters</p>
            </div>

            {/* Photos */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <FileImage className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Photos <span className="text-muted-foreground font-normal">(up to {MAX_PHOTOS})</span></h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                  <ImageEditor
                    key={i}
                    index={i}
                    onResult={(src) => setImage(i, src)}
                    onRemove={() => removeImage(i)}
                    initialSrc={images[i] || undefined}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {images.filter(Boolean).length} of {MAX_PHOTOS} photos added. Each photo has crop, resize, and format convert tools.
              </p>
            </div>
          </div>

          {/* Right — meta */}
          <div className="space-y-5">
            {/* Display Name */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Display Name *</h3>
              </div>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name or pen name..." />
            </div>

            {/* Hashtags */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Hash className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Hashtags</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                  placeholder="#goatravel"
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addHashtag} className="px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                      #{tag}
                      <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Link2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Links</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addLink} className="px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
                      <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{link}</span>
                      <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post button */}
            <Button
              className="w-full gap-2 h-12 text-base font-semibold shadow-lg"
              onClick={handlePost}
              disabled={posting}
            >
              {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {posting ? "Publishing..." : "Post to Blog"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">Post will be immediately published on the public blog</p>
          </div>
        </div>
      )}

      {/* ── PENDING APPROVALS ─────────────────────────── */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No pending posts to review</p>
            </div>
          ) : (
            pending.map(post => (
              <div key={post.id} className="bg-card border border-orange-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{post.authorName}</span>
                    <span>·</span>
                    <span>{post.authorEmail}</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">{post.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{post.content}</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <Button className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => approveMutation.mutate({ id: post.id })} disabled={approveMutation.isPending}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1 md:flex-none gap-2"
                    onClick={() => { if (window.confirm("Reject and delete this post?")) deleteMutation.mutate({ id: post.id }); }}
                    disabled={deleteMutation.isPending}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── PUBLISHED ─────────────────────────────────── */}
      {activeTab === "published" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Title</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Author</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {published.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">No published posts yet.</td></tr>
              ) : published.map(post => (
                <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    {post.title}
                    {post.isAdminPost && <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">Admin</span>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{post.authorName}</td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <Link href={`/blog/${post.slug}`}>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                      onClick={() => { if (window.confirm("Delete this post?")) deleteMutation.mutate({ id: post.id }); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
