"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Image as ImageIcon,
  Upload,
  CheckCircle,
} from "lucide-react";
import {
  createBackground,
  updateBackground,
  deleteBackground,
} from "@/actions/background-actions";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

interface Background {
  id: string;
  name: string;
  fontColor: string;
  imagePath: string | null;
  createdAt: string;
}

interface Props {
  backgrounds: Background[];
  userRole: string;
}

export function BackgroundClient({ backgrounds, userRole }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState<Background | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Create form
  const [bgName, setBgName] = useState("");
  const [bgFontColor, setBgFontColor] = useState("#FFFFFF");

  // Edit form
  const [editBgName, setEditBgName] = useState("");
  const [editBgFontColor, setEditBgFontColor] = useState("#FFFFFF");

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetForm = () => {
    setBgName("");
    setBgFontColor("#FFFFFF");
  };

  const handleCreate = async () => {
    if (!bgName) {
      toast.error("Nama background wajib diisi");
      return;
    }
    setFormLoading(true);
    try {
      const result = await createBackground({
        name: bgName,
        fontColor: bgFontColor,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Background berhasil ditambahkan");
        setDialogOpen(false);
        resetForm();
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (bg: Background) => {
    setSelectedBg(bg);
    setEditBgName(bg.name);
    setEditBgFontColor(bg.fontColor.startsWith("#") ? bg.fontColor : "#FFFFFF");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedBg || !editBgName) {
      toast.error("Nama background wajib diisi");
      return;
    }
    setFormLoading(true);
    try {
      const result = await updateBackground(selectedBg.id, {
        name: editBgName,
        fontColor: editBgFontColor,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Background berhasil diupdate");
        setEditDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const openUploadDialog = (bg: Background) => {
    setSelectedBg(bg);
    setSelectedFile(null);
    setPreviewUrl(bg.imagePath ? `/api/backgrounds/${bg.id}` : null);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadBackground = async () => {
    if (!selectedBg || !selectedFile) {
      toast.error("Pilih file gambar terlebih dahulu");
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("backgroundId", selectedBg.id);

      const res = await fetch("/api/upload/background", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Gagal upload gambar");
      } else {
        toast.success("Gambar background berhasil diupload!");
        setUploadDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat upload");
    } finally {
      setUploadLoading(false);
    }
  };

  const openDeleteDialog = (bg: Background) => {
    setSelectedBg(bg);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedBg) return;
    setFormLoading(true);
    try {
      const result = await deleteBackground(selectedBg.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Background berhasil dihapus");
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
          <h1 className="text-3xl font-bold text-white">Background (Plat)</h1>
          <p className="mt-1 text-slate-400">
            Kelola background / plat label dan warna font-nya
          </p>
        </div>
        {userRole === "admin" && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Background
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Tambah Background Baru
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bgName" className="text-slate-300">
                    Nama Background <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="bgName"
                    placeholder="Contoh: OV MERAH"
                    value={bgName}
                    onChange={(e) => setBgName(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bgFontColor" className="text-slate-300">
                    Warna Font <span className="text-red-400">*</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="bgFontColor"
                      value={bgFontColor}
                      onChange={(e) => setBgFontColor(e.target.value)}
                      className="h-10 w-14 rounded-md border border-slate-700 bg-slate-800 cursor-pointer"
                    />
                    <Input
                      value={bgFontColor}
                      onChange={(e) => setBgFontColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className="border-slate-700 bg-slate-800 text-white"
                    />
                    <div
                      className="h-10 w-10 rounded-md border border-slate-600 flex-shrink-0"
                      style={{ backgroundColor: bgFontColor }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Warna teks yang akan tercetak di atas gambar label
                  </p>
                </div>
                <p className="text-xs text-slate-500 italic">
                  💡 Setelah ditambahkan, upload gambar plat-nya melalui tombol
                  Upload di kartu background.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </Button>
                <Button onClick={handleCreate} disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Background Grid */}
      {backgrounds.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="mb-4 h-12 w-12 text-slate-600" />
            <p className="text-slate-500">Belum ada data background</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {backgrounds.map((bg) => (
            <Card
              key={bg.id}
              className="border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors overflow-hidden"
            >
              {/* Preview image if available */}
              {bg.imagePath && (
                <div className="h-24 w-full overflow-hidden bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/backgrounds/${bg.imagePath}`}
                    alt={bg.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {!bg.imagePath && (
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <ImageIcon className="h-5 w-5 text-purple-400" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-sm font-medium text-white">
                        {bg.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div
                          className="h-3.5 w-3.5 rounded-full border border-slate-600"
                          style={{ backgroundColor: bg.fontColor }}
                          title={bg.fontColor}
                        />
                        <span className="text-xs text-slate-400">
                          {bg.fontColor}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {userRole === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openUploadDialog(bg)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        title="Upload gambar plat"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEditDialog(bg)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {userRole === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openDeleteDialog(bg)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  {bg.imagePath ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" /> Gambar Tersedia
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs text-slate-500 border-slate-700"
                    >
                      Belum ada gambar
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {formatDate(bg.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Background Image Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload Gambar Plat — {selectedBg?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-blue-500/10 p-3 border border-blue-500/20">
              <p className="text-sm text-blue-400 font-medium">Panduan Upload:</p>
              <ul className="text-xs text-slate-300 list-disc list-inside mt-1 space-y-0.5">
                <li>Gunakan format <strong>.png</strong> yang transparan (tanpa warna latar).</li>
                <li>Rasio desain harus sesuai dengan ukuran label Anda (contoh 5cm x 1.4cm).</li>
              </ul>
            </div>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 overflow-hidden cursor-pointer hover:border-purple-500/50 hover:bg-slate-800 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-40 w-full object-contain p-2"
                  />
                  <p className="pb-2 text-center text-xs text-slate-400">
                    Klik untuk ganti
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center p-8">
                  <Upload className="h-10 w-10 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-400">
                    Klik untuk pilih gambar plat
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    .png, .jpg, .jpeg, .webp
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {selectedFile && (
              <p className="text-xs text-slate-400">
                {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              onClick={handleUploadBackground}
              disabled={uploadLoading || !selectedFile}
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Background</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editBgName" className="text-slate-300">
                Nama Background <span className="text-red-400">*</span>
              </Label>
              <Input
                id="editBgName"
                value={editBgName}
                onChange={(e) => setEditBgName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Warna Font</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editBgFontColor}
                  onChange={(e) => setEditBgFontColor(e.target.value)}
                  className="h-10 w-14 rounded-md border border-slate-700 bg-slate-800 cursor-pointer"
                />
                <Input
                  value={editBgFontColor}
                  onChange={(e) => setEditBgFontColor(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white"
                />
                <div
                  className="h-10 w-10 rounded-md border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: editBgFontColor }}
                />
              </div>
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

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300">
            Apakah Anda yakin ingin menghapus background{" "}
            <span className="font-semibold text-white">{selectedBg?.name}</span>
            ?
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
