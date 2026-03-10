import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const TablePagination = ({ page, totalPages, totalItems, pageSize, onPageChange }: Props) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-3 h-3" />
        </Button>
        <span className="text-xs text-muted-foreground px-2">
          {page} / {totalPages}
        </span>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
