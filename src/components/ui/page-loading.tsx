export function PageLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border-2 border-accent/20 animate-ping" />
        <div className="sp-orbit !w-12 !h-12">
          <div className="sp-orbit-center" style={{ width: 12, height: 12, margin: -6 }} />
          <div className="sp-orbit-dot" style={{ width: 12, height: 12, margin: -6 }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">กำลังโหลด</p>
        <p className="text-xs text-muted-foreground mt-0.5">กรุณารอสักครู่...</p>
      </div>
    </div>
  );
}
