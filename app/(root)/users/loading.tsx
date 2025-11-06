import { Loader2 } from "lucide-react";

const UsersLoading = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          <div className="h-6 w-52 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
      </div>

      <div className="flex items-center justify-center py-20 border rounded-md">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Đang tải dữ liệu...</span>
      </div>
    </div>
  );
};

export default UsersLoading;

