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
  Package,
} from "lucide-react";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transaksi-actions";
import { saveTransactionDetails } from "@/actions/detail-actions";
import { calcOutputHeightFromGroups } from "@/lib/output-calc";

// ─── Status Badge ─────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────
interface Roll {
  id: string;
  rollName: string;
  path?: string | null;
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
  resiNumber?: string;
  quantity: number;
}
interface ResiGroup {
  resiNumber: string;
  details: DetailRow[];
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

// ─── Detail Row Input ─────────────────────────────────────────────────────
function DetailRowInput({
  detail,
  fonts,
  backgrounds,
  onChange,
  onRemove,
}: {
  detail: DetailRow;
  fonts: Font[];
  backgrounds: Background[];
  onChange: (field: keyof DetailRow, val: string | number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800/50 p-2">
      <Input
        placeholder="Nama label"
        value={detail.name}
        onChange={(e) => onChange("name", e.target.value)}
        className="flex-1 border-slate-700 bg-slate-800 text-white text-sm h-8 placeholder:text-slate-500"
      />
      <Select
        value={detail.fontId}
        onValueChange={(v) => onChange("fontId", v ?? "")}
      >
        <SelectTrigger className="w-32 border-slate-700 bg-slate-800 text-white h-8 text-xs">
          <SelectValue placeholder="Font...">
            {fonts.find((f) => f.id === detail.fontId)?.name || "Font..."}
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
        value={detail.backgroundId}
        onValueChange={(v) => onChange("backgroundId", v ?? "")}
      >
        <SelectTrigger className="w-32 border-slate-700 bg-slate-800 text-white h-8 text-xs">
          <SelectValue placeholder="BG...">
            {backgrounds.find((b) => b.id === detail.backgroundId)?.name ||
              "BG..."}
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
        value={detail.quantity}
        onChange={(e) => onChange("quantity", parseInt(e.target.value) || 1)}
        className="w-14 border-slate-700 bg-slate-800 text-white text-sm h-8 text-center"
        title="Jumlah baris label"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
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
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  const [generateResult, setGenerateResult] = useState<{
    outputPath: string;
    totalLabels: number;
    totalPages: number;
    base64?: string;
  } | null>(null);

  // Create form — resi groups
  const [createRollId, setCreateRollId] = useState("");
  const [createDate, setCreateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [createGroups, setCreateGroups] = useState<ResiGroup[]>([
    { resiNumber: "", details: [] },
  ]);

  // Edit form
  const [editRollId, setEditRollId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState("Processed");
  const [editGroups, setEditGroups] = useState<ResiGroup[]>([
    { resiNumber: "", details: [] },
  ]);

  // Batch import
  const [batchNamesText, setBatchNamesText] = useState("");
  const [batchFontId, setBatchFontId] = useState("");
  const [batchBackgroundId, setBatchBackgroundId] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("1");
  const [batchGroupIdx, setBatchGroupIdx] = useState(0);
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
      e.target.value = "";
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────

  const emptyDetail = (): DetailRow => ({
    name: "",
    fontId: fonts[0]?.id ?? "",
    backgroundId: backgrounds[0]?.id ?? "",
    quantity: 1,
  });

  const addResiGroup = (target: "create" | "edit") => {
    const newGroup = { resiNumber: "", details: [] };
    if (target === "create") setCreateGroups((prev) => [...prev, newGroup]);
    else setEditGroups((prev) => [...prev, newGroup]);
  };

  const removeResiGroup = (target: "create" | "edit", idx: number) => {
    if (target === "create")
      setCreateGroups((prev) => prev.filter((_, i) => i !== idx));
    else setEditGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateResiNumber = (
    target: "create" | "edit",
    groupIdx: number,
    val: string,
  ) => {
    const setter = target === "create" ? setCreateGroups : setEditGroups;
    setter((prev) =>
      prev.map((g, i) => (i === groupIdx ? { ...g, resiNumber: val } : g)),
    );
  };

  const addDetailToGroup = (target: "create" | "edit", groupIdx: number) => {
    const setter = target === "create" ? setCreateGroups : setEditGroups;
    setter((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, details: [...g.details, emptyDetail()] } : g,
      ),
    );
  };

  const updateDetailInGroup = (
    target: "create" | "edit",
    groupIdx: number,
    detailIdx: number,
    field: keyof DetailRow,
    val: string | number,
  ) => {
    const setter = target === "create" ? setCreateGroups : setEditGroups;
    setter((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? {
              ...g,
              details: g.details.map((d, di) =>
                di === detailIdx ? { ...d, [field]: val } : d,
              ),
            }
          : g,
      ),
    );
  };

  const removeDetailFromGroup = (
    target: "create" | "edit",
    groupIdx: number,
    detailIdx: number,
  ) => {
    const setter = target === "create" ? setCreateGroups : setEditGroups;
    setter((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, details: g.details.filter((_, di) => di !== detailIdx) }
          : g,
      ),
    );
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
    setCreateGroups([{ resiNumber: "", details: [] }]);
  };

  const flattenGroups = (groups: ResiGroup[]) => {
    return groups.flatMap((g) =>
      g.details.map((d) => ({ ...d, resiNumber: g.resiNumber || null })),
    );
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createRollId || !createDate) {
      toast.error("Harap isi roll dan tanggal transaksi");
      return;
    }
    const allDetails = flattenGroups(createGroups);
    if (allDetails.length === 0) {
      toast.error("Tambahkan minimal 1 nama");
      return;
    }
    const invalid = allDetails.find((d) => !d.name.trim());
    if (invalid) {
      toast.error("Semua nama harus diisi");
      return;
    }

    setFormLoading(true);
    try {
      const result = await createTransaction({
        rollId: createRollId,
        transactionDate: createDate,
        quantity: 1,
        numberOfDetails: allDetails.length,
        resiNumber:
          createGroups
            .map((g) => g.resiNumber.trim())
            .filter(Boolean)
            .join(",") || null,
      });

      if (result.error || !result.id) {
        toast.error(result.error ?? "Gagal membuat transaksi");
        return;
      }

      const detailResult = await saveTransactionDetails(
        result.id,
        allDetails.map((d, i) => ({
          name: d.name.trim(),
          fontId: d.fontId || null,
          backgroundId: d.backgroundId || null,
          resiNumber: d.resiNumber || null,
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
    setEditStatus(tx.status);

    // Reconstruct groups from flat details
    const groups: ResiGroup[] = [];
    const detailArr = tx.details ?? [];
    // simple: group by first resiNumber found, or create one group
    // Since the original data is flat, we reconstruct by finding unique resi numbers
    const seen = new Set<string>();
    for (const d of detailArr) {
      const key =
        ((d as unknown as Record<string, unknown>).resiNumber as string) || "-";
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({
        resiNumber: key === "-" ? "" : key,
        details: detailArr
          .filter(
            (x) =>
              (((x as unknown as Record<string, unknown>)
                .resiNumber as string) || "-") === key,
            key,
          )
          .map(
            (x) =>
              ({
                name: x.name,
                fontId: x.fontId,
                backgroundId: x.backgroundId,
                quantity: x.quantity,
              }) as DetailRow,
          ),
      });
    }
    if (groups.length === 0) groups.push({ resiNumber: "", details: [] });

    setEditGroups(groups);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedTx) return;
    setFormLoading(true);
    try {
      const allDetails = flattenGroups(editGroups);
      const result = await updateTransaction(selectedTx.id, {
        rollId: editRollId,
        transactionDate: editDate,
        quantity: 1,
        numberOfDetails: allDetails.length,
        resiNumber:
          editGroups
            .map((g) => g.resiNumber.trim())
            .filter(Boolean)
            .join(",") || null,
        status: editStatus as "Processed" | "Failed" | "Completed",
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (allDetails.length > 0) {
        const detailResult = await saveTransactionDetails(
          selectedTx.id,
          allDetails.map((d, i) => ({
            name: d.name.trim(),
            fontId: d.fontId || null,
            backgroundId: d.backgroundId || null,
            resiNumber: d.resiNumber || null,
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

  // ─── Generate Handler ────────────────────────────────────────────────

  const openGenerateDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    setGenerateResult(null);
    setGenerateDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedTx) return;
    setGenerateLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollId: selectedTx.rollId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Gagal generate label");
        return;
      }
      setGenerateResult(data);
      toast.success(
        `Label berhasil di-generate! ${data.totalLabels} label, ${data.totalPages} halaman`,
      );
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat generate");
    } finally {
      setGenerateLoading(false);
    }
  };

  // ─── Batch Import ─────────────────────────────────────────────────────

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

    const setter = target === "create" ? setCreateGroups : setEditGroups;
    setter((prev) =>
      prev.map((g, i) =>
        i === batchGroupIdx ? { ...g, details: [...g.details, ...rows] } : g,
      ),
    );
    setBatchImportOpen(false);
    setBatchNamesText("");
    toast.success(`${rows.length} nama berhasil diimport`);
  };

  // ─── UI ──────────────────────────────────────────────────────────────

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
                    Detail
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">
                    Total
                  </TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
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
                    <TableCell className="text-center">
                      {tx.details?.length ? (
                        <span className="text-xs text-slate-400">
                          {calcOutputHeightFromGroups([
                            {
                              details: tx.details.map((d) => ({
                                quantity: d.quantity,
                              })),
                            },
                          ])}{" "}
                          cm
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(tx.status)}</TableCell>
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

      {/* ─── Create Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(o) => {
          setCreateDialogOpen(o);
          if (!o) resetCreateForm();
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" /> Tambah
              Transaksi Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Row 1: Roll + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Roll <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={createRollId}
                  onValueChange={(v) => setCreateRollId(v ?? "")}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                    <SelectValue placeholder="Pilih Roll...">
                      {rolls.find((r) => r.id === createRollId)?.rollName ||
                        "Pilih Roll..."}
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
            </div>

            <p className="text-xs text-slate-500">
              📐 Ukuran label: 5,4cm × 1,4cm | 1 paket = 50 pcs | Generate
              per-roll
            </p>

            {/* Resi Groups */}
            {createGroups.map((group, gi) => (
              <div
                key={gi}
                className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Nomor Resi (kosongkan jika tidak ada)"
                    value={group.resiNumber}
                    onChange={(e) =>
                      updateResiNumber("create", gi, e.target.value)
                    }
                    className="flex-1 border-slate-700 bg-slate-800 text-white text-sm h-8 placeholder:text-slate-500"
                  />
                  {createGroups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeResiGroup("create", gi)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {group.details.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada nama untuk resi ini. Klik &quot;Tambah Nama&quot;
                    di bawah.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.details.map((detail, di) => (
                      <DetailRowInput
                        key={di}
                        detail={detail}
                        fonts={fonts}
                        backgrounds={backgrounds}
                        onChange={(field, val) =>
                          updateDetailInGroup("create", gi, di, field, val)
                        }
                        onRemove={() => removeDetailFromGroup("create", gi, di)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchGroupIdx(gi);
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
                    onClick={() => addDetailToGroup("create", gi)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Tambah Nama
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => addResiGroup("create")}
              className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Resi
            </Button>
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

      {/* ─── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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

            <p className="text-xs text-slate-500">
              📐 Ukuran label: 5,4cm × 1,4cm | 1 paket = 50 pcs
            </p>

            {/* Edit Resi Groups */}
            {editGroups.map((group, gi) => (
              <div
                key={gi}
                className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-purple-400" />
                  <Input
                    placeholder="Nomor Resi"
                    value={group.resiNumber}
                    onChange={(e) =>
                      updateResiNumber("edit", gi, e.target.value)
                    }
                    className="flex-1 border-slate-700 bg-slate-800 text-white text-sm h-8 placeholder:text-slate-500"
                  />
                  {editGroups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeResiGroup("edit", gi)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {group.details.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada nama untuk resi ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.details.map((detail, di) => (
                      <DetailRowInput
                        key={di}
                        detail={detail}
                        fonts={fonts}
                        backgrounds={backgrounds}
                        onChange={(field, val) =>
                          updateDetailInGroup("edit", gi, di, field, val)
                        }
                        onRemove={() => removeDetailFromGroup("edit", gi, di)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchGroupIdx(gi);
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
                    onClick={() => addDetailToGroup("edit", gi)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Tambah Nama
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => addResiGroup("edit")}
              className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Resi
            </Button>
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

      {/* ─── Generate Dialog ─────────────────────────────────────────── */}
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
                    {selectedTx?.roll.rollName}
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">Ukuran:</span>{" "}
                    5,4cm × 1,4cm (fixed)
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">Detail Nama:</span>{" "}
                    {selectedTx?.numberOfDetails ?? 0} nama
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  Sistem akan me-render semua label di roll ini sesuai font &
                  background, grouping per resi, lalu menghasilkan file PNG
                  resolusi 300 DPI.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generateLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generateLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang
                      Generate...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" /> Generate Sekarang
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
                  <p className="text-green-400 font-semibold flex items-center gap-2">
                    ✅ Label Berhasil Di-generate!
                  </p>
                  <p className="text-sm text-slate-300">
                    Total Label:{" "}
                    <span className="text-white font-medium">
                      {generateResult.totalLabels}
                    </span>
                  </p>
                  <p className="text-sm text-slate-300">
                    Total Halaman:{" "}
                    <span className="text-white font-medium">
                      {generateResult.totalPages}
                    </span>
                  </p>
                </div>
                {generateResult.base64 ? (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `data:image/png;base64,${generateResult.base64}`;
                      link.download = `label_${selectedTx?.rollId?.slice(0, 8) ?? "output"}.png`;
                      link.click();
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PNG
                  </Button>
                ) : (
                  <a
                    href={generateResult.outputPath}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <Download className="mr-2 h-4 w-4" /> Download PNG
                    </Button>
                  </a>
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

      {/* ─── Batch Import Dialog ──────────────────────────────────────── */}
      <Dialog open={batchImportOpen} onOpenChange={setBatchImportOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" /> Import Nama (Batch)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                    <SelectValue placeholder="Pilih font..." />
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
                      {
                        backgrounds.find((b) => b.id === batchBackgroundId)
                          ?.name
                      }
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

      {/* ─── Delete Dialog ───────────────────────────────────────────── */}
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
