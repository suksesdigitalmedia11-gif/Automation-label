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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, FileText, ScrollText, UserCog, Wand2, Plus, Pencil, Trash2,
  Clock, Activity, ChevronRight, Timer, User,
} from "lucide-react";

interface User { id: string; name: string; }
interface Log {
  id: string; userId: string; userName: string; userRole: string;
  action: string; entity: string; entityId: string | null;
  entityLabel: string | null; detail: any; createdAt: string;
}
interface TxGroup {
  entityId: string | null; entityLabel: string | null;
  mulai: string | null; selesai: string | null;
  jumlahAksi: number; userName: string; userId: string;
}

interface Props {
  logs: Log[];
  users: User[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  activeTab: string;
  initialFilters: { userId: string; action: string; startDate: string; endDate: string; };
  transaksiGroups: TxGroup[];
  txTimeline: Log[] | null;
  selectedTxId: string | null;
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} detik`;
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return `${m} menit ${s > 0 ? s + " detik" : ""}`.trim();
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} jam ${m > 0 ? m + " menit" : ""}`.trim();
}

function getDurationColor(ms: number) {
  if (ms < 300000) return "text-green-400"; // < 5 menit = cepat
  if (ms < 1800000) return "text-yellow-400"; // < 30 menit = normal
  return "text-red-400"; // >= 30 menit = lambat
}

const getActionBadge = (action: string) => {
  if (action.includes("BUAT") || action.includes("TAMBAH") || action.includes("AKTIFKAN")) return "bg-green-500/10 text-green-400 border-green-500/20";
  if (action.includes("HAPUS") || action.includes("NONAKTIFKAN")) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (action.includes("GENERATE") || action.includes("LOGIN")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
};

const getActionIcon = (action: string) => {
  if (action.includes("BUAT") || action.includes("TAMBAH")) return <Plus className="h-3 w-3 mr-1" />;
  if (action.includes("UBAH") || action.includes("SIMPAN")) return <Pencil className="h-3 w-3 mr-1" />;
  if (action.includes("HAPUS")) return <Trash2 className="h-3 w-3 mr-1" />;
  if (action.includes("GENERATE")) return <Wand2 className="h-3 w-3 mr-1" />;
  if (action.includes("USER")) return <UserCog className="h-3 w-3 mr-1" />;
  return <ScrollText className="h-3 w-3 mr-1" />;
};

export function LogClient({
  logs, users, currentPage, totalPages, totalCount,
  activeTab, initialFilters, transaksiGroups, txTimeline, selectedTxId,
}: Props) {
  const router = useRouter();
  const [filterUserId, setFilterUserId] = useState(initialFilters.userId);
  const [filterAction, setFilterAction] = useState(initialFilters.action);
  const [filterStartDate, setFilterStartDate] = useState(initialFilters.startDate);
  const [filterEndDate, setFilterEndDate] = useState(initialFilters.endDate);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const buildParams = (extras: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (filterUserId) params.set("userId", filterUserId);
    if (filterAction) params.set("action", filterAction);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);
    Object.entries(extras).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params.toString();
  };

  const applyFilters = (tab?: string) => {
    router.push(`/log?${buildParams({ page: "1", tab: tab || activeTab })}`);
  };

  const setTab = (tab: string) => {
    router.push(`/log?${buildParams({ tab })}`);
  };

  const openTimeline = (txId: string) => {
    router.push(`/log?${buildParams({ tab: "transaksi", txId })}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ScrollText className="h-8 w-8 text-blue-400" /> Log Aktivitas
          </h1>
          <p className="mt-1 text-slate-400">Pantau seluruh aktivitas user — transparan dan tidak bisa dimanipulasi</p>
        </div>
      </div>

      {/* Filter */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="w-48">
              <Label className="text-xs text-slate-400 mb-1 block">User</Label>
              <Select value={filterUserId || "ALL"} onValueChange={(v) => setFilterUserId(v === "ALL" ? "" : (v || ""))}>
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
              <Select value={filterAction || "ALL"} onValueChange={(v) => setFilterAction(v === "ALL" ? "" : (v || ""))}>
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
              <Button onClick={() => applyFilters()} className="h-8 px-4 text-sm bg-blue-600 hover:bg-blue-700">
                <Search className="mr-1.5 h-3.5 w-3.5" /> Cari
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setTab("semua")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "semua" ? "border-blue-400 text-blue-400" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Activity className="h-4 w-4 inline mr-1.5" /> Semua Aktivitas
          <Badge variant="outline" className="ml-2 text-xs border-slate-700 text-slate-500">{totalCount}</Badge>
        </button>
        <button
          onClick={() => setTab("transaksi")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "transaksi" ? "border-orange-400 text-orange-400" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Timer className="h-4 w-4 inline mr-1.5" /> Monitoring Waktu Kerja
          <Badge variant="outline" className="ml-2 text-xs border-slate-700 text-slate-500">{transaksiGroups.length}</Badge>
        </button>
      </div>

      {/* TAB: SEMUA AKTIVITAS */}
      {activeTab === "semua" && (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Waktu</TableHead>
                  <TableHead className="text-slate-400">User</TableHead>
                  <TableHead className="text-slate-400">Aksi</TableHead>
                  <TableHead className="text-slate-400">Target</TableHead>
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
      )}

      {/* TAB: MONITORING WAKTU KERJA PER TRANSAKSI */}
      {activeTab === "transaksi" && !selectedTxId && (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Transaksi</TableHead>
                  <TableHead className="text-slate-400">Operator</TableHead>
                  <TableHead className="text-slate-400">Mulai</TableHead>
                  <TableHead className="text-slate-400">Selesai</TableHead>
                  <TableHead className="text-slate-400">Durasi</TableHead>
                  <TableHead className="text-slate-400">Aksi</TableHead>
                  <TableHead className="text-slate-400 text-right">Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaksiGroups.map((g) => {
                  const durasiMs = g.mulai && g.selesai
                    ? new Date(g.selesai).getTime() - new Date(g.mulai).getTime()
                    : 0;
                  return (
                    <TableRow key={g.entityId} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="text-white font-medium text-sm max-w-[200px] truncate">
                        {g.entityLabel || g.entityId || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-slate-300 text-sm">{g.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                        {g.mulai ? new Date(g.mulai).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                        {g.selesai ? new Date(g.selesai).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold text-sm ${getDurationColor(durasiMs)}`}>
                          {durasiMs > 0 ? formatDuration(durasiMs) : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {g.jumlahAksi} aksi
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => g.entityId && openTimeline(g.entityId)}
                          className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 h-7 text-xs"
                        >
                          <ChevronRight className="mr-1 h-3.5 w-3.5" /> Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                  {transaksiGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">Belum ada data monitoring transaksi.</TableCell>
                  </TableRow>
                )}
              </TableBody>
          </Table>
          </CardContent>
        </Card>
      )}

      {/* TIMELINE DETAIL SATU TRANSAKSI */}
      {activeTab === "transaksi" && selectedTxId && txTimeline && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/log?${buildParams({ tab: "transaksi" })}`)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              ← Kembali
            </Button>
            <div>
              <p className="text-white font-semibold">{txTimeline[0]?.entityLabel || "Timeline Transaksi"}</p>
              <p className="text-slate-500 text-xs">
                {txTimeline[0] && new Date(txTimeline[0].createdAt).toLocaleString("id-ID")} —{" "}
                {txTimeline.length > 0 && new Date(txTimeline[txTimeline.length - 1].createdAt).toLocaleString("id-ID")}
                {txTimeline.length > 1 && (
                  <span className={`ml-2 font-bold ${getDurationColor(new Date(txTimeline[txTimeline.length - 1].createdAt).getTime() - new Date(txTimeline[0].createdAt).getTime())}`}>
                    ({formatDuration(new Date(txTimeline[txTimeline.length - 1].createdAt).getTime() - new Date(txTimeline[0].createdAt).getTime())})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="relative pl-6 space-y-0">
            {txTimeline.map((log, idx) => {
              const prev = idx > 0 ? txTimeline[idx - 1] : null;
              const jedaMs = prev
                ? new Date(log.createdAt).getTime() - new Date(prev.createdAt).getTime()
                : 0;

              return (
                <div key={log.id} className="relative">
                  {/* Jeda antar aksi */}
                  {jedaMs > 30000 && (
                    <div className="flex items-center gap-2 my-1 ml-2">
                      <div className="h-4 w-px bg-slate-700 mx-auto" />
                      <span className={`text-xs px-2 py-0.5 rounded border ${jedaMs > 1800000 ? "bg-red-900/20 border-red-500/30 text-red-400" : jedaMs > 300000 ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        jeda {formatDuration(jedaMs)}
                      </span>
                    </div>
                  )}

                  {/* Timeline item */}
                  <div className="flex gap-3 items-start py-2 px-3 rounded-lg hover:bg-slate-800/30 transition-colors group">
                    {/* Dot */}
                    <div className="relative flex flex-col items-center shrink-0 mt-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full border-2 z-10 ${getActionBadge(log.action).includes("green") ? "bg-green-400 border-green-400" : getActionBadge(log.action).includes("red") ? "bg-red-400 border-red-400" : getActionBadge(log.action).includes("purple") ? "bg-purple-400 border-purple-400" : "bg-blue-400 border-blue-400"}`} />
                      {idx < txTimeline.length - 1 && <div className="w-px flex-1 bg-slate-700 min-h-[20px] mt-1" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${getActionBadge(log.action)}`}>
                            {getActionIcon(log.action)} {log.action.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-slate-300 text-xs font-medium">{log.userName}</span>
                        </div>
                        <span className="text-slate-500 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>

                      {/* Detail dari log */}
                      {log.detail && (
                        <div className="mt-1.5 space-y-1">
                          {(log.detail as any).keterangan && (
                            <p className="text-slate-400 text-xs">{(log.detail as any).keterangan}</p>
                          )}
                          {/* Tampilkan daftar nama jika ada */}
                          {(log.detail as any).sesudah?.daftarNama && (
                            <div className="bg-slate-950 rounded border border-slate-800 p-2 mt-1">
                              <p className="text-slate-500 text-xs mb-1 font-medium">DAFTAR NAMA DISIMPAN:</p>
                              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {(log.detail as any).sesudah.daftarNama.map((n: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 w-5 text-right shrink-0">{i + 1}.</span>
                                    <span className="text-white font-medium">{n.nama}</span>
                                    {n.resi && n.resi !== "-" && (
                                      <span className="text-blue-400">Resi: {n.resi}</span>
                                    )}
                                    <span className="text-slate-500 ml-auto">Qty: {n.jumlah}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Sebelum/sesudah untuk edit */}
                          {(log.detail as any).sebelum && !(log.detail as any).sesudah?.daftarNama && (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div className="bg-slate-950 rounded border border-red-900/30 p-2">
                                <p className="text-red-400 text-xs mb-1 font-medium">SEBELUM</p>
                                <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-24 whitespace-pre-wrap">
                                  {JSON.stringify((log.detail as any).sebelum, null, 2)}
                                </pre>
                              </div>
                              <div className="bg-slate-950 rounded border border-green-900/30 p-2">
                                <p className="text-green-400 text-xs mb-1 font-medium">SESUDAH</p>
                                <pre className="text-xs text-green-400 font-mono overflow-auto max-h-24 whitespace-pre-wrap">
                                  {JSON.stringify((log.detail as any).sesudah, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Detail Dialog (tab semua) */}
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
            {selectedLog?.detail?.sesudah?.daftarNama && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">DAFTAR NAMA YANG DISIMPAN:</p>
                <div className="bg-slate-950 rounded border border-slate-800 p-3 max-h-64 overflow-y-auto space-y-1">
                  {selectedLog.detail.sesudah.daftarNama.map((n: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-slate-500 w-6 text-right shrink-0">{i + 1}.</span>
                      <span className="text-white font-medium flex-1">{n.nama}</span>
                      {n.resi && n.resi !== "-" && <span className="text-blue-400 text-xs">Resi: {n.resi}</span>}
                      <span className="text-slate-400 text-xs">Qty: {n.jumlah}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(selectedLog?.detail?.sebelum || (selectedLog?.detail?.sesudah && !selectedLog?.detail?.sesudah?.daftarNama)) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-xs text-slate-400">DATA SEBELUM</div>
                  <pre className="p-3 text-xs text-slate-300 overflow-auto flex-1 font-mono">{JSON.stringify(selectedLog?.detail?.sebelum || {}, null, 2)}</pre>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-xs text-slate-400">DATA SESUDAH</div>
                  <pre className="p-3 text-xs text-green-400 overflow-auto flex-1 font-mono">{JSON.stringify(selectedLog?.detail?.sesudah || {}, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
