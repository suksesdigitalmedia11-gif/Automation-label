"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Loader2,
  Type,
  Upload,
  CheckCircle,
  FileText,
} from "lucide-react";
import { createFont, deleteFont } from "@/actions/font-actions";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

interface Font {
  id: string;
  name: string;
  fontFamily: string | null;
  filePath: string | null;
  createdAt: string;
}

interface Props {
  fonts: Font[];
  userRole: string;
}

export function FontClient({ fonts, userRole }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<Font | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [fontName, setFontName] = useState("");
  const [fontFamily, setFontFamily] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetForm = () => {
    setFontName("");
    setFontFamily("");
  };

  const handleCreate = async () => {
    if (!fontName) {
      toast.error("Nama font wajib diisi");
      return;
    }
    setFormLoading(true);
    try {
      const result = await createFont({
        name: fontName,
        fontFamily: fontFamily || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Font berhasil ditambahkan");
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

  const openUploadDialog = (font: Font) => {
    setSelectedFont(font);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleUploadFont = async () => {
    if (!selectedFont || !selectedFile) {
      toast.error("Pilih file font terlebih dahulu");
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("fontId", selectedFont.id);

      const res = await fetch("/api/upload/font", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Gagal upload font");
      } else {
        toast.success("File font berhasil diupload!");
        setUploadDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat upload");
    } finally {
      setUploadLoading(false);
    }
  };

  const openDeleteDialog = (font: Font) => {
    setSelectedFont(font);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFont) return;
    setFormLoading(true);
    try {
      const result = await deleteFont(selectedFont.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Font berhasil dihapus");
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
          <h1 className="text-3xl font-bold text-white">Font</h1>
          <p className="mt-1 text-slate-400">
            Kelola font untuk label printing
          </p>
        </div>
        <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Font
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Tambah Font Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fontName" className="text-slate-300">
                    Nama Font <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="fontName"
                    placeholder="Contoh: Beachday"
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily" className="text-slate-300">
                    Font Family
                  </Label>
                  <Input
                    id="fontFamily"
                    placeholder="Contoh: Beachday Script"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">
                    Nama family untuk CSS / Canvas (opsional, bisa diisi nanti)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </Button>
                <Button onClick={handleCreate} disabled={formLoading}>
                  {formLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                  ) : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      {/* Font Grid */}
      {fonts.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Type className="mb-4 h-12 w-12 text-slate-600" />
            <p className="text-slate-500">Belum ada data font</p>
            <p className="mt-1 text-sm text-slate-600">
              Klik tombol Tambah Font untuk menambahkan font baru
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fonts.map((font) => (
            <Card
              key={font.id}
              className="border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-white">
                        {font.name}
                      </CardTitle>
                      {font.fontFamily && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {font.fontFamily}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openUploadDialog(font)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        title="Upload file font"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      {userRole === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openDeleteDialog(font)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {font.filePath ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      File Tersedia
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">
                      Belum ada file
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {formatDate(font.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Font File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload File Font — {selectedFont?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-400">
              Upload file font (.ttf, .otf, .woff) agar bisa digunakan dalam proses
              generate label.
            </p>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 p-8 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <CheckCircle className="h-10 w-10 text-green-400 mb-2" />
                  <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-400">Klik untuk pilih file font</p>
                  <p className="text-xs text-slate-500 mt-1">.ttf, .otf, .woff, .woff2</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
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
              onClick={handleUploadFont}
              disabled={uploadLoading || !selectedFile}
            >
              {uploadLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengupload...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Upload</>
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
            Apakah Anda yakin ingin menghapus font{" "}
            <span className="font-semibold text-white">{selectedFont?.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</>
              ) : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
