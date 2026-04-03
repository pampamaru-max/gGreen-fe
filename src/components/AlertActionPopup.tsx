import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

type popupType = "delete" | "warning";

type BaseProps = {
  open?: boolean;
  onOpenChange?(open: boolean): void;
  trigger?: ReactNode;
  type?: popupType;
  title: ReactNode;
  description: ReactNode;
  labelButtonLeft?: string;
  labelButtonRight?: string;
  buttonLeft?: ReactNode;
};

type WithCustomRightButton = BaseProps & {
  buttonRight: ReactNode;
  action?: never;
};

type WithAction = BaseProps & {
  buttonRight?: undefined;
  action: () => void;
};

type AlertActionPopupProps = WithCustomRightButton | WithAction;

export function AlertActionPopup({
  open,
  onOpenChange,
  trigger,
  action,
  type,
  title,
  description,
  labelButtonLeft,
  labelButtonRight,
  buttonLeft,
  buttonRight,
}: AlertActionPopupProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {(type || trigger) && (
        <AlertDialogTrigger asChild>
          {trigger ??
            (type == "delete" && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ))}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {buttonLeft ?? (
            <AlertDialogCancel>
              {labelButtonLeft ?? (type == "delete" && "ยกเลิก")}
            </AlertDialogCancel>
          )}
          {buttonRight ?? (
            <AlertDialogAction
              className={cn(
                type == "delete" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={action}
            >
              {labelButtonRight ?? (type == "delete" && "ลบ")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
