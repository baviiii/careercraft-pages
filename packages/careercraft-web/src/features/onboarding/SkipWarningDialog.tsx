import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Briefcase, MessageSquare, Newspaper } from 'lucide-react';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  saving?: boolean;
}

export function SkipWarningDialog({ open, onCancel, onConfirm, saving = false }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Skip personalisation?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2 text-sm">
            <span className="block">
              Without your career context, the following features won't be tailored to you:
            </span>
            <ul className="space-y-2">
              <Tradeoff icon={Briefcase} text="Job tracker won't filter to your target roles, locations, or salary band." />
              <Tradeoff icon={MessageSquare} text="Interview prep won't tailor questions to your role and seniority." />
              <Tradeoff icon={Newspaper} text="Career news won't surface content relevant to your industry." />
            </ul>
            <span className="mt-3 block text-muted-foreground">
              You can complete onboarding any time from Settings.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Back to setup</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={saving}>
            {saving ? 'Skipping…' : 'Skip anyway'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Tradeoff({ icon: Icon, text }: { icon: typeof Briefcase; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{text}</span>
    </li>
  );
}
