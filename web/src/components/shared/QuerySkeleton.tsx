import { Card, CardContent, CardHeader } from "@/components/common";

function ShimmerBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-muted ${className}`}>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  );
}

export function QuerySkeleton() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-3 w-3/5" />
            <ShimmerBlock className="h-3 w-2/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-11/12" />
        <ShimmerBlock className="h-3 w-4/5" />
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
        </div>
      </CardContent>
    </Card>
  );
}
