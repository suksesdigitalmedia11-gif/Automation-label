"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
} from "lucide-react";
import { createRoll, updateRoll, deleteRoll } from "@/actions/roll-actions";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Processed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Completed: "bg-green-500/10 text-green-500 border-green-500/20",
    Failed: "bg-red-500/10 text-red-500 border-red-500/20",
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

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface Roll {
  id: string;
  rollName: string;
  heightCm: string;
  quantity: number;
  path: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  rolls: Roll[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  search: string;
  statusFilter: string;
  userRole: string;
}

export function RollClient({
  rolls,
  currentPage,
  totalPages,
  totalCount,
  search: initialSearch,
  statusFilter: initialStatus,
  userRole,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Create form state
  const [rollName, setRollName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rollPath, setRollPath] = useState("");

  // Edit form state
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
    setQuantity("");
    setRollPath("");
  };

  const handleCreate = async () => {
    if (!rollName || !heightCm || !quantity) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }
    setFormLoading(true);
    try {
      const result = await createRoll({
        rollName,
        heightCm: 0,
        quantity: parseInt(quantity) || 0,
        path: rollPath || null,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Roll</h1>
          <p className="mt-1 text-slate-400">Kelola data roll label</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Roll
          </DialogTrigger>
          <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Tambah Roll Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rollName" className="text-slate-300">
                  Nama Roll <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="rollName"
                  placeholder="Contoh: Roll A4"
                  value={rollName}
                  onChange={(e) => setRollName(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-slate-300">
                  Quantity (Estimasi Halaman) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Contoh: 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  title="Total estimasi halaman pada satu roll kertas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollPath" className="text-slate-300">
                  Path
                </Label>
                <Input
                  id="rollPath"
                  placeholder="Path file (opsional)"
                  value={rollPath}
                  onChange={(e) => setRollPath(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                onValueChange={(val) => {
                  setStatusFilter(val === "all" ? "" : val ?? "");
                }}
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
              <Search className="mr-2 h-4 w-4" />
              Cari
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
          <span className="text-sm text-slate-400">
            {totalCount} total
          </span>
        </CardHeader>
        <CardContent>
          {rolls.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              Belum ada data roll
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Nama Roll</TableHead>

                  <TableHead className="text-slate-400">Quantity</TableHead>
                  <TableHead className="text-slate-400">Path</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Tanggal</TableHead>
                  <TableHead className="text-slate-400 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolls.map((roll) => (
                  <TableRow key={roll.id} className="border-slate-800">
                    <TableCell className="font-medium text-white">
                      {roll.rollName}
                    </TableCell>

                    <TableCell className="text-slate-300">
                      {roll.quantity}
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-[150px] truncate">
                      {roll.path || "-"}
                    </TableCell>
                    <TableCell>{statusBadge(roll.status)}</TableCell>
                    <TableCell className="text-slate-400">
                      {formatDate(roll.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(roll)}
                          className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {userRole === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(roll)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={
                        currentPage <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer text-slate-400 hover:text-white"
                      }
                      text="Sebelumnya"
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === currentPage}
                          onClick={() => handlePageChange(p)}
                          className={
                            p === currentPage
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : "cursor-pointer text-slate-400 hover:text-white"
                          }
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
                      }
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer text-slate-400 hover:text-white"
                      }
                      text="Selanjutnya"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Roll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRollName" className="text-slate-300">
                Nama Roll <span className="text-red-400">*</span>
              </Label>
              <Input
                id="editRollName"
                value={editRollName}
                onChange={(e) => setEditRollName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            {selectedRoll && (
              <>

                <div className="space-y-2">
                  <Label className="text-slate-400">Quantity</Label>
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-400">
                    {selectedRoll.quantity}
                  </div>
                  <p className="text-xs text-slate-500">
                    Quantity tidak dapat diubah setelah dibuat
                  </p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="editPath" className="text-slate-300">
                Path
              </Label>
              <Input
                id="editPath"
                value={editPath}
                onChange={(e) => setEditPath(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatus" className="text-slate-300">
                Status
              </Label>
              <Select value={editStatus} onValueChange={(val) => val && setEditStatus(val)}>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300">
            Apakah Anda yakin ingin menghapus roll{" "}
            <span className="font-semibold text-white">
              {selectedRoll?.rollName}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</>
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
