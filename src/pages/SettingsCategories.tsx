import { useState, useEffect } from "react";
import { AddCategoryDialog, type AddScoreType } from "@/components/AddCategoryDialog";
import { EditCategoryDialog, type DbScoreType } from "@/components/EditCategoryDialog";
import { Trash2, FolderTree, Loader2, ChevronDown, ChevronRight, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import { ScoringLevel } from "./ProjectRegistration";

interface DbCategory {
  id: number;
  name: string;
  maxScore: number;
  maxScorePct: number;
  sortOrder: number;
  isDefault: boolean;
  programId: string | null;
  scoreType: DbScoreType;
  upgradeMode: string | null;
  upgradeScoringLevelId: number | null;
  renewMode: string | null;
  renewScoringLevelId: number | null;
}

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

// ─── Segmented Toggle ────────────────────────────────────────────────────────

const UpgradeModeToggle = ({
  value,
  onChange,
  partialLabel,
  activeColor = "bg-purple-600",
  idleColor = "text-purple-500 hover:text-purple-700 hover:bg-purple-100",
  containerClass = "bg-purple-50 border-purple-200",
}: {
  value: "full" | "partial";
  onChange: (v: "full" | "partial") => void;
  partialLabel: string;
  activeColor?: string;
  idleColor?: string;
  containerClass?: string;
}) => (
  <div className={`inline-flex rounded-full border p-0.5 text-[11px] select-none ${containerClass}`}>
    <button
      type="button"
      onClick={() => onChange("full")}
      className={`px-3 py-1.5 rounded-full font-semibold transition-all duration-200 ${
        value === "full" ? `${activeColor} text-white shadow` : idleColor
      }`}
    >
      ประเมินใหม่ทั้งหมด
    </button>
    <button
      type="button"
      onClick={() => onChange("partial")}
      className={`px-3 py-1.5 rounded-full font-semibold transition-all duration-200 ${
        value === "partial" ? `${activeColor} text-white shadow` : idleColor
      }`}
    >
      {partialLabel}
    </button>
  </div>
);

// ─── Upgrade / Renew Settings Panel ─────────────────────────────────────────

interface SettingsPanelProps {
  catId: number;
  initialMode: string | null;
  initialLevelId: number | null;
  scoringLevels: ScoringLevel[];
  onSave: (catId: number, mode: string, levelId: number | null) => Promise<void>;
  onModeChange?: (mode: "full" | "partial") => void;
  onLevelChange?: (levelId: number | null) => void;
  partialLabel: string;
  modeLabel: string;
  levelLabel: string;
  accentText: string;
  accentBg: string;
  accentHover: string;
  toggleContainer: string;
  toggleActive: string;
  toggleIdle: string;
  borderTop: string;
}

const SettingsPanel = ({
  catId, initialMode, initialLevelId, scoringLevels, onSave,
  onModeChange, onLevelChange,
  partialLabel, modeLabel, levelLabel,
  accentText, accentBg, accentHover,
  toggleContainer, toggleActive, toggleIdle, borderTop,
}: SettingsPanelProps) => {
  const [mode, setMode] = useState<"full" | "partial">((initialMode as "full" | "partial") ?? "full");
  const [levelId, setLevelId] = useState<number | null>(initialLevelId ?? null);
  const [saving, setSaving] = useState(false);

  const isDirty = mode !== (initialMode ?? "full") || levelId !== initialLevelId;

  const handleModeChange = (v: "full" | "partial") => {
    setMode(v);
    onModeChange?.(v);
  };

  const handleLevelChange = (id: number | null) => {
    setLevelId(id);
    onLevelChange?.(id);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(catId, mode, levelId); } finally { setSaving(false); }
  };

  return (
    <div className={`pt-3 border-t ${borderTop} space-y-3`}>
      {/* Mode row */}
      <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-1">
        <span className={`text-[11px] font-semibold ${accentText}`}>{modeLabel}</span>
        <UpgradeModeToggle
          value={mode}
          onChange={handleModeChange}
          partialLabel={partialLabel}
          activeColor={toggleActive}
          idleColor={toggleIdle}
          containerClass={toggleContainer}
        />

        {/* Level row — shares the grid */}
        <span className={`text-[11px] font-semibold self-start pt-1 ${accentText}`}>{levelLabel}</span>
        <div>
          {scoringLevels.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              ยังไม่มีระดับการประเมิน (ตั้งค่าได้ที่ เกณฑ์การให้คะแนน)
            </span>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleLevelChange(null)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border-2 transition-all duration-200 ${
                  levelId === null
                    ? "bg-gray-200 border-gray-500 text-gray-700 scale-105 outline outline-2 outline-gray-300 outline-offset-2"
                    : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
              >
                ทุกระดับ
              </button>
              {scoringLevels.map((level) => {
                const selected = levelId === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => handleLevelChange(selected ? null : level.id)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold border-2 transition-all duration-200"
                    style={{
                      backgroundColor: selected ? level.color + "30" : level.color + "12",
                      borderColor: level.color,
                      color: level.color,
                      outline: selected ? `2px solid ${level.color}40` : "none",
                      outlineOffset: "2px",
                      transform: selected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {level.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isDirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className={`h-7 text-[11px] gap-1.5 text-white ${accentBg} ${accentHover}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            บันทึกการตั้งค่า
          </Button>
        </div>
      )}
    </div>
  );
};

const UpgradeSettingsPanel = (props: Omit<SettingsPanelProps, "partialLabel"|"modeLabel"|"levelLabel"|"accentText"|"accentBg"|"accentHover"|"toggleContainer"|"toggleActive"|"toggleIdle"|"borderTop">) => (
  <SettingsPanel
    {...props}
    partialLabel="ใช้แค่หมวดอัพเกรด"
    modeLabel="โหมดอัพเกรด"
    levelLabel="ระดับที่อัพเกรดได้"
    accentText="text-purple-700"
    accentBg="bg-purple-600"
    accentHover="hover:bg-purple-700"
    toggleContainer="bg-purple-50 border-purple-200"
    toggleActive="bg-purple-600"
    toggleIdle="text-purple-500 hover:text-purple-700 hover:bg-purple-100"
    borderTop="border-purple-100"
  />
);

const RenewSettingsPanel = (props: Omit<SettingsPanelProps, "partialLabel"|"modeLabel"|"levelLabel"|"accentText"|"accentBg"|"accentHover"|"toggleContainer"|"toggleActive"|"toggleIdle"|"borderTop">) => (
  <SettingsPanel
    {...props}
    partialLabel="ใช้แค่หมวดต่ออายุ"
    modeLabel="โหมดต่ออายุ"
    levelLabel="ระดับที่ต่ออายุได้"
    accentText="text-emerald-700"
    accentBg="bg-emerald-600"
    accentHover="hover:bg-emerald-700"
    toggleContainer="bg-emerald-50 border-emerald-200"
    toggleActive="bg-emerald-600"
    toggleIdle="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100"
    borderTop="border-emerald-100"
  />
);

// ─── Preview Panel ───────────────────────────────────────────────────────────

interface PreviewPanelProps {
  newCats: DbCategory[];
  upgradCats: DbCategory[];
  renewCats: DbCategory[];
  upgradeMode: "full" | "partial";
  upgradeLevelId: number | null;
  renewMode: "full" | "partial";
  renewLevelId: number | null;
  scoringLevels: ScoringLevel[];
}

const PreviewPanel = ({
  newCats, upgradCats, renewCats,
  upgradeMode, upgradeLevelId,
  renewMode, renewLevelId,
  scoringLevels,
}: PreviewPanelProps) => {
  const sorted = (arr: DbCategory[]) => [...arr].sort((a, b) => a.sortOrder - b.sortOrder);

  const normalView = sorted(newCats);
  const upgradeView = sorted(upgradeMode === "full" ? [...newCats, ...upgradCats] : [...upgradCats]);
  const renewView = sorted(renewMode === "full" ? [...newCats, ...renewCats] : [...renewCats]);

  const upgradeLevel = scoringLevels.find((l) => l.id === upgradeLevelId);
  const renewLevel = scoringLevels.find((l) => l.id === renewLevelId);

  const PreviewCatRow = ({ cat }: { cat: DbCategory }) => {
    const isUpgrad = isUpgradType(cat.scoreType);
    const isRenew = isRenewType(cat.scoreType);
    const rowCls = isUpgrad
      ? "bg-purple-50 text-purple-800 border-purple-100"
      : isRenew
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : "bg-blue-50 text-blue-800 border-blue-100";
    const isYesNo = cat.scoreType.includes("yes_no");
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] ${rowCls}`}>
        <span className="flex-1 font-medium truncate">{cat.name}</span>
        {isYesNo ? (
          <span className="shrink-0 opacity-60">ใช่/ไม่ใช่</span>
        ) : cat.maxScore > 0 ? (
          <span className="shrink-0 opacity-60 font-semibold">{cat.maxScore}</span>
        ) : null}
      </div>
    );
  };

  const ScenarioBlock = ({
    title, cats, level, accentBg, accentBorder, accentHeader, tag,
  }: {
    title: string;
    cats: DbCategory[];
    level?: ScoringLevel;
    accentBg: string;
    accentBorder: string;
    accentHeader: string;
    tag?: string;
  }) => {
    const scoreSum = cats.filter((c) => !c.scoreType.includes("yes_no")).reduce((s, c) => s + c.maxScore, 0);
    return (
      <div className={`rounded-lg border ${accentBorder} overflow-hidden`}>
        <div className={`px-3 py-1.5 ${accentBg} ${accentHeader} border-b ${accentBorder} flex items-center gap-2`}>
          <span className="text-[11px] font-bold flex-1">{title}</span>
          {tag && <span className="text-[10px] opacity-70 italic">{tag}</span>}
          {level && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ backgroundColor: level.color }}
            >
              {level.name}
            </span>
          )}
        </div>
        <div className="px-2 py-1.5 space-y-1">
          {cats.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-1">ไม่มีหมวด</p>
          ) : (
            cats.map((c) => <PreviewCatRow key={c.id + c.scoreType} cat={c} />)
          )}
          {cats.length > 0 && scoreSum > 0 && (
            <div className="flex justify-end pt-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold">รวม {scoreSum} คะแนน</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-0.5">
        <span className="text-xs font-bold text-foreground">ตัวอย่างที่ผู้ประเมินเห็น</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <ScenarioBlock
        title="ประเมินปกติ"
        cats={normalView}
        accentBg="bg-blue-50"
        accentBorder="border-blue-200"
        accentHeader="text-blue-700"
      />

      {upgradCats.length > 0 && (
        <ScenarioBlock
          title="อัพเกรด"
          cats={upgradeView}
          level={upgradeLevel}
          tag={upgradeMode === "full" ? "ประเมินใหม่ทั้งหมด" : "เฉพาะหมวดอัพเกรด"}
          accentBg="bg-purple-50"
          accentBorder="border-purple-200"
          accentHeader="text-purple-700"
        />
      )}

      {renewCats.length > 0 && (
        <ScenarioBlock
          title="ต่ออายุ"
          cats={renewView}
          level={renewLevel}
          tag={renewMode === "full" ? "ประเมินใหม่ทั้งหมด" : "เฉพาะหมวดต่ออายุ"}
          accentBg="bg-emerald-50"
          accentBorder="border-emerald-200"
          accentHeader="text-emerald-700"
        />
      )}
    </div>
  );
};

// ─── Category Item ───────────────────────────────────────────────────────────

const SCORE_BADGE: Record<string, { label: string; cls: string }> = {
  "score_new":    { label: "คะแนน",            cls: "border-blue-300 text-blue-600 bg-blue-50" },
  "yes_no_new":   { label: "ใช่/ไม่ใช่",       cls: "border-orange-300 text-orange-600 bg-orange-50" },
  "score_upgrad": { label: "ปรับเกณฑ์",        cls: "border-purple-300 text-purple-600 bg-purple-50" },
  "yes_no_upgrad":{ label: "ใช่/ไม่ใช่ (อัพ)",  cls: "border-teal-300 text-teal-600 bg-teal-50" },
  "score_renew":  { label: "ต่ออายุ",           cls: "border-emerald-300 text-emerald-600 bg-emerald-50" },
  "yes_no_renew": { label: "ใช่/ไม่ใช่ (ต่อ)",  cls: "border-amber-300 text-amber-600 bg-amber-50" },
  // backward compat
  "score":        { label: "คะแนน",            cls: "border-blue-300 text-blue-600 bg-blue-50" },
  "upgrade":      { label: "ปรับเกณฑ์",        cls: "border-purple-300 text-purple-600 bg-purple-50" },
  "yes_no":       { label: "ผ่าน/ไม่ผ่าน",    cls: "border-orange-300 text-orange-600 bg-orange-50" },
};

const isUpgradType = (t: DbScoreType) =>
  t === "score_upgrad" || t === "yes_no_upgrad" || t === "upgrade" || t === "yes_no";

const isRenewType = (t: DbScoreType) => t === "score_renew" || t === "yes_no_renew";

interface CategoryItemProps {
  cat: DbCategory;
  topicCount: number;
  indicatorCount: number;
  onEdit: (updated: DbCategory) => void;
  onDelete: (id: number) => void;
}

const CategoryItem = ({ cat, topicCount, indicatorCount, onEdit, onDelete }: CategoryItemProps) => {
  const scoreBadge = SCORE_BADGE[cat.scoreType] ?? { label: cat.scoreType, cls: "border-gray-300 text-gray-600 bg-gray-50" };

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground truncate">{cat.name}</p>
            <Badge variant="outline" className={`text-xs ${scoreBadge.cls}`}>{scoreBadge.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            ลำดับที่ {cat.sortOrder} · {topicCount} ประเด็น · {indicatorCount} ตัวชี้วัด
            {!cat.scoreType.includes("yes_no") && ` · คะแนนเต็ม ${cat.maxScore}`}
          </p>
        </div>
        <EditCategoryDialog
          category={{ id: cat.id, name: cat.name, maxScore: cat.maxScore, maxScorePct: cat.maxScorePct, sortOrder: cat.sortOrder, scoreType: cat.scoreType }}
          onSave={(updated) => onEdit({ ...cat, name: updated.name, maxScore: updated.maxScore, maxScorePct: updated.maxScorePct, sortOrder: updated.sortOrder, scoreType: updated.scoreType })}
        />
        {topicCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground opacity-40 cursor-not-allowed h-8 w-8" disabled>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>ไม่สามารถลบได้ เนื่องจากมี {topicCount} ประเด็นอยู่ในหมวดนี้</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <AlertActionPopup
            action={() => onDelete(cat.id)}
            type="delete" title="ยืนยันการลบหมวด"
            description={`คุณต้องการลบหมวด "${cat.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          />
        )}
      </div>

    </div>
  );
};

// ─── Program Card ─────────────────────────────────────────────────────────────

const isNewType = (t: DbScoreType) => t === "score_new" || t === "yes_no_new" || t === "score";

interface ProgramCardProps {
  program: DbProgram;
  categories: DbCategory[];
  scoringLevels: ScoringLevel[];
  topicCounts: Record<number, number>;
  indicatorCounts: Record<number, number>;
  onAddCategory: (data: { name: string; maxScore: number; maxScorePct: number; sortOrder: number; scoreType: AddScoreType }, programId: string) => void;
  onEditCategory: (updated: DbCategory) => void;
  onDeleteCategory: (id: number) => void;
  onSaveUpgradeForProgram: (programId: string, mode: string, levelId: number | null) => Promise<void>;
  onSaveRenewForProgram: (programId: string, mode: string, levelId: number | null) => Promise<void>;
  onCopyUpgradeToRenew: (programId: string) => Promise<void>;
  onCopyRenewToUpgrade: (programId: string) => Promise<void>;
}

const ProgramCard = ({
  program, categories, scoringLevels, topicCounts, indicatorCounts,
  onAddCategory, onEditCategory, onDeleteCategory, onSaveUpgradeForProgram, onSaveRenewForProgram,
  onCopyUpgradeToRenew, onCopyRenewToUpgrade,
}: ProgramCardProps) => {
  const [open, setOpen] = useState(false);
  const [addingType, setAddingType] = useState<AddScoreType | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<"new" | "upgrad" | "renew" | null>(null);
  const [pendingCopy, setPendingCopy] = useState<"toRenew" | "toUpgrade" | null>(null);

  const newCategories = categories.filter((c) => isNewType(c.scoreType));
  const upgradCategories = categories.filter((c) => isUpgradType(c.scoreType));
  const renewCategories = categories.filter((c) => isRenewType(c.scoreType));

  // Live preview state — syncs with saved DB values, updates instantly when toggle changes
  const [liveUpgradeMode, setLiveUpgradeMode] = useState<"full" | "partial">(
    (upgradCategories[0]?.upgradeMode as "full" | "partial") ?? "full"
  );
  const [liveUpgradeLevelId, setLiveUpgradeLevelId] = useState<number | null>(
    upgradCategories[0]?.upgradeScoringLevelId ?? null
  );
  const [liveRenewMode, setLiveRenewMode] = useState<"full" | "partial">(
    (renewCategories[0]?.renewMode as "full" | "partial") ?? "full"
  );
  const [liveRenewLevelId, setLiveRenewLevelId] = useState<number | null>(
    renewCategories[0]?.renewScoringLevelId ?? null
  );

  useEffect(() => {
    setLiveUpgradeMode((upgradCategories[0]?.upgradeMode as "full" | "partial") ?? "full");
    setLiveUpgradeLevelId(upgradCategories[0]?.upgradeScoringLevelId ?? null);
  }, [upgradCategories[0]?.upgradeMode, upgradCategories[0]?.upgradeScoringLevelId]);

  useEffect(() => {
    setLiveRenewMode((renewCategories[0]?.renewMode as "full" | "partial") ?? "full");
    setLiveRenewLevelId(renewCategories[0]?.renewScoringLevelId ?? null);
  }, [renewCategories[0]?.renewMode, renewCategories[0]?.renewScoringLevelId]);

  const totalNormal = categories
    .filter((c) => c.scoreType === "score_new" || c.scoreType === "score")
    .reduce((sum, c) => sum + c.maxScore, 0);
  const totalUpgrade = categories
    .filter((c) => ["score_new", "score", "score_upgrad", "upgrade"].includes(c.scoreType))
    .reduce((sum, c) => sum + c.maxScore, 0);
  const totalRenew = categories
    .filter((c) => ["score_new", "score", "score_renew"].includes(c.scoreType))
    .reduce((sum, c) => sum + c.maxScore, 0);

  const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1;

  const handleAddClick = (type: AddScoreType) => { setAddingType(type); setExpandedGroup(null); };
  const toggleGroup = (group: "new" | "upgrad" | "renew") =>
    setExpandedGroup((prev) => (prev === group ? null : group));

  const SectionDivider = ({ label, color, line }: { label: string; color: string; line: string }) => (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
      <div className={`h-px flex-1 ${line}`} />
    </div>
  );

  const hasSpecialCats = upgradCategories.length > 0 || renewCategories.length > 0;

  const suffixType = '_' + (addingType ?? "score_new").split('_').pop();
  
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-accent/30 bg-accent/10 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{program.name}</p>
              <p className="text-xs text-muted-foreground">{categories.length} หมวด</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <div className={`rounded-lg border px-3 py-1 text-xs font-semibold ${totalNormal === 0 ? "text-red-600 bg-red-50 border-red-200" : "text-green-600 bg-green-50 border-green-200"}`}>
                รวม {totalNormal}
              </div>
              {upgradCategories.length > 0 && (
                <div className="rounded-lg border px-3 py-1 text-xs font-semibold border-purple-300 text-purple-600 bg-purple-50">
                  รวมอัพเกรด {totalUpgrade}
                </div>
              )}
              {renewCategories.length > 0 && (
                <div className="rounded-lg border px-3 py-1 text-xs font-semibold border-emerald-300 text-emerald-600 bg-emerald-50">
                  รวมต่ออายุ {totalRenew}
                </div>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className={`border-t flex ${hasSpecialCats ? "flex-col xl:flex-row" : ""}`}>

            {/* ─── Side 1: Admin Settings ─── */}
            <div className="flex-1 min-w-0 px-4 py-3 space-y-3">
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีหมวดในโครงการนี้</p>
              )}

              {newCategories.length > 0 && (
                <div className="space-y-2">
                  <SectionDivider label="หมวดปกติ" color="text-blue-600" line="bg-blue-100" />
                  {newCategories.map((cat) => (
                    <CategoryItem key={cat.id} cat={cat} topicCount={topicCounts[cat.id] || 0} indicatorCount={indicatorCounts[cat.id] || 0} onEdit={onEditCategory} onDelete={onDeleteCategory} />
                  ))}
                </div>
              )}

              {upgradCategories.length > 0 && (
                <div className="space-y-2">
                  <SectionDivider label="หมวดอัพเกรด" color="text-purple-600" line="bg-purple-100" />
                  {upgradCategories.map((cat) => (
                    <CategoryItem key={cat.id} cat={cat} topicCount={topicCounts[cat.id] || 0} indicatorCount={indicatorCounts[cat.id] || 0} onEdit={onEditCategory} onDelete={onDeleteCategory} />
                  ))}
                </div>
              )}

              {renewCategories.length > 0 && (
                <div className="space-y-2">
                  <SectionDivider label="หมวดต่ออายุ" color="text-emerald-600" line="bg-emerald-100" />
                  {renewCategories.map((cat) => (
                    <CategoryItem key={cat.id} cat={cat} topicCount={topicCounts[cat.id] || 0} indicatorCount={indicatorCounts[cat.id] || 0} onEdit={onEditCategory} onDelete={onDeleteCategory} />
                  ))}
                </div>
              )}

              {/* ─── Add buttons ─── */}
              <div className="pt-1 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleGroup("new")}>
                    <Plus className="h-3.5 w-3.5" /> เพิ่มหมวด
                    {expandedGroup === "new" ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                  </Button>
                  {expandedGroup === "new" && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleAddClick("score_new")}>
                        <Plus className="h-3.5 w-3.5" /> แบบคะแนน
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => handleAddClick("yes_no_new")}>
                        <Plus className="h-3.5 w-3.5" /> แบบใช่/ไม่ใช่
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => toggleGroup("upgrad")}>
                    <Plus className="h-3.5 w-3.5" /> เพิ่มหมวดอัพเกณฑ์
                    {expandedGroup === "upgrad" ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                  </Button>
                  {expandedGroup === "upgrad" && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => handleAddClick("score_upgrad")}>
                        <Plus className="h-3.5 w-3.5" /> แบบคะแนน
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => handleAddClick("yes_no_upgrad")}>
                        <Plus className="h-3.5 w-3.5" /> แบบใช่/ไม่ใช่
                      </Button>
                      {renewCategories.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5 border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100" onClick={() => { setPendingCopy("toUpgrade"); setExpandedGroup(null); }}>
                          คัดลอกจากหมวดต่ออายุ ({renewCategories.length})
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => toggleGroup("renew")}>
                    <Plus className="h-3.5 w-3.5" /> เพิ่มหมวดต่ออายุ
                    {expandedGroup === "renew" ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                  </Button>
                  {expandedGroup === "renew" && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleAddClick("score_renew")}>
                        <Plus className="h-3.5 w-3.5" /> แบบคะแนน
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => handleAddClick("yes_no_renew")}>
                        <Plus className="h-3.5 w-3.5" /> แบบใช่/ไม่ใช่
                      </Button>
                      {upgradCategories.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5 border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={() => { setPendingCopy("toRenew"); setExpandedGroup(null); }}>
                          คัดลอกจากหมวดอัพเกรด ({upgradCategories.length})
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <AddCategoryDialog
                open={addingType !== null}
                onOpenChange={(v) => { if (!v) setAddingType(null); }}
                scoreType={addingType ?? "score_new"}
                nextSortOrder={nextSortOrder}
                orderList={categories.filter(c => c.scoreType.endsWith(suffixType)).map(c => c.sortOrder)}
                onAdd={(data) => { onAddCategory(data, program.id); setAddingType(null); }}
              />

              {/* ─── Copy confirmation ─── */}
               <AlertActionPopup
                open={pendingCopy !== null} 
                onOpenChange={(v) => { if (!v) setPendingCopy(null); }}
                action={() => {
                  const type = pendingCopy;
                  setPendingCopy(null);
                  if (type === "toRenew")
                    onCopyUpgradeToRenew(program.id);
                  else onCopyRenewToUpgrade(program.id);
                }}
                title={
                  pendingCopy === "toRenew"
                    ? "คัดลอกหมวดอัพเกรด → ต่ออายุ"
                    : "คัดลอกหมวดต่ออายุ → อัพเกรด"
                }
                description={
                  pendingCopy === "toRenew"
                    ? `จะสร้างหมวดต่ออายุใหม่ ${upgradCategories.length} หมวดจากหมวดอัพเกรด${renewCategories.length > 0 ? ` และลบหมวดต่ออายุเดิม ${renewCategories.length} หมวดทิ้ง` : ""} ดำเนินการต่อหรือไม่?`
                    : `จะสร้างหมวดอัพเกรดใหม่ ${renewCategories.length} หมวดจากหมวดต่ออายุ${upgradCategories.length > 0 ? ` และลบหมวดอัพเกรดเดิม ${upgradCategories.length} หมวดทิ้ง` : ""} ดำเนินการต่อหรือไม่?`
                }
                labelButtonLeft="ยกเลิก"
                labelButtonRight="ดำเนินการ"
              />

              {upgradCategories.length > 0 && (
                <div className="space-y-2 pt-1">
                  <SectionDivider label="ตั้งค่าการอัพเกรด" color="text-purple-600" line="bg-purple-100" />
                  <div className="rounded-lg border border-purple-200 bg-purple-50/30 px-3 pt-2 pb-3">
                    <UpgradeSettingsPanel
                      catId={upgradCategories[0].id}
                      initialMode={upgradCategories[0].upgradeMode}
                      initialLevelId={upgradCategories[0].upgradeScoringLevelId}
                      scoringLevels={scoringLevels}
                      onSave={(_, mode, levelId) => onSaveUpgradeForProgram(program.id, mode, levelId)}
                      onModeChange={setLiveUpgradeMode}
                      onLevelChange={setLiveUpgradeLevelId}
                    />
                  </div>
                </div>
              )}

              {renewCategories.length > 0 && (
                <div className="space-y-2 pt-1">
                  <SectionDivider label="ตั้งค่าการต่ออายุ" color="text-emerald-600" line="bg-emerald-100" />
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 pt-2 pb-3">
                    <RenewSettingsPanel
                      catId={renewCategories[0].id}
                      initialMode={renewCategories[0].renewMode}
                      initialLevelId={renewCategories[0].renewScoringLevelId}
                      scoringLevels={scoringLevels}
                      onSave={(_, mode, levelId) => onSaveRenewForProgram(program.id, mode, levelId)}
                      onModeChange={setLiveRenewMode}
                      onLevelChange={setLiveRenewLevelId}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── Side 2: Preview (only when upgrade or renew cats exist) ─── */}
            {hasSpecialCats && (
              <>
                <div className="hidden xl:block w-px bg-border shrink-0" />
                <div className="xl:w-72 shrink-0 px-4 py-3 border-t xl:border-t-0 bg-muted/20">
                  <PreviewPanel
                    newCats={newCategories}
                    upgradCats={upgradCategories}
                    renewCats={renewCategories}
                    upgradeMode={liveUpgradeMode}
                    upgradeLevelId={liveUpgradeLevelId}
                    renewMode={liveRenewMode}
                    renewLevelId={liveRenewLevelId}
                    scoringLevels={scoringLevels}
                  />
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SettingsCategories = () => {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [scoringLevels, setScoringLevels] = useState<ScoringLevel[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({});
  const [indicatorCounts, setIndicatorCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [catRes, progRes, topicRes, indRes, levelRes] = await Promise.all([
        apiClient.get<DbCategory[]>("categories"),
        apiClient.get<DbProgram[]>("programs/names-with-sort"),
        apiClient.get<any[]>("topics"),
        apiClient.get<any[]>("indicators"),
        apiClient.get<ScoringLevel[]>("scoring-levels"),
      ]);

      setCategories(catRes.data.map((c: DbCategory) => ({
        ...c,
        scoreType: (c.scoreType as string).replace(/-/g, "_") as DbScoreType,
      })));
      setPrograms(progRes.data);
      setScoringLevels(levelRes.data);

      const tCounts: Record<number, number> = {};
      const iCounts: Record<number, number> = {};
      const topicToCat: Record<string, number> = {};

      topicRes.data.forEach((t) => {
        tCounts[t.categoryId] = (tCounts[t.categoryId] || 0) + 1;
        topicToCat[t.id] = t.categoryId;
      });

      indRes.data.forEach((ind) => {
        const catId = topicToCat[ind.topicId];
        if (catId) iCounts[catId] = (iCounts[catId] || 0) + 1;
      });

      setTopicCounts(tCounts);
      setIndicatorCounts(iCounts);
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleAddCategory = async (data: { name: string; maxScore: number; maxScorePct: number; sortOrder: number; scoreType: AddScoreType }, programId: string) => {
    try {
      await apiClient.post("categories", { ...data, isDefault: false, programId });
      toast({ title: "เพิ่มหมวดสำเร็จ", description: `หมวด "${data.name}" ถูกเพิ่มเข้าระบบแล้ว`, variant: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await apiClient.delete(`categories/${id}`);
      toast({ title: "ลบหมวดสำเร็จ", variant: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleEditCategory = async (updated: DbCategory) => {
    try {
      await apiClient.patch(`categories/${updated.id}`, {
        name: updated.name,
        maxScore: updated.maxScore,
        maxScorePct: updated.maxScorePct,
        sortOrder: updated.sortOrder,
        scoreType: updated.scoreType,
      });
      toast({ title: "แก้ไขหมวดสำเร็จ", description: `หมวด "${updated.name}" ถูกอัปเดตแล้ว`, variant: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleSaveUpgradeForProgram = async (programId: string, mode: string, levelId: number | null) => {
    const upgradCats = categories.filter(
      (c) => c.programId === programId && isUpgradType(c.scoreType)
    );
    await Promise.all(
      upgradCats.map((c) =>
        apiClient.patch(`categories/${c.id}`, { upgradeMode: mode, upgradeScoringLevelId: levelId })
      )
    );
    toast({ title: "บันทึกการตั้งค่าอัพเกรดสำเร็จ", variant: "success" });
    fetchData();
  };

  const handleSaveRenewForProgram = async (programId: string, mode: string, levelId: number | null) => {
    const renewCats = categories.filter(
      (c) => c.programId === programId && isRenewType(c.scoreType)
    );
    await Promise.all(
      renewCats.map((c) =>
        apiClient.patch(`categories/${c.id}`, { renewMode: mode, renewScoringLevelId: levelId })
      )
    );
    toast({ title: "บันทึกการตั้งค่าต่ออายุสำเร็จ", variant: "success" });
    fetchData();
  };

  const handleCopyUpgradeToRenew = async (programId: string) => {
    const upgradCats = categories.filter((c) => c.programId === programId && isUpgradType(c.scoreType));
    const existingRenewCats = categories.filter((c) => c.programId === programId && isRenewType(c.scoreType));
    try {
      await Promise.all(existingRenewCats.map((c) => apiClient.delete(`categories/${c.id}`)));
      await Promise.all(
        upgradCats.map((c) => {
          const renewType = (c.scoreType === "score_upgrad" || c.scoreType === "upgrade") ? "score_renew" : "yes_no_renew";
          return apiClient.post("categories", { name: c.name, maxScore: c.maxScore, sortOrder: c.sortOrder, scoreType: renewType, isDefault: false, programId });
        })
      );
      toast({ title: `คัดลอก ${upgradCats.length} หมวดอัพเกรดเป็นหมวดต่ออายุสำเร็จ`, variant: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleCopyRenewToUpgrade = async (programId: string) => {
    const renewCats = categories.filter((c) => c.programId === programId && isRenewType(c.scoreType));
    const existingUpgradCats = categories.filter((c) => c.programId === programId && isUpgradType(c.scoreType));
    try {
      await Promise.all(existingUpgradCats.map((c) => apiClient.delete(`categories/${c.id}`)));
      await Promise.all(
        renewCats.map((c) => {
          const upgradType = c.scoreType === "score_renew" ? "score_upgrad" : "yes_no_upgrad";
          return apiClient.post("categories", { name: c.name, maxScore: c.maxScore, sortOrder: c.sortOrder, scoreType: upgradType, isDefault: false, programId });
        })
      );
      toast({ title: `คัดลอก ${renewCats.length} หมวดต่ออายุเป็นหมวดอัพเกรดสำเร็จ`, variant: "success" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const glassCard = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header — frozen */}
      <div className="px-6 py-4 rounded-2xl shrink-0" style={glassCard}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <FolderTree className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>จัดการหมวด</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>เพิ่ม ลบ หรือแก้ไขหมวดเกณฑ์การประเมินตามโครงการ</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glassCard}>
        <div className="h-full overflow-y-auto px-6 py-4 space-y-4">
          {programs.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--green-muted)" }}>ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
          )}
          {programs.map((program) => {
            const programCategories = categories
              .filter((c) => c.programId === program.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const programLevels = scoringLevels
              .filter((l) => l.programId === program.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <ProgramCard
                key={program.id}
                program={program}
                categories={programCategories}
                scoringLevels={programLevels}
                topicCounts={topicCounts}
                indicatorCounts={indicatorCounts}
                onAddCategory={handleAddCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onSaveUpgradeForProgram={handleSaveUpgradeForProgram}
                onSaveRenewForProgram={handleSaveRenewForProgram}
                onCopyUpgradeToRenew={handleCopyUpgradeToRenew}
                onCopyRenewToUpgrade={handleCopyRenewToUpgrade}
              />
            );
          })}

          {categories.some((c) => !c.programId) && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-2">
              <p className="font-semibold text-sm text-muted-foreground">หมวดที่ยังไม่ได้ผูกกับโครงการ</p>
              {categories.filter((c) => !c.programId).map((cat) => (
                <CategoryItem
                  key={cat.id}
                  cat={cat}
                  topicCount={topicCounts[cat.id] || 0}
                  indicatorCount={indicatorCounts[cat.id] || 0}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsCategories;
