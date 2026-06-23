import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { useZoom } from "@/contexts/ZoomContext";

export function ZoomControls() {
  const { zoom, increaseZoom, decreaseZoom, resetZoom } = useZoom();

  return (
    <div className="fixed top-20 right-4 z-50 hidden md:flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={decreaseZoom}
        disabled={zoom <= 80}
        className="h-8 w-8"
        title="축소 (최소 80%)"
      >
        <Minus className="w-4 h-4" />
      </Button>
      
      <div className="px-2 py-1 text-sm font-medium min-w-[50px] text-center">
        {zoom}%
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={increaseZoom}
        disabled={zoom >= 200}
        className="h-8 w-8"
        title="확대 (최대 200%)"
      >
        <Plus className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        size="icon"
        variant="ghost"
        onClick={resetZoom}
        className="h-8 w-8"
        title="기본값으로 복원 (100%)"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}
