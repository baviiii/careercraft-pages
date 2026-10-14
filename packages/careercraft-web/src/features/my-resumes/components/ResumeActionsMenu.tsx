import {
  BarChart3,
  Copy,
  Download,
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
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
  onCoverLetter?: (r: Resume) => void;
  onDownload: (r: Resume) => void;
  onDuplicate: (r: Resume) => void;
  onManageTags: (r: Resume) => void;
  onToggleFavorite: (r: Resume) => void;
  onDelete: (r: Resume) => void;
  /** Extra className on the trigger button. */
  triggerClassName?: string;
}

const ITEM =
  "cc-font-sans text-sm cursor-pointer px-3 py-2 rounded-md focus:bg-[color:var(--cc-cream-2)] focus:text-[color:var(--cc-ink)]";

/** The ⋯ menu for a résumé, shared by the card and the list row. */
export const ResumeActionsMenu = ({
  resume,
  onPreview,
  onEdit,
  onAnalyze,
  onCoverLetter,
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
          type="button"
          className={`grid h-8 w-8 place-items-center rounded-lg text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)] ${triggerClassName}`}
          aria-label={`More for ${resume.name || "this résumé"}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="cc-root w-56 rounded-xl border border-[color:var(--cc-hair)] bg-white p-1.5 text-[color:var(--cc-ink)] shadow-lg"
      >
        <DropdownMenuItem onSelect={() => onPreview(resume)} className={ITEM}>
          <Eye className="mr-2 h-4 w-4" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(resume)} className={ITEM}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAnalyze(resume)} className={ITEM}>
          <BarChart3 className="mr-2 h-4 w-4" /> Check against a job
        </DropdownMenuItem>
        {onCoverLetter && (
          <DropdownMenuItem onSelect={() => onCoverLetter(resume)} className={ITEM}>
            <Mail className="mr-2 h-4 w-4" /> Write a cover letter
          </DropdownMenuItem>
        )}
        {hasTemplate && (
          <DropdownMenuItem onSelect={() => onDownload(resume)} className={ITEM}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1 bg-[color:var(--cc-hair)]" />
        <DropdownMenuItem onSelect={() => onDuplicate(resume)} className={ITEM}>
          <Copy className="mr-2 h-4 w-4" /> Make a copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onManageTags(resume)} className={ITEM}>
          <Tag className="mr-2 h-4 w-4" /> Tags
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggleFavorite(resume)} className={ITEM}>
          {resume.is_favorite ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
          {resume.is_favorite ? "Remove from favourites" : "Add to favourites"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-[color:var(--cc-hair)]" />
        <DropdownMenuItem onSelect={() => onDelete(resume)} className={`${ITEM} text-[#9C3424] focus:text-[#9C3424]`}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
