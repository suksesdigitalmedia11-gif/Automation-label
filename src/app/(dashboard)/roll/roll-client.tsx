"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ScrollText,
  Wand2,
  Download,
  Package,
  Eye,
} from "lucide-react";
import { createRoll, updateRoll, deleteRoll } from "@/actions/roll-actions";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Processed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Completed: "bg-green-500/10 text-green-400 border-green-500/20",
    Failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const labels: Record<string, string> = {
    Processed: "Diproses",
    Completed: "Selesai",
    Failed: "Gagal",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

interface Roll {
  id: string;
  rollName: string;
  heightCm: string;
  quantity: number;
  path: string | null;
  status: string;
  createdAt: string;
  outputCm?: number;
}

interface Props {
  rolls: Roll[];
  rollsWithTotal: Roll[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  search: string;
  statusFilter: string;
  userRole: string;
}

export function RollClient({
  rolls: _rolls,
  rollsWithTotal,
  currentPage,
  totalPages,
  totalCount,
  search: initialSearch,
  statusFilter: initialStatus,
  userRole,
}: Props) {
  const rolls = rollsWithTotal;
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  const [generateResult, setGenerateResult] = useState<{
    outputPath: string;
    totalLabels: number;
    totalPages: number;
    base64?: string;
  } | null>(null);

  // Roll detail
  const [rollDetail, setRollDetail] = useState<{
    transactions: Array<{
      id: string;
      date: string;
      description: string;
      resiNumbers: Array<{
        number: string | null;
        totalLabels: number;
        sampleNames: string[];
        totalNames: number;
      }>;
      status: string;
    }>;
    totalOutputCm?: number;
  } | null>(null);

  // Create form
  const [rollName, setRollName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rollPath, setRollPath] = useState("");

  // Edit form
  const [editRollName, setEditRollName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [editStatus, setEditStatus] = useState("Processed");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", "1");
    router.push(`/roll?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", page.toString());
    router.push(`/roll?${params.toString()}`);
  };

  const resetCreateForm = () => {
    setRollName("");
    setHeightCm("");
    setQuantity("1");
    setRollPath("");
  };

  const handleCreate = async () => {
    if (!rollName) {
      toast.error("Harap isi Nama Roll");
      return;
    }
    setFormLoading(true);
    try {
      const result = await createRoll({
        rollName,
        heightCm: 0,
        quantity: 1,
        path: null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Roll berhasil dibuat");
        setDialogOpen(false);
        resetCreateForm();
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (roll: Roll) => {
    setSelectedRoll(roll);
    setEditRollName(roll.rollName);
    setEditPath(roll.path || "");
    setEditStatus(roll.status);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedRoll) return;
    if (!editRollName) {
      toast.error("Nama roll wajib diisi");
      return;
    }
    setFormLoading(true);
    try {
      const result = await updateRoll(selectedRoll.id, {
        rollName: editRollName,
        path: editPath || null,
        status: editStatus as "Processed" | "Failed" | "Completed",
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Roll berhasil diupdate");
        setEditDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (roll: Roll) => {
    setSelectedRoll(roll);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRoll) return;
    setFormLoading(true);
    try {
      const result = await deleteRoll(selectedRoll.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Roll berhasil dihapus");
        setDeleteDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Generate ────────────────────────────────────────────────────────

  const openGenerateDialog = (roll: Roll) => {
    setSelectedRoll(roll);
    setGenerateResult(null);
    setGenerateDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedRoll) return;
    setGenerateLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollId: selectedRoll.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Gagal generate label");
        return;
      }
      setGenerateResult(data);
      toast.success(`Label berhasil di-generate! ${data.totalLabels} label`);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat generate");
    } finally {
      setGenerateLoading(false);
    }
  };

  // ─── Detail ──────────────────────────────────────────────────────────

  const openDetailDialog = async (roll: Roll) => {
    setSelectedRoll(roll);
    setDetailDialogOpen(true);
    setRollDetail(null);
    try {
      const res = await fetch(`/api/roll/${roll.id}/transactions`);
      const data = await res.json();
      if (data.transactions) {
        setRollDetail(data);
      }
    } catch {
      setRollDetail({ transactions: [] });
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Roll</h1>
          <p className="mt-1 text-slate-400">Kelola roll media cetak</p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Roll
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Cari nama roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="w-[160px]">
              <Select
                value={statusFilter || "all"}
                onValueChange={(val) =>
                  setStatusFilter(val === "all" ? "" : (val ?? ""))
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Processed">Diproses</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Failed">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} variant="secondary">
              <Search className="mr-2 h-4 w-4" /> Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-blue-400" />
            Daftar Roll
          </CardTitle>
          <span className="text-sm text-slate-400">{totalCount} total</span>
        </CardHeader>
        <CardContent>
          {rolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <ScrollText className="mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-500">Belum ada data roll</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Nama Roll</TableHead>
                  <TableHead className="text-slate-400">
                    Panjang Total
                  </TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Tanggal</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolls.map((roll) => (
                  <TableRow
                    key={roll.id}
                    className="border-slate-800 hover:bg-slate-800/30"
                  >
                    <TableCell className="text-white font-medium">
                      <button
                        onClick={() => openDetailDialog(roll)}
                        className="hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {roll.rollName}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-300 font-semibold">
                      {roll.outputCm != null
                        ? `${roll.outputCm.toFixed(1)} cm`
                        : `${roll.heightCm} cm × ${roll.quantity} roll = ${(parseFloat(roll.heightCm) * roll.quantity).toFixed(1)} cm`}
                    </TableCell>
                    <TableCell>{statusBadge(roll.status)}</TableCell>
                    <TableCell className="text-slate-400">
                      {formatDate(roll.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openGenerateDialog(roll)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                          title="Generate Label Roll"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openDetailDialog(roll)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          title="Lihat Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {userRole === "admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEditDialog(roll)}
                              className="text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openDeleteDialog(roll)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(p);
                  }}
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
                  if (currentPage < totalPages)
                    handlePageChange(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* ─── Create Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Tambah Roll Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Nama Roll <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="Contoh: Roll A4"
                value={rollName}
                onChange={(e) => setRollName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Total panjang dihitung otomatis dari transaksi di dalam roll
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetCreateForm();
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Roll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nama Roll</Label>
              <Input
                value={editRollName}
                onChange={(e) => setEditRollName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v ?? "Processed")}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="Processed">Diproses</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Failed">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Path</Label>
              <Input
                value={editPath}
                onChange={(e) => setEditPath(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-400" /> Detail Roll:{" "}
              {selectedRoll?.rollName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRoll && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Nama:</span>{" "}
                  <span className="text-white font-medium">
                    {selectedRoll.rollName}
                  </span>
                </p>
                {rollDetail?.totalOutputCm != null &&
                  rollDetail.totalOutputCm > 0 && (
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">Total Output:</span>{" "}
                      <span className="text-white font-medium">
                        {rollDetail.totalOutputCm.toFixed(1)} cm
                      </span>
                    </p>
                  )}
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Status:</span>{" "}
                  {statusBadge(selectedRoll.status)}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Daftar Transaksi dalam Roll Ini
              </h3>
              {!rollDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : rollDetail.transactions.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4">
                  Belum ada transaksi di roll ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {rollDetail.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">
                          {formatDate(tx.date)}
                        </span>
                        <span>{statusBadge(tx.status)}</span>
                      </div>
                      {tx.resiNumbers.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 ml-2 border-l-2 border-purple-500/30 pl-3"
                        >
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs shrink-0">
                            <Package className="mr-1 h-3 w-3" />
                            {r.number || "Tanpa Resi"}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {r.totalLabels} label • {r.totalNames} nama
                            {r.sampleNames.length > 0 && (
                              <>
                                {" "}
                                —{" "}
                                <span className="text-slate-500">
                                  {r.sampleNames.join(", ")}
                                  {r.totalNames > 3 ? "…" : ""}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Generate Dialog ───────────────────────────────────────── */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-400" /> Generate Label
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!generateResult ? (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 space-y-2">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">Roll:</span>{" "}
                    {selectedRoll?.rollName}
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">Ukuran:</span>{" "}
                    5,4cm × 1,4cm (fixed) | 300 DPI
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  Sistem akan me-render semua transaksi & resi dalam roll ini
                  menjadi satu file PNG siap cetak, dengan grouping per resi &
                  barcode otomatis.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generateLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generateLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" /> Generate
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
                  <p className="text-green-400 font-semibold">✅ Sukses!</p>
                  <p className="text-sm text-slate-300">
                    Label:{" "}
                    <span className="text-white font-medium">
                      {generateResult.totalLabels}
                    </span>
                  </p>
                  <p className="text-sm text-slate-300">
                    Halaman:{" "}
                    <span className="text-white font-medium">
                      {generateResult.totalPages}
                    </span>
                  </p>
                </div>
                {generateResult.base64 && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `data:image/png;base64,${generateResult.base64}`;
                      link.download = `label_${selectedRoll?.id?.slice(0, 8) ?? "output"}.png`;
                      link.click();
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PNG
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300">
            Hapus roll{" "}
            <span className="font-semibold text-white">
              {selectedRoll?.rollName}
            </span>
            ? Semua transaksi di dalamnya akan ikut terhapus.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
