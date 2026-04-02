import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "shimmer" | "wave";
}

function Skeleton({ className, variant = "pulse", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "pulse" && "animate-pulse bg-muted",
        variant === "shimmer" && "animate-shimmer",
        variant === "wave" && "animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
