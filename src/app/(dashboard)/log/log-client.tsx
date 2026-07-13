"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileText, Download, ScrollText, UserCog, Wand2, Plus, Pencil, Trash2 } from "lucide-react";

interface User { id: string; name: string; }
interface Log {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  detail: any;
  createdAt: string;
  user?: { name: string; email: string };
}

interface Props {
  logs: Log[];
  users: User[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  initialFilters: { userId: string; action: string; startDate: string; endDate: string; };
}

export function LogClient({ logs, users, currentPage, totalPages, totalCount, initialFilters }: Props) {
  const router = useRouter();
  const [filterUserId, setFilterUserId] = useState(initialFilters.userId);
  const [filterAction, setFilterAction] = useState(initialFilters.action);
  const [filterStartDate, setFilterStartDate] = useState(initialFilters.startDate);
  const [filterEndDate, setFilterEndDate] = useState(initialFilters.endDate);

  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filterUserId) params.set("userId", filterUserId);
    if (filterAction) params.set("action", filterAction);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);
    params.set("page", "1");
    router.push(`/log?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (filterUserId) params.set("userId", filterUserId);
    if (filterAction) params.set("action", filterAction);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);
    params.set("page", page.toString());
    router.push(`/log?${params.toString()}`);
  };

  const getActionBadge = (action: string) => {
    if (action.includes("BUAT") || action.includes("TAMBAH") || action.includes("AKTIFKAN")) return "bg-green-500/10 text-green-400 border-green-500/20";
    if (action.includes("HAPUS") || action.includes("NONAKTIFKAN")) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (action.includes("GENERATE") || action.includes("LOGIN")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    return "bg-blue-500/10 text-blue-400 border-blue-500/20"; // UBAH, SIMPAN, RESET dll
  };

  const getActionIcon = (action: string) => {
    if (action.includes("BUAT") || action.includes("TAMBAH")) return <Plus className="h-3 w-3 mr-1" />;
    if (action.includes("UBAH") || action.includes("SIMPAN")) return <Pencil className="h-3 w-3 mr-1" />;
    if (action.includes("HAPUS")) return <Trash2 className="h-3 w-3 mr-1" />;
    if (action.includes("GENERATE")) return <Wand2 className="h-3 w-3 mr-1" />;
    if (action.includes("USER")) return <UserCog className="h-3 w-3 mr-1" />;
    return <ScrollText className="h-3 w-3 mr-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ScrollText className="h-8 w-8 text-blue-400" /> Log Aktivitas
          </h1>
          <p className="mt-1 text-slate-400">Pantau seluruh aktivitas user dan transaksi sistem</p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="w-48">
              <Label className="text-xs text-slate-400 mb-1 block">User</Label>
              <Select value={filterUserId || "ALL"} onValueChange={(v) => setFilterUserId(v === "ALL" ? "" : v)}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white h-8 text-sm">
                  <SelectValue placeholder="Semua User" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="ALL">Semua User</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs text-slate-400 mb-1 block">Aksi</Label>
              <Select value={filterAction || "ALL"} onValueChange={(v) => setFilterAction(v === "ALL" ? "" : v)}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white h-8 text-sm">
                  <SelectValue placeholder="Semua Aksi" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="ALL">Semua Aksi</SelectItem>
                  <SelectItem value="BUAT_TRANSAKSI">Buat Transaksi</SelectItem>
                  <SelectItem value="UBAH_TRANSAKSI">Ubah Transaksi</SelectItem>
                  <SelectItem value="HAPUS_TRANSAKSI">Hapus Transaksi</SelectItem>
                  <SelectItem value="SIMPAN_DETAIL_NAMA">Simpan Detail Nama</SelectItem>
                  <SelectItem value="GENERATE_LABEL">Generate Label</SelectItem>
                  <SelectItem value="TAMBAH_USER">Tambah User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400 mb-1 block">Dari Tanggal</Label>
              <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="border-slate-700 bg-slate-800 text-white h-8 text-sm" />
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400 mb-1 block">Sampai Tanggal</Label>
              <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="border-slate-700 bg-slate-800 text-white h-8 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="h-8 px-4 text-sm">
                <Search className="mr-1.5 h-3.5 w-3.5" /> Cari
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-400">{totalCount} aktivitas ditemukan</div>

      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Waktu</TableHead>
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Aksi</TableHead>
                <TableHead className="text-slate-400">Entitas / Target</TableHead>
                <TableHead className="text-slate-400 text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{log.userName}</span>
                      <span className="text-slate-500 text-xs capitalize">{log.userRole}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getActionBadge(log.action)}`}>
                      {getActionIcon(log.action)} {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-slate-300 text-sm font-medium">{log.entity}</span>
                      {log.entityLabel && <span className="text-slate-500 text-xs truncate max-w-[200px]">{log.entityLabel}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 h-7 text-xs">
                      <FileText className="mr-1 h-3.5 w-3.5" /> Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">Tidak ada log aktivitas yang ditemukan.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" onClick={e => { e.preventDefault(); if(currentPage>1) handlePageChange(currentPage-1); }} /></PaginationItem>
            <PaginationItem><PaginationNext href="#" onClick={e => { e.preventDefault(); if(currentPage<totalPages) handlePageChange(currentPage+1); }} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-blue-400" /> Detail Aktivitas
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div><p className="text-xs text-slate-500">Pelaku</p><p className="text-sm font-medium text-white">{selectedLog?.userName} <span className="text-slate-400 capitalize">({selectedLog?.userRole})</span></p></div>
                <div><p className="text-xs text-slate-500">Waktu</p><p className="text-sm text-slate-300">{selectedLog ? new Date(selectedLog.createdAt).toLocaleString("id-ID") : "-"}</p></div>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Aksi</p>
                  <Badge variant="outline" className={`text-xs ${selectedLog ? getActionBadge(selectedLog.action) : ""}`}>{selectedLog?.action.replace(/_/g, " ")}</Badge>
                </div>
                <div><p className="text-xs text-slate-500">Target Entitas</p><p className="text-sm text-slate-300">{selectedLog?.entity} <span className="text-slate-500">({selectedLog?.entityLabel})</span></p></div>
              </div>
            </div>

            {selectedLog?.detail?.keterangan && (
              <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg text-blue-300 text-sm">
                ℹ️ {selectedLog.detail.keterangan}
              </div>
            )}

            {(selectedLog?.detail?.sebelum || selectedLog?.detail?.sesudah) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-xs text-slate-400">DATA SEBELUM</div>
                  <pre className="p-3 text-xs text-slate-300 overflow-auto flex-1 font-mono">{JSON.stringify(selectedLog.detail.sebelum || {}, null, 2)}</pre>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-xs text-slate-400">DATA SESUDAH</div>
                  <pre className="p-3 text-xs text-green-400 overflow-auto flex-1 font-mono">{JSON.stringify(selectedLog.detail.sesudah || {}, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
