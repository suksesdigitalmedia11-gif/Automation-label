"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Activity,
  Search,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  PencilLine,
  Trash2,
  User,
  Clock,
  Calendar,
  Filter,
  X,
  Eye,
} from "lucide-react";
import type { AuditLogRow } from "@/actions/audit-log-actions";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
  initialData: AuditLogRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  actionFilter: string;
  searchFilter: string;
  startDate: string;
  endDate: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: {
    label: "Buat",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: <PlusCircle className="h-3.5 w-3.5" />,
  },
  UPDATE: {
    label: "Edit",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: <PencilLine className="h-3.5 w-3.5" />,
  },
  DELETE: {
    label: "Hapus",
    color: "bg-red-500/10 text-red-400 border-red-500/30",
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
};

function formatDate(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelativeTime(d: Date | string) {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return formatDate(d);
}

function shortId(id: string) {
  return id.slice(0, 8) + "...";
}

// ─── Changes Viewer ────────────────────────────────────────────────────────

function ChangesViewer({ changes }: { changes: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);

  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-slate-600 text-xs">—</span>;
  }

  const fieldLabels: Record<string, string> = {
    rollId: "Roll",
    transactionDate: "Tanggal",
    quantity: "Qty",
    numberOfDetails: "Jml Detail",
    printWidth: "Lebar Print",
    printHeight: "Tinggi Print",
    labelHeight: "Tinggi Label",
    resiNumber: "No Resi",
    path: "Path",
    status: "Status",
  };

  const statusLabels: Record<string, string> = {
    Processed: "Diproses",
    Completed: "Selesai",
    Failed: "Gagal",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <Eye className="h-3 w-3" />
        <span>{Object.keys(changes).length} field</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <div className="space-y-1.5">
            {Object.entries(changes).map(([key, value]) => {
              const label = fieldLabels[key] || key;
              let displayValue = String(value);
              if (key === "status" && statusLabels[String(value)]) {
                displayValue = statusLabels[String(value)];
              }
              if (key === "transactionDate" && typeof value === "string") {
                displayValue = formatDate(value);
              }
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-white max-w-[120px] truncate" title={displayValue}>
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function LogAktivitasClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  actionFilter,
  searchFilter,
  startDate,
  endDate,
}: Props) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState(searchFilter);
  const [action, setAction] = useState(actionFilter);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [showFilters, setShowFilters] = useState(!!startDate || !!endDate);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (action && action !== "all") params.set("action", action);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    params.set("page", "1");
    router.push(`/log-aktivitas?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setAction("all");
    setStart("");
    setEnd("");
    router.push("/log-aktivitas");
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (action && action !== "all") params.set("action", action);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    params.set("page", String(page));
    router.push(`/log-aktivitas?${params.toString()}`);
  };

  const hasActiveFilters = search || (action && action !== "all") || start || end;

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Activity className="h-7 w-7 text-blue-400" />
          Log Aktivitas
        </h1>
        <p className="text-slate-400 mt-1">
          Pantau semua aktivitas operator dan admin secara real-time
        </p>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Total Aktivitas</p>
              <Activity className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Create</p>
              <PlusCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {initialData.filter((d) => d.action === "CREATE").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Update</p>
              <PencilLine className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {initialData.filter((d) => d.action === "UPDATE").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Delete</p>
              <Trash2 className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {initialData.filter((d) => d.action === "DELETE").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-500 mb-1">Cari User</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Nama operator..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  className="pl-9 border-slate-700 bg-slate-800 text-white h-9 text-sm"
                />
              </div>
            </div>

            <div className="w-[140px]">
              <label className="block text-xs text-slate-500 mb-1">Aksi</label>
              <Select value={action} onValueChange={(v) => setAction(v ?? "all")}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 w-9 border ${showFilters ? "border-blue-500/50 text-blue-400" : "border-slate-700 text-slate-400"}`}
              title="Filter tanggal"
            >
              <Calendar className="h-4 w-4" />
            </Button>

            <Button
              onClick={applyFilters}
              size="sm"
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Filter className="h-4 w-4 mr-1" /> Filter
            </Button>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="h-9 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" /> Reset
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-800">
              <div className="w-[180px]">
                <label className="block text-xs text-slate-500 mb-1">Dari Tanggal</label>
                <Input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white h-9 text-sm"
                />
              </div>
              <div className="w-[180px]">
                <label className="block text-xs text-slate-500 mb-1">Sampai Tanggal</label>
                <Input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white h-9 text-sm"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Table ──────────────────────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 w-[170px]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Waktu
                  </div>
                </TableHead>
                <TableHead className="text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> User
                  </div>
                </TableHead>
                <TableHead className="text-slate-400">Aksi</TableHead>
                <TableHead className="text-slate-400">Entitas</TableHead>
                <TableHead className="text-slate-400">ID</TableHead>
                <TableHead className="text-slate-400">Perubahan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Activity className="h-12 w-12 text-slate-700" />
                      <div>
                        <p className="text-slate-400 font-medium">Belum ada aktivitas</p>
                        <p className="text-slate-600 text-sm mt-1">
                          Log aktivitas akan muncul saat ada transaksi dibuat, diedit, atau dihapus
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((log) => {
                  const cfg = actionConfig[log.action] || {
                    label: log.action,
                    color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
                    icon: null,
                  };

                  return (
                    <TableRow key={log.id} className="border-slate-800 group hover:bg-slate-800/30 transition-colors">
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="text-slate-300">{formatDate(log.createdAt)}</span>
                          <span className="text-slate-500">{formatTime(log.createdAt)}</span>
                          <span className="text-slate-600 text-[10px] mt-0.5">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300 border border-slate-700">
                            {log.userName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium leading-tight">
                              {log.userName || "Unknown"}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 leading-none ${
                                log.userRole === "admin"
                                  ? "border-purple-500/30 text-purple-400"
                                  : "border-slate-500/30 text-slate-400"
                              }`}
                            >
                              {log.userRole === "admin" ? "Admin" : "Operator"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {log.entityType}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                          {shortId(log.entityId)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <ChangesViewer changes={log.changes} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ─── Pagination ──────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="border-t border-slate-800 px-4 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={
                      currentPage <= 1
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, current, and neighbors
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => (
                    <PaginationItem key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-slate-600">...</span>
                      )}
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(p);
                        }}
                        isActive={p === currentPage}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* ─── Info Footer ────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 text-center">
        Halaman ini hanya dapat diakses oleh <span className="text-purple-400">Admin</span>.
        Semua perubahan operator tercatat secara otomatis.
      </p>
    </div>
  );
}
