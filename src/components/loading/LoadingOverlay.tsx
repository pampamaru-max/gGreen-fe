import { Loader2 } from "lucide-react";

type LoadingProps = {
  visible: boolean;
  message?: string;
};

export function LoadingOverlay({ visible, message }: LoadingProps) {
  if (!visible) return null;

  return (
    <div className="h-screen w-screen fixed top-0 left-0 bg-black bg-opacity-20 z-[10000] flex justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && <p className="ml-4 text-lg font-medium text-primary">{message}</p>}
    </div>
  );
}
