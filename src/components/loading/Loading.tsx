import { Loader2 } from "lucide-react";

type LoadingProps = {
  loading: boolean;
};

export default function Loading({ loading }: LoadingProps) {
  if (!loading) return null;

  return (
    <div className="flex flex-1 justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
