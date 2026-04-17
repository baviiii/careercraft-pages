import {
  BarChart3,
  Copy,
  Download,
  Edit,
  Eye,
  MoreVertical,
  Star,
  StarOff,
  Tag,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TEMPLATE_MAP } from "@/lib/templateMap";

import type { Resume } from "../types";

interface ResumeActionsMenuProps {
  resume: Resume;
  onPreview: (r: Resume) => void;
  onEdit: (r: Resume) => void;
  onAnalyze: (r: Resume) => void;
  onDownload: (r: Resume) => void;
  onDuplicate: (r: Resume) => void;
  onManageTags: (r: Resume) => void;
  onToggleFavorite: (r: Resume) => void;
  onDelete: (r: Resume) => void;
  /** Extra className on the trigger button (e.g. "opacity-0 group-hover:…"). */
  triggerClassName?: string;
}

/**
 * The canonical ⋮ menu for a resume. Was duplicated twice in MyResumes;
 * now there's exactly one.
 */
export const ResumeActionsMenu = ({
  resume,
  onPreview,
  onEdit,
  onAnalyze,
  onDownload,
  onDuplicate,
  onManageTags,
  onToggleFavorite,
  onDelete,
  triggerClassName = "",
}: ResumeActionsMenuProps) => {
  const hasTemplate = Boolean(resume.template_id && TEMPLATE_MAP[resume.template_id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex h-8 w-8 items-center justify-center border border-transparent text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)] transition-colors ${triggerClassName}`}
          aria-label="Resume actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="cc-root rounded-none border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] p-1 shadow-[4px_4px_0_0_var(--cc-ink)]"
      >
        <MenuRow icon={Eye} label="Preview" onSelect={() => onPreview(resume)} />
        <MenuRow icon={Edit} label="Edit in builder" onSelect={() => onEdit(resume)} />
        <MenuRow icon={BarChart3} label="Run ATS analysis" onSelect={() => onAnalyze(resume)} />
        {hasTemplate && (
          <MenuRow
            icon={Download}
            label="Download PDF"
            onSelect={() => onDownload(resume)}
          />
        )}
        <DropdownMenuSeparator className="bg-[color:var(--cc-hair-strong)] my-1" />
        <MenuRow icon={Copy} label="Duplicate" onSelect={() => onDuplicate(resume)} />
        <MenuRow icon={Tag} label="Manage tags" onSelect={() => onManageTags(resume)} />
        <MenuRow
          icon={resume.is_favorite ? StarOff : Star}
          label={resume.is_favorite ? "Remove favourite" : "Mark favourite"}
          onSelect={() => onToggleFavorite(resume)}
        />
        <DropdownMenuSeparator className="bg-[color:var(--cc-hair-strong)] my-1" />
        <MenuRow
          icon={Trash2}
          label="Delete"
          danger
          onSelect={() => onDelete(resume)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface MenuRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

const MenuRow = ({ icon: Icon, label, onSelect, danger }: MenuRowProps) => (
  <DropdownMenuItem
    onSelect={onSelect}
    className={`rounded-none cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)] ${
      danger ? "text-[color:var(--cc-rust-deep)] focus:bg-[color:var(--cc-rust-deep)]" : ""
    }`}
  >
    <Icon className="w-4 h-4 mr-2" />
    {label}
  </DropdownMenuItem>
);
