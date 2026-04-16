import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Loader2,
  Pencil,
  Save,
  Upload,
  Eye,
  Trophy,
  Medal,
  Award,
  ChevronRight,
  GripVertical,
  X,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ScoringLevel {
  id: number;
  name: string;
  min_score: number;
  max_score: number;
  color: string;
  icon: string;
  sort_order: number;
  program_id: string | null;
}

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface CertElement {
  id: string;
  type: "text" | "image" | "variable";
  content: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  width?: number; // percentage
  height?: number; // percentage
  textAlign?: "left" | "center" | "right";
}

interface CertTemplate {
  id?: number;
  scoring_level_id: number;
  title: string;
  subtitle: string;
  body_text: string;
  footer_text: string;
  signer_name: string;
  signer_title: string;
  bg_image_url: string | null;
  logo_url: string | null;
  primary_color: string;
  orientation?: "landscape" | "portrait";
  layout?:
    | CertElement[]
    | { landscape: CertElement[]; portrait: CertElement[] };
}

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  award: Award,
};
const getIcon = (icon: string) => ICON_MAP[icon] || Trophy;

const getLayout = (template: CertTemplate): CertElement[] => {
  if (!template.layout) return [];
  if (Array.isArray(template.layout)) return template.layout;
  return template.layout[template.orientation || "landscape"] || [];
};

const defaultTemplate = (
  levelId: number,
  color: string,
  signer?: { name: string; title: string },
): CertTemplate => {
  const commonLayout: CertElement[] = [
    {
      id: "def-recipient",
      type: "variable",
      content: "{recipient}",
      x: 50,
      y: 40,
      fontSize: 24,
      fontWeight: "bold",
      width: 80,
    },
    {
      id: "def-body",
      type: "text",
      content: "ขอมอบใบประกาศนียบัตรฉบับนี้ให้แก่",
      x: 50,
      y: 32,
      fontSize: 16,
      width: 80,
    },
    {
      id: "def-level",
      type: "variable",
      content: "{level}",
      x: 50,
      y: 50,
      fontSize: 20,
      fontWeight: "bold",
      width: 50,
    },
    {
      id: "def-signer",
      type: "variable",
      content: "{signer_name}",
      x: 50,
      y: 80,
      fontSize: 16,
      fontWeight: "bold",
      width: 50,
    },
    {
      id: "def-title",
      type: "variable",
      content: "{signer_title}",
      x: 50,
      y: 85,
      fontSize: 14,
      width: 50,
    },
  ];

  return {
    scoring_level_id: levelId,
    title: "ใบประกาศนียบัตร",
    subtitle: "โครงการ G-Green",
    body_text: "ขอมอบใบประกาศนียบัตรฉบับนี้ให้แก่",
    footer_text: "กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม",
    signer_name: signer?.name || "",
    signer_title: signer?.title || "",
    bg_image_url: null,
    logo_url: null,
    primary_color: color,
    orientation: "landscape",
    layout: {
      landscape: [...commonLayout],
      portrait: [...commonLayout].map((el) => ({
        ...el,
        y: el.y * 1.2 > 100 ? 95 : el.y * 1.2,
      })), // simple adjustment for portrait
    },
  };
};

/* ──────────────── Certificate Preview ──────────────── */
const CertificatePreview = ({
  template,
  levelName,
  onElementClick,
  onElementMove,
  onRemoveElement,
  onElementResize,
  onActionEnd,
  selectedElementId,
  showGrid = false,
  showIndicator = true,
}: {
  template: CertTemplate;
  levelName: string;
  onElementClick?: (el: CertElement | null) => void;
  onElementMove?: (id: string, x: number, y: number) => void;
  onRemoveElement?: (id: string) => void;
  onElementResize?: (id: string, width: number) => void;
  onActionEnd?: () => void;
  selectedElementId?: string;
  showGrid?: boolean;
  showIndicator?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [snapX, setSnapX] = useState<number | null>(null);
  const [snapY, setSnapY] = useState<number | null>(null);

  const isLandscape = template.orientation !== "portrait";
  const aspectRatio = isLandscape ? "1.414" : "0.707";
  const layout = getLayout(template);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (draggingId && onElementMove) {
      const el = layout.find((e) => e.id === draggingId);
      if (el) {
        const halfWidth = (el.width || 0) / 2;
        const clampedX = Math.max(halfWidth, Math.min(100 - halfWidth, x));
        const clampedY = Math.max(0, Math.min(100, y));

        let finalX = clampedX;
        let finalY = clampedY;
        let activeSnapX = null;
        let activeSnapY = null;

        const snapThreshold = 1.5;

        // Snap to center
        if (Math.abs(clampedX - 50) < snapThreshold) {
          finalX = 50;
          activeSnapX = 50;
        }
        if (Math.abs(clampedY - 50) < snapThreshold) {
          finalY = 50;
          activeSnapY = 50;
        }

        // Snap to other elements
        layout
          .filter((other) => other.id !== draggingId)
          .forEach((other) => {
            if (Math.abs(clampedX - other.x) < snapThreshold) {
              finalX = other.x;
              activeSnapX = other.x;
            }
            if (Math.abs(clampedY - other.y) < snapThreshold) {
              finalY = other.y;
              activeSnapY = other.y;
            }
          });

        setSnapX(activeSnapX);
        setSnapY(activeSnapY);

        onElementMove(
          draggingId,
          Math.round(finalX * 100) / 100,
          Math.round(finalY * 100) / 100,
        );
      }
    } else if (resizingId && onElementResize) {
      const el = layout.find((el) => el.id === resizingId);
      if (el) {
        let newWidth = Math.abs(x - el.x) * 2;
        const maxWidth = Math.min(el.x * 2, (100 - el.x) * 2);
        newWidth = Math.min(newWidth, maxWidth);
        onElementResize(
          resizingId,
          Math.round(Math.max(1, newWidth) * 100) / 100,
        );
      }
    }
  };

  const handlePointerUp = () => {
    if (draggingId || resizingId) {
      onActionEnd?.();
    }
    setDraggingId(null);
    setResizingId(null);
    setSnapX(null);
    setSnapY(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg border-2 shadow-lg overflow-hidden bg-white select-none animate-in fade-in duration-700"
      onPointerDown={() => onElementClick?.(null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        aspectRatio,
        borderColor: template.primary_color,
        touchAction: "none",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: template.bg_image_url
            ? `url(${template.bg_image_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: template.bg_image_url ? undefined : "#fffdf7",
        }}
      />
      {template.bg_image_url && (
        <div className="absolute inset-0 bg-white/60 pointer-events-none" />
      )}

      {/* Grid Guidelines */}
      {showGrid && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.15]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: "5% 5%",
            }}
          />

          {/* Centered Guide Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-primary/50" />
            <div className="absolute left-1/2 top-0 w-[0.5px] h-full bg-primary/50" />
          </div>
        </>
      )}

      {/* Snap/Alignment Guidelines */}
      {snapX !== null && (
        <div
          className="absolute top-0 bottom-0 border-l border-primary/60 border-dashed z-30 pointer-events-none"
          style={{ left: `${snapX}%` }}
        >
          {snapX === 50 && (
            <span className="absolute top-2 left-1 text-[8px] bg-primary text-white rounded px-1">
              Center
            </span>
          )}
        </div>
      )}
      {snapY !== null && (
        <div
          className="absolute left-0 right-0 border-t border-primary/60 border-dashed z-30 pointer-events-none"
          style={{ top: `${snapY}%` }}
        >
          {snapY === 50 && (
            <span className="absolute left-2 top-1 text-[8px] bg-primary text-white rounded px-1">
              Center
            </span>
          )}
        </div>
      )}

      <div className="absolute inset-4 border border-slate-200 pointer-events-none" />

      {/* Legacy fixed elements */}
      {(!layout || layout.length === 0) && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 p-8 text-center pointer-events-none">
          {template.logo_url && (
            <img
              src={template.logo_url}
              alt="Logo"
              className="h-16 w-16 object-contain mb-2"
            />
          )}
          <div
            className="w-24 h-1 rounded-full mb-1"
            style={{ backgroundColor: template.primary_color }}
          />
          <h2
            className="text-xl md:text-2xl font-bold"
            style={{ color: template.primary_color }}
          >
            {template.title}
          </h2>
          {template.subtitle && (
            <p className="text-sm text-muted-foreground">{template.subtitle}</p>
          )}
          <p className="text-sm mt-2">{template.body_text}</p>
          <div
            className="mt-1 px-6 py-2 border-b-2 min-w-[200px]"
            style={{ borderColor: template.primary_color }}
          >
            <span
              className="text-lg font-semibold"
              style={{ color: template.primary_color }}
            >
              ชื่อ-สกุล ผู้ได้รับ
            </span>
          </div>
          <div
            className="mt-2 px-4 py-1 rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: template.primary_color }}
          >
            ระดับ {levelName}
          </div>
          <p className="text-xs font-bold mt-1">ประจำปี 256x</p>
          {template.footer_text && (
            <p className="text-xs text-muted-foreground mt-2">
              {template.footer_text}
            </p>
          )}
          {template.signer_name && (
            <div className="mt-4 text-center">
              <div className="w-32 border-b border-foreground/30 mx-auto mb-1" />
              <p className="text-sm font-semibold">{template.signer_name}</p>
              {template.signer_title && (
                <p className="text-xs text-muted-foreground">
                  {template.signer_title}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flexible Layout Elements */}
      {layout.map((el) => {
        const isSelected = selectedElementId === el.id && showIndicator;
        const isDragging = draggingId === el.id;
        return (
          <div
            key={el.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              onElementClick?.(el);
              setDraggingId(el.id);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            className={`absolute cursor-move transition-shadow hover:ring-2 hover:ring-primary/50 group ${
              isSelected ? "ring-2 ring-primary z-20" : "z-10"
            } ${isDragging ? "opacity-70 shadow-xl" : ""}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: el.width && el.width > 0 ? `${el.width}%` : "auto",
              minWidth: el.type === "image" ? undefined : "max-content",
              maxWidth: el.width && el.width > 0 ? undefined : "90%",
              height: el.height ? `${el.height}%` : undefined,
              fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
              fontWeight: el.fontWeight === "bold" ? "800" : "400",
              color: el.color || template.primary_color,
              textAlign: el.textAlign || "center",
              transform: "translate(-50%, -50%)",
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            {isSelected && (
              <>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] px-1 rounded flex items-center gap-1">
                  <GripVertical className="w-2 h-2" /> Drag
                </div>
                <button
                  className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveElement?.(el.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-white rounded-full cursor-nwse-resize z-30"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setResizingId(el.id);
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                />
              </>
            )}
            {el.type === "image" && (
              <img
                src={el.content}
                alt="Logo"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}
            {el.type === "text" && (
              <span className="break-words block w-full">{el.content}</span>
            )}
            {el.type === "variable" && (
              <span className="">
                {el.content === "{recipient}"
                  ? "ชื่อ-สกุล ผู้ได้รับ"
                  : el.content === "{level}"
                    ? `ระดับ ${levelName}`
                    : el.content === "{signer_name}"
                      ? template.signer_name || "ชื่อผู้ลงนาม"
                      : el.content === "{signer_title}"
                        ? template.signer_title || "ตำแหน่งผู้ลงนาม"
                        : el.content}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────── View-Only Dialog ──────────────── */
const ViewCertificateDialog = ({
  template,
  levelName,
  open,
  onOpenChange,
}: {
  template: CertTemplate;
  levelName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const isPortrait = template.orientation === "portrait";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none shadow-2xl animate-in fade-in zoom-in duration-300">
        <DialogHeader className="flex flex-row items-center justify-between px-8 py-4 border-opacity-0 bg-white shadow-sm z-10 shrink-0">
          <div className="space-y-1 text-left">
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-xl font-bold">
              <Eye className="w-5 h-5 text-primary" />
              ตัวอย่างใบประกาศนียบัตร
            </DialogTitle>
            <p className="text- text-muted-foreground font-medium uppercase tracking-wider">
              ระดับรางวัล: {levelName}
            </p>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="text-xl font-light">✕</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-slate-200/30 p-8 md:p-12">
          <div className="flex items-center justify-center min-h-full">
            <div
              className="transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] rounded-xl overflow-hidden border border-white bg-white"
              style={{
                width: isPortrait ? "210mm" : "297mm",
                minWidth: isPortrait ? "210mm" : "297mm",
              }}
            >
              <CertificatePreview template={template} levelName={levelName} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────── Edit Form Dialog ──────────────── */
const EditTemplateDialog = ({
  template,
  levelName,
  onSave,
}: {
  template: CertTemplate;
  levelName: string;
  onSave: (t: CertTemplate) => void;
}) => {
  const [form, setForm] = useState<CertTemplate>(template);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [showIndicator, setShowIndicator] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<CertTemplate[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const elementImgRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      let initialForm = { ...template };
      // Migration: Ensure layout is an object with landscape and portrait
      if (!initialForm.layout) {
        initialForm.layout = { landscape: [], portrait: [] };
      } else if (Array.isArray(initialForm.layout)) {
        const existingLayout = initialForm.layout;
        initialForm.layout = {
          landscape:
            initialForm.orientation === "portrait" ? [] : existingLayout,
          portrait:
            initialForm.orientation === "portrait" ? existingLayout : [],
        };
      }
      setForm(initialForm);
      setHistory([initialForm]);
      setHistoryIndex(0);
    }
  }, [open, template]);

  const addToHistory = (newState: CertTemplate) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const nextIndex = Math.min(historyIndex + 1, 49);
      return nextIndex;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setForm(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setForm(history[nextIndex]);
    }
  };

  const selectedEl = getLayout(form).find((el) => el.id === selectedElId);

  useEffect(() => {
    if (selectedElId && selectedEl?.type === "text") {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 50);
    }
  }, [selectedElId, selectedEl?.type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElId) {
        if (
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
        ) {
          removeElement(selectedElId);
        }
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedElId]);

  const set = (key: keyof CertTemplate, value: any) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      addToHistory(next);
      return next;
    });
  };

  const handleFileUpload = async (
    file: File,
    field: "logo_url" | "bg_image_url" | "element",
  ) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "folder",
        `certificate-assets/${field === "logo_url" ? "logos" : "backgrounds"}`,
      );
      const { data } = await apiClient.post<{ url: string }>(
        "files/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        },
      );
      if (field === "element") return data.url;
      setForm((f) => {
        const next = { ...f, [field]: data.url };
        addToHistory(next);
        return next;
      });
      toast({ title: "อัปโหลดสำเร็จ", variant: "success" });
    } catch (e: any) {
      toast({
        title: "อัปโหลดล้มเหลว",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addElement = (type: "text" | "image" | "variable", content: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEl: CertElement = {
      id,
      type,
      content,
      x: 50,
      y: 50,
      fontSize: type === "text" || type === "variable" ? 16 : undefined,
      width: type === "image" ? 15 : 0, // 0 means auto
    };

    setForm((f) => {
      const currentOrientation = f.orientation || "landscape";
      const layouts =
        f.layout && !Array.isArray(f.layout)
          ? f.layout
          : { landscape: [], portrait: [] };
      const next = {
        ...f,
        layout: {
          ...layouts,
          [currentOrientation]: [...(layouts[currentOrientation] || []), newEl],
        },
      };
      addToHistory(next);
      return next;
    });
    setSelectedElId(id);
  };

  const updateElementWithHistory = (
    id: string,
    updates: Partial<CertElement>,
  ) => {
    setForm((f) => {
      const currentOrientation = f.orientation || "landscape";
      const layouts =
        f.layout && !Array.isArray(f.layout)
          ? f.layout
          : { landscape: [], portrait: [] };
      const next = {
        ...f,
        layout: {
          ...layouts,
          [currentOrientation]: (layouts[currentOrientation] || []).map((el) =>
            el.id === id ? { ...el, ...updates } : el,
          ),
        },
      };
      addToHistory(next);
      return next;
    });
  };

 const updateElement = (id: string, updates: Partial<CertElement>) => {
  setForm((f) => {
    const currentOrientation = f.orientation || "landscape";
    
    // เตรียม Layout Object ให้พร้อม
    let currentLayouts = { landscape: [] as CertElement[], portrait: [] as CertElement[] };
    
    if (f.layout && !Array.isArray(f.layout)) {
      currentLayouts = { ...f.layout };
    } else if (Array.isArray(f.layout)) {
      // กรณีข้อมูลเก่าเป็น Array ให้ย้ายมาไว้ในช่องปัจจุบันก่อน
      currentLayouts[currentOrientation] = f.layout;
    }

    // Update เฉพาะ Element ในช่อง Orientation ปัจจุบัน
    const updatedList = (currentLayouts[currentOrientation] || []).map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );

    return {
      ...f,
      layout: {
        ...currentLayouts,
        [currentOrientation]: updatedList,
      },
    };
  });
 };

  const changeOrientation = (newOrientation: "landscape" | "portrait") => {
  setForm((f) => {
    const oldOrientation = f.orientation || "landscape";
    let layouts = { landscape: [] as CertElement[], portrait: [] as CertElement[] };
    if (f.layout && !Array.isArray(f.layout)) {
      layouts = { ...f.layout };
    } else if (Array.isArray(f.layout)) {
      layouts[oldOrientation] = f.layout;
    }
    // ถ้าหน้าใหม่ที่จะไป (เช่น portrait) ยังไม่มีข้อมูลเลย 
    // ให้ทำการ Copy ข้อมูลจากหน้าเก่า (landscape) ไปเป็นต้นแบบ
    if (!layouts[newOrientation] || layouts[newOrientation].length === 0) {
      layouts[newOrientation] = (layouts[oldOrientation] || []).map(el => ({
        ...el,
        // ปรับตำแหน่ง Y นิดหน่อยให้เหมาะกับแนวตั้ง (Optional)
        y: newOrientation === "portrait" ? Math.min(el.y * 1.1, 95) : el.y
      }));
    }

    const next = { 
      ...f, 
      orientation: newOrientation,
      layout: layouts 
    };
    
    addToHistory(next);
    return next;
  });
 };

  const copyLayoutFrom = (source: "landscape" | "portrait") => {
    setForm((f) => {
      let layouts = {
        landscape: [] as CertElement[],
        portrait: [] as CertElement[],
      };
      if (f.layout && !Array.isArray(f.layout)) {
        layouts = { ...f.layout };
      } else if (Array.isArray(f.layout)) {
        layouts[f.orientation || "landscape"] = f.layout;
      }

      const sourceLayout = layouts[source] || [];
      const currentOrientation = f.orientation || "landscape";

      // Copying elements (keeping IDs is okay as they are in different orientation arrays)
      const next = {
        ...f,
        layout: {
          ...layouts,
          [currentOrientation]: sourceLayout.map((el) => ({ ...el })),
        },
      };

      addToHistory(next);
      return next;
    });
    toast({ title: "ดึงข้อมูลจาก" + (source === "landscape" ? "แนวนอน" : "แนวตั้ง") + "เรียบร้อยแล้ว", variant: "success" });
  };

  const removeElement = (id: string) => {
    setForm((f) => {
      const currentOrientation = f.orientation || "landscape";
      const layouts =
        f.layout && !Array.isArray(f.layout)
          ? f.layout
          : { landscape: [], portrait: [] };
      const next = {
        ...f,
        layout: {
          ...layouts,
          [currentOrientation]: (layouts[currentOrientation] || []).filter(
            (el) => el.id !== id,
          ),
        },
      };
      addToHistory(next);
      return next;
    });
    setSelectedElId(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowIndicator(false);
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          แก้ไข
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>แก้ไขใบประกาศนียบัตร – {levelName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* Settings Sidebar */}
            <div className="space-y-4 pr-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase text-muted-foreground">
                  การตั้งค่าพื้นฐาน
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={
                      form.orientation === "landscape" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => changeOrientation("landscape")}
                  >
                    แนวนอน
                  </Button>
                  <Button
                    variant={
                      form.orientation === "portrait" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => changeOrientation("portrait")}
                  >
                    แนวตั้ง
                  </Button>
                </div>
                {form.orientation === "portrait" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-7 border-dashed"
                    onClick={() => {
                      if (confirm("คุณต้องการดึงข้อมูลจากหน้า 'แนวนอน' มาทับหน้าปัจจุบันใช่หรือไม่?")) {
                        copyLayoutFrom("landscape");
                      }
                    }}
                  >
                    <Undo2 className="mr-1 h-3 w-3" /> ดึงข้อมูลจากแนวนอน
                  </Button>
                )}
                {form.orientation === "landscape" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-7 border-dashed"
                    onClick={() => {
                      if (confirm("คุณต้องการดึงข้อมูลจากหน้า 'แนวตั้ง' มาทับหน้าปัจจุบันใช่หรือไม่?")) {
                        copyLayoutFrom("portrait");
                      }
                    }}
                  >
                    <Undo2 className="mr-1 h-3 w-3" /> ดึงข้อมูลจากแนวตั้ง
                  </Button>
                )}
                <label className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors ml-2">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded"
                    />
                    แสดงเส้นกะ
                  </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label>สีหลัก</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.primary_color}
                        onChange={(e) => set("primary_color", e.target.value)}
                        className="h-8 w-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.primary_color}
                        onChange={(e) => set("primary_color", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>พื้นหลัง</Label>
                  <input
                    ref={bgRef}
                    type="file"
                    accept="image/*,.png"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleFileUpload(e.target.files[0], "bg_image_url")
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => bgRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    {form.bg_image_url ? "เปลี่ยนพื้นหลัง" : "อัปโหลดพื้นหลัง"}
                  </Button>
                </div>
                <div className="pt-2 space-y-1">
                  <Label>ข้อมูลผู้ลงนาม</Label>
                  <Input
                    placeholder="ชื่อผู้ลงนาม"
                    value={form.signer_name}
                    onChange={(e) => set("signer_name", e.target.value)}
                    onBlur={() => addToHistory(form)}
                    className="h-8 text-xs mb-1"
                  />
                  <Input
                    placeholder="ตำแหน่งผู้ลงนาม"
                    value={form.signer_title}
                    onChange={(e) => set("signer_title", e.target.value)}
                    onBlur={() => addToHistory(form)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Label className="text-sm font-bold uppercase text-muted-foreground">
                  เพิ่มองค์ประกอบ
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addElement("text", "พิมพ์ข้อความที่นี่")}
                    className="h-8 text-xs"
                  >
                    + ข้อความ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => elementImgRef.current?.click()}
                    className="h-8 text-xs"
                  >
                    + รูปภาพ/ลายเซ็น
                  </Button>
                  <input
                    ref={elementImgRef}
                    type="file"
                    accept="image/*,.png"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await handleFileUpload(
                          e.target.files[0],
                          "element",
                        );
                        if (url) addElement("image", url);
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addElement("variable", "{recipient}")}
                    className="h-8 text-[10px]"
                  >
                    + ชื่อผู้ได้รับ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addElement("variable", "{level}")}
                    className="h-8 text-[10px]"
                  >
                    + ระดับรางวัล
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addElement("variable", "{signer_name}")}
                    className="h-8 text-[10px]"
                  >
                    + ชื่อผู้ลงนาม
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addElement("variable", "{signer_title}")}
                    className="h-8 text-[10px]"
                  >
                    + ตำแหน่ง
                  </Button>
                </div>
              </div>

              {selectedEl && (
                <div className="pt-4 border-t space-y-3 bg-accent/30 p-3 rounded-lg animate-in slide-in-from-left-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold">แก้ไของค์ประกอบ</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => removeElement(selectedEl.id)}
                    >
                      ✕
                    </Button>
                  </div>

                  {selectedEl.type !== "image" && (
                    <div>
                      <Label className="text-[10px]">ข้อความ</Label>
                      <Textarea
                        ref={textareaRef}
                        value={selectedEl.content}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            content: e.target.value,
                          })
                        }
                        onKeyDown={handleInputKeyDown}
                        onBlur={() => addToHistory(form)}
                        rows={2}
                        className="text-xs"
                        disabled={selectedEl.type === "variable"}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">ตำแหน่ง X (%)</Label>
                      <Input
                        type="number"
                        value={selectedEl.x === 0 ? "" : selectedEl.x}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            x:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                        onKeyDown={handleInputKeyDown}
                        onBlur={() => addToHistory(form)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">ตำแหน่ง Y (%)</Label>
                      <Input
                        type="number"
                        value={selectedEl.y === 0 ? "" : selectedEl.y}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            y:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                        onKeyDown={handleInputKeyDown}
                        onBlur={() => addToHistory(form)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px]">
                      ความกว้าง (%){" "}
                      {selectedEl.width === 0 && (
                        <span className="text-primary">(Auto)</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Auto"
                      value={selectedEl.width === 0 ? "" : selectedEl.width}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          width:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      onKeyDown={handleInputKeyDown}
                      onBlur={() => addToHistory(form)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {selectedEl.type !== "image" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">ขนาดตัวอักษร</Label>
                        <Input
                          type="number"
                          value={
                            selectedEl.fontSize === 0 ? "" : selectedEl.fontSize
                          }
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fontSize:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                          onKeyDown={handleInputKeyDown}
                          onBlur={() => addToHistory(form)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">สไตล์ & จัดวาง</Label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={selectedEl.color || form.primary_color}
                            onChange={(e) =>
                              updateElementWithHistory(selectedEl.id, {
                                color: e.target.value,
                              })
                            }
                            className="h-8 w-8 rounded border cursor-pointer"
                          />
                          <Button
                            variant={
                              selectedEl.fontWeight === "bold"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              updateElementWithHistory(selectedEl.id, {
                                fontWeight:
                                  selectedEl.fontWeight === "bold"
                                    ? "normal"
                                    : "bold",
                              })
                            }
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <div className="flex bg-slate-100 rounded border">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${selectedEl.textAlign === "left" ? "bg-white shadow-sm" : ""}`}
                              onClick={() =>
                                updateElementWithHistory(selectedEl.id, {
                                  textAlign: "left",
                                })
                              }
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${selectedEl.textAlign === "center" || !selectedEl.textAlign ? "bg-white shadow-sm" : ""}`}
                              onClick={() =>
                                updateElementWithHistory(selectedEl.id, {
                                  textAlign: "center",
                                })
                              }
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${selectedEl.textAlign === "right" ? "bg-white shadow-sm" : ""}`}
                              onClick={() =>
                                updateElementWithHistory(selectedEl.id, {
                                  textAlign: "right",
                                })
                              }
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-white rounded-lg border border-primary/10 space-y-2 mb-4">
                    <Button
                      className="w-full h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      onClick={() => {
                        onSave(form);
                        setSelectedElId(null);
                      }}
                      disabled={uploading}
                    >
                      <Save className="mr-2 h-4 w-4" /> บันทึก
                    </Button>
                  </div>
                </div>
              )}

              {!getLayout(form).length && (
                <div className="pt-2 border-t space-y-2 opacity-60">
                  <Label className="text-[10px] italic">
                    คุณยังอยู่ในโหมด Template เดิม (ข้อความคงที่)
                  </Label>

                  <div className="space-y-1">
                    <Input
                      placeholder="หัวเรื่อง"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      onBlur={() => addToHistory(form)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="หัวเรื่องรอง"
                      value={form.subtitle}
                      onChange={(e) => set("subtitle", e.target.value)}
                      onBlur={() => addToHistory(form)}
                      className="h-8 text-xs"
                    />
                    <Textarea
                      placeholder="ข้อความ"
                      value={form.body_text}
                      onChange={(e) => set("body_text", e.target.value)}
                      onBlur={() => addToHistory(form)}
                      rows={1}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* รายการองค์ประกอบที่มีอยู่ (Collapsible) */}
              <div className="pt-4 border-t">
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex justify-between p-0 hover:bg-transparent group">
                      <Label className="text-sm font-bold uppercase text-muted-foreground cursor-pointer">
                        เลือกองค์ประกอบ ({getLayout(form).length})
                      </Label>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {getLayout(form).map((el) => (
                        <div
                          key={el.id}
                          onClick={() => {
                            setSelectedElId(el.id);
                            setShowIndicator(true);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            selectedElId === el.id 
                              ? "bg-primary/5 border-primary ring-1 ring-primary/20" 
                              : "bg-white hover:bg-accent border-slate-200"
                          }`}
                        >
                          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            {el.type === 'image' ? <Upload className="w-3.5 h-3.5 text-primary"/> : 
                             el.type === 'variable' ? <Pencil className="w-3.5 h-3.5 text-amber-500"/> : 
                             <FileText className="w-3.5 h-3.5 text-blue-500"/>}
                          </div>
                          <span className="text-[11px] truncate flex-1 font-medium text-slate-700">
                            {el.type === 'variable' 
                              ? (el.content === "{recipient}" ? "ชื่อผู้ได้รับ" : el.content === "{level}" ? "ระดับรางวัล" : 
                                 el.content === "{signer_name}" ? "ชื่อผู้ลงนาม" : el.content === "{signer_title}" ? "ตำแหน่ง" : el.content)
                              : (el.type === 'image' ? 'รูปภาพ/โลโก้' : el.content)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeElement(el.id);
                            }}
                          >
                            <X className="h-3.5 w-3.5"/>
                          </Button>
                        </div>
                      ))}
                      {getLayout(form).length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                           <p className="text-[11px] text-muted-foreground italic">ยังไม่มีองค์ประกอบ</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="bg-slate-200/50 rounded-xl p-4 flex-1 flex flex-col overflow-auto min-h-[500px]">
              <div className="mb-2 flex justify-between items-center text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-background rounded-md border p-0.5 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      title="ย้อนกลับ (Undo)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      title="ถัดไป (Redo)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <span>
                  ระดับ: {levelName} •{" "}
                  {form.orientation === "portrait" ? "แนวตั้ง" : "แนวนอน"}
                </span>
              </div>

              <div className="flex-1 flex items-start justify-center p-4">
                <div
                  className="transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white bg-white"
                  style={{
                    width: form.orientation === "portrait" ? "210mm" : "297mm",
                    minWidth:
                      form.orientation === "portrait" ? "210mm" : "297mm",
                  }}
                >
                  <CertificatePreview
                    template={form}
                    levelName={levelName}
                    onElementClick={(el) => {
                      setSelectedElId(el?.id || null);
                      setShowIndicator(true);
                    }}
                    onElementMove={(id, x, y) => updateElement(id, { x, y })}
                    onRemoveElement={removeElement}
                    onElementResize={(id, width) =>
                      updateElement(id, { width })
                    }
                    onActionEnd={() => addToHistory(form)}
                    selectedElementId={selectedElId || undefined}
                    showGrid={showGrid}
                    showIndicator={showIndicator}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 bg-background">
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button
            onClick={() => {
              onSave(form);
              setOpen(false);
            }}
            disabled={uploading}
          >
            <Save className="mr-2 h-4 w-4" />
            บันทึกทั้งหมด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────── Level Certificate Card ──────────────── */
const LevelCertCard = ({
  level,
  template,
  onSave,
}: {
  level: ScoringLevel;
  template: CertTemplate;
  onSave: (t: CertTemplate) => void;
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const IC = getIcon(level.icon);
  const saved = !!template.id;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${level.color}20`,
                color: level.color,
              }}
            >
              <IC className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{level.name}</p>
              <p className="text-xs text-muted-foreground">
                ช่วงคะแนน: {level.min_score}% – {level.max_score}%
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">หัวเรื่อง</span>
              <span className="font-medium">{template.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ผู้ลงนาม</span>
              <span className="font-medium">{template.signer_name || "–"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">สถานะ</span>
              <span
                className={`font-medium ${saved ? "text-green-600" : "text-amber-500"}`}
              >
                {saved ? "✓ บันทึกแล้ว" : "ยังไม่ได้ตั้งค่า"}
              </span>
            </div>
          </div>
          <EditTemplateDialog
            template={template}
            levelName={level.name}
            onSave={onSave}
          />
          <ViewCertificateDialog
            template={template}
            levelName={level.name}
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
          />
        </div>
        <div
          className="cursor-pointer group relative overflow-hidden"
          onDoubleClick={() => setIsPreviewOpen(true)}
          title="ดับเบิ้ลคลิกเพื่อดูตัวอย่าง (อ่านอย่างเดียว)"
        >
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm text-muted-foreground">
              ตัวอย่าง (ดับเบิ้ลคลิกเพื่อขยาย)
            </Label>
          </div>
          <div className="transition-transform group-hover:scale-[1.02] duration-200 shadow-sm border rounded-lg overflow-auto bg-white">
            <CertificatePreview template={template} levelName={level.name} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ──────────────── Main Page ──────────────── */
const SettingsCertificate = () => {
  const queryClient = useQueryClient();

  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["scoring-levels"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("scoring-levels");
      return data.map((l) => ({
        id: l.id,
        name: l.name,
        min_score: l.minScore ?? l.min_score,
        max_score: l.maxScore ?? l.max_score,
        color: l.color,
        icon: l.icon,
        sort_order: l.sortOrder ?? l.sort_order,
        program_id: l.programId ?? l.program_id,
      })) as ScoringLevel[];
    },
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("programs");
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        sort_order: p.sortOrder ?? p.sort_order,
      })) as DbProgram[];
    },
  });

  const { data: templatesRaw = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("certificate-templates");
      return data.map((t) => ({
        id: t.id,
        scoring_level_id: t.scoringLevelId ?? t.scoring_level_id,
        title: t.title,
        subtitle: t.subtitle,
        body_text: t.bodyText ?? t.body_text,
        footer_text: t.footerText ?? t.footer_text,
        signer_name: t.signerName ?? t.signer_name,
        signer_title: t.signerTitle ?? t.signer_title,
        bg_image_url: t.bgImageUrl ?? t.bg_image_url,
        logo_url: t.logoUrl ?? t.logo_url,
        primary_color: t.primaryColor ?? t.primary_color,
        orientation: t.orientation,
        layout: t.layout,
      })) as CertTemplate[];
    },
  });

  const templates: Record<number, CertTemplate> = {};
  templatesRaw.forEach((t) => {
    templates[t.scoring_level_id] = t;
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      levelId,
      template,
      updateAllSigners,
    }: {
      levelId: number;
      template: CertTemplate;
      updateAllSigners?: boolean;
    }) => {
      const toApiPayload = (t: Omit<CertTemplate, "id">) => ({
        scoringLevelId: t.scoring_level_id,
        title: t.title,
        subtitle: t.subtitle,
        bodyText: t.body_text,
        footerText: t.footer_text,
        signerName: t.signer_name,
        signerTitle: t.signer_title,
        bgImageUrl: t.bg_image_url,
        logoUrl: t.logo_url,
        primaryColor: t.primary_color,
        orientation: t.orientation,
        layout: t.layout,
      });

      const existing = templates[levelId];
      if (existing?.id) {
        const { id, ...rest } = template;
        await apiClient.patch(`certificate-templates/${existing.id}`, toApiPayload(rest));
      } else {
        const { id, ...rest } = template;
        await apiClient.post("certificate-templates", toApiPayload(rest));
      }

      if (updateAllSigners) {
        // Sync signer info to all other EXISTING templates
        const otherTemplates = templatesRaw.filter(
          (t) => t.scoring_level_id !== levelId && t.id,
        );
        for (const other of otherTemplates) {
          await apiClient.patch(`certificate-templates/${other.id}`, {
            signerName: template.signer_name,
            signerTitle: template.signer_title,
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast({
        title: "บันทึกสำเร็จ",
        variant: "success",
        description: variables.updateAllSigners
          ? "ข้อมูลผู้ลงนามถูกปรับใช้กับทุกระดับแล้ว"
          : undefined,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (levelId: number, template: CertTemplate) => {
    // Check if signer info changed compared to current data
    const current = templates[levelId];
    const signerChanged =
      current &&
      (current.signer_name !== template.signer_name ||
        current.signer_title !== template.signer_title);

    saveMutation.mutate({
      levelId,
      template,
      updateAllSigners: !!signerChanged,
    });
  };

  if (levelsLoading || programsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 space-y-3">
      <div className="px-6 py-4 rounded-2xl" style={{ background: "var(--glass-bg-soft)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">
              ใบประกาศนียบัตร
            </h2>
            <p className="text-xs text-muted-foreground">
              จัดการรูปแบบใบประกาศนียบัตรตามระดับผลการประเมินแยกตามโครงการ
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {programs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-30" />
            <p>ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
          </div>
        )}

        {programs.map((program) => {
          const programLevels = levels
            .filter((l) => l.program_id === program.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const configuredCount = programLevels.filter(
            (l) => !!templates[l.id],
          ).length;

          // Find first available signer info to use as default for new templates
          const firstTemplateWithSigner = templatesRaw.find(
            (t) => t.signer_name || t.signer_title,
          );
          const defaultSigner = firstTemplateWithSigner
            ? {
                name: firstTemplateWithSigner.signer_name,
                title: firstTemplateWithSigner.signer_title,
              }
            : undefined;

          return (
            <Collapsible key={program.id} className="group/prog">
              <div className="rounded-xl border border-accent/30 bg-accent/10 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-accent-foreground/70 transition-transform group-data-[state=open]/prog:rotate-90" />
                    <p className="font-bold text-foreground text-left flex-1 text-base">
                      {program.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {configuredCount}/{programLevels.length} ระดับตั้งค่าแล้ว
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 py-4 space-y-4">
                    {programLevels.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">
                          ยังไม่มีเกณฑ์คะแนนในโครงการนี้
                          กรุณาตั้งค่าเกณฑ์คะแนนก่อน
                        </p>
                      </div>
                    ) : (
                      programLevels.map((level) => {
                        const template =
                          templates[level.id] ||
                          defaultTemplate(level.id, level.color, defaultSigner);
                        return (
                          <LevelCertCard
                            key={level.id}
                            level={level}
                            template={template}
                            onSave={(t) => handleSave(level.id, t)}
                          />
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {levels.some((l) => !l.program_id) && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">
              ระดับที่ยังไม่ได้ผูกกับโครงการ
            </p>
            {levels
              .filter((l) => !l.program_id)
              .map((level) => {
                const template =
                  templates[level.id] || defaultTemplate(level.id, level.color);
                return (
                  <LevelCertCard
                    key={level.id}
                    level={level}
                    template={template}
                    onSave={(t) => handleSave(level.id, t)}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsCertificate;
