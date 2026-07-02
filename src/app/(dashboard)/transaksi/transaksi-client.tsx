"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ShoppingCart,
  Wand2,
  Download,
  FileText,
  Upload,
  X,
  Users,
} from "lucide-react";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transaksi-actions";
import { saveTransactionDetails } from "@/actions/detail-actions";

// ─── Status Badge ─────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Roll {
  id: string;
  rollName: string;
}
interface Font {
  id: string;
  name: string;
  fontFamily: string | null;
  filePath: string | null;
}
interface Background {
  id: string;
  name: string;
  fontColor: string;
  imagePath: string | null;
}
interface DetailRow {
  name: string;
  fontId: string;
  backgroundId: string;
  quantity: number;
}

interface Transaction {
  id: string;
  rollId: string;
  quantity: number | null;
  numberOfDetails: number | null;
  printWidth: string | null;
  printHeight: string | null;
  labelHeight: string | null;
  labelSizePresetId: string | null;
  resiNumber: string | null;
  path: string | null;
  status: string;
  transactionDate: string;
  createdAt: string;
  roll: Roll;
  details?: DetailRow[];
}

interface Props {
  transactions: Transaction[];
  rolls: Roll[];
  fonts: Font[];
  backgrounds: Background[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  selectedRollId: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  userRole: string;
}

// ─── Detail Row Component ─────────────────────────────────────────────────────
function DetailRowInput({
  idx,
  row,
  fonts,
  backgrounds,
  onChange,
  onRemove,
}: {
  idx: number;
  row: DetailRow;
  fonts: Font[];
  backgrounds: Background[];
  onChange: (idx: number, field: keyof DetailRow, val: string | number) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <span className="w-6 text-center text-xs font-bold text-slate-500">
        {idx + 1}
      </span>
      <Input
        placeholder="Nama label"
        value={row.name}
        onChange={(e) => onChange(idx, "name", e.target.value)}
        className="flex-1 border-slate-700 bg-slate-800 text-white text-sm h-8 placeholder:text-slate-500"
      />
      <Select
        value={row.fontId}
        onValueChange={(v) => onChange(idx, "fontId", v ?? "")}
      >
        <SelectTrigger className="w-36 border-slate-700 bg-slate-800 text-white h-8 text-xs">
          <SelectValue placeholder="Font...">
            {fonts.find((f) => f.id === row.fontId)?.name || "Font..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-900 text-white max-h-48">
          {fonts.map((f) => (
            <SelectItem key={f.id} value={f.id} className="text-xs">
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={row.backgroundId}
        onValueChange={(v) => onChange(idx, "backgroundId", v ?? "")}
      >
        <SelectTrigger className="w-36 border-slate-700 bg-slate-800 text-white h-8 text-xs">
          <SelectValue placeholder="Background...">
            {backgrounds.find((b) => b.id === row.backgroundId)?.name || "Background..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-900 text-white max-h-48">
          {backgrounds.map((b) => (
            <SelectItem key={b.id} value={b.id} className="text-xs">
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        max={200}
        value={row.quantity}
        onChange={(e) =>
          onChange(idx, "quantity", parseInt(e.target.value) || 1)
        }
        className="w-16 border-slate-700 bg-slate-800 text-white text-sm h-8 text-center"
        title="Jumlah baris label untuk nama ini"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onRemove(idx)}
        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TransaksiClient({
  transactions,
  rolls,
  fonts,
  backgrounds,
  currentPage,
  totalPages,
  totalCount,
  selectedRollId: initialRollId,
  statusFilter: initialStatus,
  startDate: initialStartDate,
  endDate: initialEndDate,
  userRole,
}: Props) {
  const router = useRouter();

  // Filters
  const [filterRollId, setFilterRollId] = useState(initialRollId);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterStartDate, setFilterStartDate] = useState(initialStartDate);
  const [filterEndDate, setFilterEndDate] = useState(initialEndDate);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Create form
  const [createRollId, setCreateRollId] = useState("");
  const [createDate, setCreateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [createQty, setCreateQty] = useState("1");
  const [createResi, setCreateResi] = useState("");
  const [createDetails, setCreateDetails] = useState<DetailRow[]>([]);

  // Edit form
  const [editRollId, setEditRollId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editResi, setEditResi] = useState("");
  const [editStatus, setEditStatus] = useState("Processed");
  const [editDetails, setEditDetails] = useState<DetailRow[]>([]);

  // Batch import
  const [batchNamesText, setBatchNamesText] = useState("");
  const [batchFontId, setBatchFontId] = useState("");
  const [batchBackgroundId, setBatchBackgroundId] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("1");
  const [batchTargetCreate, setBatchTargetCreate] = useState(false);
  const [batchExcelFileName, setBatchExcelFileName] = useState("");
  const [batchExcelLoading, setBatchExcelLoading] = useState(false);

  const handleExcelFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchExcelFileName(file.name);
    setBatchExcelLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Gagal membaca file");
      } else {
        setBatchNamesText(data.names.join("\n"));
        toast.success(`${data.count} nama berhasil dibaca dari file`);
      }
    } catch {
      toast.error("Terjadi kesalahan saat membaca file");
    } finally {
      setBatchExcelLoading(false);
      // Reset file input so the same file can be re-selected
      e.target.value = "";
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const addDetailRow = (target: "create" | "edit") => {
    const emptyRow: DetailRow = {
      name: "",
      fontId: fonts[0]?.id ?? "",
      backgroundId: backgrounds[0]?.id ?? "",
      quantity: 1,
    };
    if (target === "create") setCreateDetails((prev) => [...prev, emptyRow]);
    else setEditDetails((prev) => [...prev, emptyRow]);
  };

  const updateDetailRow = (
    target: "create" | "edit",
    idx: number,
    field: keyof DetailRow,
    val: string | number,
  ) => {
    const setter = target === "create" ? setCreateDetails : setEditDetails;
    setter((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );
  };

  const removeDetailRow = (target: "create" | "edit", idx: number) => {
    const setter = target === "create" ? setCreateDetails : setEditDetails;
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filterRollId) params.set("rollId", filterRollId);
    if (filterStatus) params.set("status", filterStatus);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);
    params.set("page", "1");
    router.push(`/transaksi?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (filterRollId) params.set("rollId", filterRollId);
    if (filterStatus) params.set("status", filterStatus);
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);
    params.set("page", page.toString());
    router.push(`/transaksi?${params.toString()}`);
  };

  const resetCreateForm = () => {
    setCreateRollId("");
    setCreateDate(new Date().toISOString().split("T")[0]);
    setCreateQty("1");
    setCreateResi("");
    setCreateDetails([]);
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createRollId || !createDate) {
      toast.error("Harap isi roll dan tanggal transaksi");
      return;
    }
    if (createDetails.length === 0) {
      toast.error("Tambahkan minimal 1 baris detail nama");
      return;
    }
    const invalidDetail = createDetails.find((d) => !d.name.trim());
    if (invalidDetail) {
      toast.error("Semua baris detail harus diisi nama");
      return;
    }

    setFormLoading(true);
    try {
      const result = await createTransaction({
        rollId: createRollId,
        transactionDate: createDate,
        quantity: parseInt(createQty) || 1,
        numberOfDetails: createDetails.length,
        resiNumber: createResi.trim() || null,
      });

      if (result.error || !result.id) {
        toast.error(result.error ?? "Gagal membuat transaksi");
        return;
      }

      // Save details
      const detailResult = await saveTransactionDetails(
        result.id,
        createDetails.map((d, i) => ({
          name: d.name.trim(),
          fontId: d.fontId || null,
          backgroundId: d.backgroundId || null,
          quantity: d.quantity,
          sortOrder: i,
        })),
      );

      if (detailResult.error) {
        toast.error(detailResult.error);
        return;
      }

      toast.success("Transaksi berhasil dibuat!");
      setCreateDialogOpen(false);
      resetCreateForm();
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    setEditRollId(tx.rollId);
    setEditDate(tx.transactionDate.split("T")[0]);
    setEditQty((tx.quantity || 1).toString());
    setEditResi(tx.resiNumber || "");
    setEditStatus(tx.status);
    setEditDetails(tx.details?.map((d) => ({ ...d })) ?? []);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedTx) return;
    setFormLoading(true);
    try {
      const result = await updateTransaction(selectedTx.id, {
        rollId: editRollId,
        transactionDate: editDate,
        quantity: parseInt(editQty) || 1,
        numberOfDetails: editDetails.length,
        resiNumber: editResi.trim() || null,
        status: editStatus as "Processed" | "Failed" | "Completed",
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (editDetails.length > 0) {
        const detailResult = await saveTransactionDetails(
          selectedTx.id,
          editDetails.map((d, i) => ({
            name: d.name.trim(),
            fontId: d.fontId || null,
            backgroundId: d.backgroundId || null,
            quantity: d.quantity,
            sortOrder: i,
          })),
        );
        if (detailResult.error) {
          toast.error(detailResult.error);
          return;
        }
      }

      toast.success("Transaksi berhasil diupdate");
      setEditDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    setFormLoading(true);
    try {
      const result = await deleteTransaction(selectedTx.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaksi berhasil dihapus");
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };



  // ─── Batch Import ─────────────────────────────────────────────────────────

  const applyBatchImport = (target: "create" | "edit") => {
    const names = batchNamesText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) {
      toast.error("Tidak ada nama yang valid");
      return;
    }
    const rows: DetailRow[] = names.map((name) => ({
      name,
      fontId: batchFontId || (fonts[0]?.id ?? ""),
      backgroundId: batchBackgroundId || (backgrounds[0]?.id ?? ""),
      quantity: parseInt(batchQuantity) || 1,
    }));
    if (target === "create") setCreateDetails(rows);
    else setEditDetails(rows);
    setBatchImportOpen(false);
    setBatchNamesText("");
    toast.success(`${rows.length} nama berhasil diimport`);
  };

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaksi</h1>
          <p className="mt-1 text-slate-400">Kelola dan generate label nama</p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm();
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Transaksi
        </Button>
      </div>

      {/* Guide Banner */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
        <h2 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4" /> Panduan Penggunaan
        </h2>
        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
          <li><strong>Siapkan Material:</strong> Pastikan Anda sudah mengupload desain background (.png) di menu <em>Background</em>.</li>
          <li><strong>Buat Roll:</strong> Tambahkan nama tipe Roll/Kertas di menu <em>Roll</em>.</li>
          <li><strong>Input Transaksi:</strong> Klik <em>Tambah Transaksi</em>, lalu masukkan daftar nama customer (bisa via Import Excel/Text).</li>
          <li><strong>Generate:</strong> Klik icon tongkat sihir (<Wand2 className="inline h-3 w-3 text-purple-400 mx-0.5" />) di tabel untuk memproses PNG siap cetak.</li>
        </ol>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-40">
              <Label className="text-xs text-slate-400 mb-1 block">Roll</Label>
              <Select
                value={filterRollId || "ALL"}
                onValueChange={(v) =>
                  setFilterRollId(v == null || v === "ALL" ? "" : v)
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white h-8 text-sm">
                  <SelectValue placeholder="Semua Roll" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="ALL">Semua Roll</SelectItem>
                  {rolls.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.rollName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400 mb-1 block">
                Status
              </Label>
              <Select
                value={filterStatus || "ALL"}
                onValueChange={(v) =>
                  setFilterStatus(v == null || v === "ALL" ? "" : v)
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white h-8 text-sm">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="Processed">Diproses</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Failed">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400 mb-1 block">
                Dari Tanggal
              </Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white h-8 text-sm"
              />
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400 mb-1 block">
                Sampai Tanggal
              </Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white h-8 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="h-8 px-4 text-sm">
                <Search className="mr-1.5 h-3.5 w-3.5" /> Cari
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterRollId("");
                  setFilterStatus("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  router.push("/transaksi");
                }}
                className="h-8 px-3 text-sm border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="text-sm text-slate-400">
        {totalCount} transaksi ditemukan
      </div>

      {/* Table */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <ShoppingCart className="mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-500">Belum ada transaksi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Tanggal</TableHead>
                  <TableHead className="text-slate-400">Roll</TableHead>
                  <TableHead className="text-slate-400 text-center">
                    Qty
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">
                    Detail
                  </TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Output</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-slate-800 hover:bg-slate-800/30"
                  >
                    <TableCell className="text-slate-300 whitespace-nowrap">
                      {formatDate(tx.transactionDate)}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {tx.roll.rollName}
                    </TableCell>
                    <TableCell className="text-slate-300 text-center">
                      {tx.quantity ?? 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.numberOfDetails ? (
                        <Badge
                          variant="outline"
                          className="text-xs text-slate-400 border-slate-700"
                        >
                          <Users className="mr-1 h-3 w-3" />
                          {tx.numberOfDetails}
                        </Badge>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(tx.status)}</TableCell>
                    <TableCell>
                      {tx.path ? (
                        <a
                          href={tx.path}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs cursor-pointer hover:bg-green-500/20">
                            <Download className="mr-1 h-3 w-3" /> Unduh
                          </Badge>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(tx)}
                          className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {userRole === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openDeleteDialog(tx)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, i) => i + 1,
            ).map((p) => (
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

      {/* ─── Create Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(o) => {
          setCreateDialogOpen(o);
          if (!o) resetCreateForm();
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" /> Tambah
              Transaksi Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Row 1: Roll + Date + Qty */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Pilih Roll Kertas <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={createRollId}
                  onValueChange={(v) => setCreateRollId(v ?? "")}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue placeholder="Pilih Roll...">
                      {rolls.find((r) => r.id === createRollId)?.rollName || "Pilih Roll..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-white">
                    {rolls.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.rollName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Tanggal <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Copy (Jumlah per Halaman)</Label>
                <Input
                  type="number"
                  min={1}
                  value={createQty}
                  onChange={(e) => setCreateQty(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white"
                  title="Berapa banyak salinan halaman yang sama ingin dicetak"
                />
              </div>
            </div>

            {/* Row 2: Nomor Resi + Info Ukuran Fixed */}
            <div className="space-y-2">
              <Label className="text-slate-300">Nomor Resi Customer</Label>
              <Input
                type="text"
                value={createResi}
                onChange={(e) => setCreateResi(e.target.value)}
                placeholder="Masukkan nomor resi..."
                className="border-slate-700 bg-slate-800 text-white"
              />
              <p className="text-xs text-slate-500">
                📐 Ukuran label fixed: 5cm × 1,4cm | Media: 58cm | 1 paket = 50
                pcs | Resi akan jadi barcode di output
              </p>
            </div>

            {/* Row 3: Detail Nama */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Detail Nama ({createDetails.length})
                  <span className="text-red-400 text-xs">*</span>
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchTargetCreate(true);
                      setBatchImportOpen(true);
                    }}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <FileText className="mr-1 h-3 w-3" /> Import Nama
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDetailRow("create")}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Tambah Baris
                  </Button>
                </div>
              </div>
              {createDetails.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    Belum ada detail nama.
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Klik &quot;Import Nama&quot; untuk paste banyak nama, atau
                    &quot;Tambah Baris&quot; satu per satu.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <div className="flex items-center gap-2 px-3 pb-1">
                    <span className="w-6" />
                    <span className="flex-1 text-xs text-slate-500">
                      Nama Label
                    </span>
                    <span className="w-36 text-xs text-slate-500">Font</span>
                    <span className="w-36 text-xs text-slate-500">
                      Background
                    </span>
                    <span className="w-16 text-xs text-slate-500 text-center">
                      Baris
                    </span>
                    <span className="w-6" />
                  </div>
                  {createDetails.map((row, idx) => (
                    <DetailRowInput
                      key={idx}
                      idx={idx}
                      row={row}
                      fonts={fonts}
                      backgrounds={backgrounds}
                      onChange={(i, f, v) => updateDetailRow("create", i, f, v)}
                      onRemove={(i) => removeDetailRow("create", i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
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
                "Simpan Transaksi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-yellow-400" /> Edit Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Roll</Label>
                <Select
                  value={editRollId}
                  onValueChange={(v) => setEditRollId(v ?? "")}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-white">
                    {rolls.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.rollName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tanggal</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
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
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nomor Resi Customer</Label>
              <Input
                type="text"
                value={editResi}
                onChange={(e) => setEditResi(e.target.value)}
                placeholder="Masukkan nomor resi..."
                className="border-slate-700 bg-slate-800 text-white"
              />
              <p className="text-xs text-slate-500">
                📐 Ukuran label fixed: 5cm × 1,4cm | Media: 58cm | 1 paket = 50
                pcs
              </p>
            </div>

            {/* Edit Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Detail Nama (
                  {editDetails.length})
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchTargetCreate(false);
                      setBatchImportOpen(true);
                    }}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <FileText className="mr-1 h-3 w-3" /> Import Nama
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDetailRow("edit")}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Tambah Baris
                  </Button>
                </div>
              </div>
              {editDetails.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
                  <p className="text-sm text-slate-500">
                    Belum ada detail nama.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {editDetails.map((row, idx) => (
                    <DetailRowInput
                      key={idx}
                      idx={idx}
                      row={row}
                      fonts={fonts}
                      backgrounds={backgrounds}
                      onChange={(i, f, v) => updateDetailRow("edit", i, f, v)}
                      onRemove={(i) => removeDetailRow("edit", i)}
                    />
                  ))}
                </div>
              )}
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



      {/* ─── Batch Import Dialog ──────────────────────────────────────────────── */}
      <Dialog open={batchImportOpen} onOpenChange={setBatchImportOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" /> Import Nama (Batch)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Excel/CSV Upload */}
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                📂 Upload File Excel / CSV
              </p>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="excelFileInput"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 hover:border-blue-500/50 hover:bg-slate-800 transition-colors">
                    <Upload className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="text-sm text-slate-300 truncate">
                      {batchExcelFileName || "Pilih file .xlsx / .csv"}
                    </span>
                  </div>
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleExcelFileChange}
                  />
                </label>
                {batchExcelLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Kolom pertama = nama, atau gunakan header &quot;nama&quot; /
                &quot;name&quot; untuk deteksi otomatis
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-800" />
              <span className="text-xs text-slate-500">
                atau ketik/paste manual
              </span>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            {/* Manual Text */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Daftar Nama{" "}
                <span className="text-xs text-slate-500">
                  (satu nama per baris)
                </span>
              </Label>
              <Textarea
                placeholder={"Andi Pratama\nSiti Rahayu\nBudi Santoso\n..."}
                value={batchNamesText}
                onChange={(e) => setBatchNamesText(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-600 min-h-36 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                {batchNamesText.split("\n").filter((n) => n.trim()).length} nama
                terdeteksi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Font Default</Label>
                <Select
                  value={batchFontId}
                  onValueChange={(v) => setBatchFontId(v ?? "")}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue placeholder="Pilih font...">
                      {fonts.find((f) => f.id === batchFontId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-white">
                    {fonts.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">
                  Background Default
                </Label>
                <Select
                  value={batchBackgroundId}
                  onValueChange={(v) => setBatchBackgroundId(v ?? "")}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue placeholder="Pilih background...">
                      {backgrounds.find((b) => b.id === batchBackgroundId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-white">
                    {backgrounds.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">
                Jumlah Baris per Nama
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white w-32"
              />
            </div>
            <p className="text-xs text-slate-500">
              Setelah import, Anda bisa mengubah font/background per nama secara
              individual di tabel.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchImportOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              onClick={() =>
                applyBatchImport(batchTargetCreate ? "create" : "edit")
              }
              disabled={
                batchNamesText.split("\n").filter((n) => n.trim()).length === 0
              }
            >
              <Upload className="mr-2 h-4 w-4" /> Import{" "}
              {batchNamesText.split("\n").filter((n) => n.trim()).length} Nama
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300">
            Hapus transaksi ini? Semua detail nama dan output file akan ikut
            terhapus.
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
