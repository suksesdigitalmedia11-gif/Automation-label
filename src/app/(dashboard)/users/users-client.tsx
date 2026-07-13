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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, User, KeyRound, Loader2, Users } from "lucide-react";
import { createUser, updateUser, deleteUser, resetPassword } from "@/actions/user-actions";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export function UsersClient({ users }: { users: UserData[] }) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("operator");
  };

  const handleCreate = async () => {
    if (!name || !email || !password) {
      toast.error("Nama, email, dan password wajib diisi");
      return;
    }
    setLoading(true);
    const res = await createUser({ name, email, password, role });
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("User berhasil ditambahkan");
      setCreateOpen(false);
      resetForm();
      router.refresh();
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    if (!name || !email) {
      toast.error("Nama dan email wajib diisi");
      return;
    }
    setLoading(true);
    const res = await updateUser(selectedUser.id, { name, email, role });
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("User berhasil diupdate");
      setEditOpen(false);
      router.refresh();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!password) {
      toast.error("Password baru wajib diisi");
      return;
    }
    setLoading(true);
    const res = await resetPassword(selectedUser.id, password);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Password berhasil direset");
      setResetOpen(false);
      setPassword("");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setLoading(true);
    const res = await deleteUser(selectedUser.id);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("User berhasil dihapus");
      setDeleteOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-400" /> Manajemen User
          </h1>
          <p className="mt-1 text-slate-400">Kelola akses akun admin dan operator sistem</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Tambah User
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Nama Lengkap</TableHead>
                <TableHead className="text-slate-400">Email / Username</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Terdaftar</TableHead>
                <TableHead className="text-slate-400 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell className="font-medium text-white">{u.name}</TableCell>
                  <TableCell className="text-slate-300">{u.email}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                        <Shield className="mr-1 h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                        <User className="mr-1 h-3 w-3" /> Operator
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {new Date(u.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" title="Reset Password" onClick={() => { setSelectedUser(u); setPassword(""); setResetOpen(true); }} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" title="Edit User" onClick={() => { setSelectedUser(u); setName(u.name); setEmail(u.email); setRole(u.role); setEditOpen(true); }} className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" title="Hapus User" onClick={() => { setSelectedUser(u); setDeleteOpen(true); }} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nama Lengkap</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email / Username</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white"><SelectValue/></SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Batal</Button>
            <Button onClick={handleCreate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nama Lengkap</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email / Username</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white"><SelectValue/></SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Batal</Button>
            <Button onClick={handleEdit} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Simpan Perubahan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Reset Password - {selectedUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Password Baru</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border-slate-700 bg-slate-800 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Batal</Button>
            <Button onClick={handleResetPassword} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Reset Password"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Hapus User</DialogTitle></DialogHeader>
          <div className="py-4 text-slate-300">
            Apakah Anda yakin ingin menghapus user <span className="font-bold text-white">{selectedUser?.name}</span>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Batal</Button>
            <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Hapus User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
