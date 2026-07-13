"use client";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ScrollText, ShoppingCart, Activity,
  Type, Image as ImageIcon, CheckCircle2, Wand2,
  TrendingUp, Clock, Users, AlertCircle, Printer,
  History, ChevronRight,
} from "lucide-react";
import Link from "next/link";

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Processed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Completed: "bg-green-500/10 text-green-400 border-green-500/20",
    Failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const labels: Record<string, string> = {
    Processed: "Pending", Completed: "Selesai", Failed: "Gagal",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>{labels[status] || status}</Badge>
  );
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });

const formatTime = (d: string) =>
  new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const getActionBadge = (action: string) => {
  if (action.includes("BUAT") || action.includes("TAMBAH")) return "bg-green-500/10 text-green-400 border-green-500/20";
  if (action.includes("HAPUS")) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (action.includes("GENERATE")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
};

interface Roll {
  id: string; rollName: string; heightCm: string;
  quantity: number; status: string; createdAt: string;
}

interface Transaction {
  id: string; quantity: number | null; numberOfDetails: number | null;
  status: string; createdAt: string; transactionDate: string;
  roll: { rollName: string };
  user?: { name: string } | null;
}

interface LogEntry {
  id: string; userName: string; userRole: string;
  action: string; entity: string; entityLabel: string | null;
  createdAt: string;
}

interface Props {
  userName: string; userRole: string;
  totalRolls: number; totalTransactions: number;
  totalFonts: number; totalBackgrounds: number;
  completedTransactions: number;
  transaksiHariIni: number;
  transaksiPending: number;
  userAktifHariIni: number;
  totalNamaCetakHariIni: number;
  recentRolls: Roll[];
  recentTransactions: Transaction[];
  recentLogs: LogEntry[];
}

export function DashboardClient({
  userName, userRole,
  totalRolls, totalTransactions,
  totalFonts, totalBackgrounds, completedTransactions,
  transaksiHariIni, transaksiPending, userAktifHariIni, totalNamaCetakHariIni,
  recentRolls, recentTransactions, recentLogs,
}: Props) {
  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Selamat datang, <span className="text-white font-medium">{userName}</span> 👋
          {isAdmin && <span className="ml-2 text-xs text-purple-400 border border-purple-500/30 bg-purple-500/10 rounded px-2 py-0.5">Admin</span>}
        </p>
      </div>

      {/* Stats Cards Row 1 - selalu tampil */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link href="/roll">
          <Card className="border-slate-800 bg-slate-900 hover:border-blue-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Roll</CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-1.5 group-hover:bg-blue-500/20 transition-colors">
                <ScrollText className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalRolls}</div>
              <p className="text-xs text-slate-500 mt-1">Roll tersedia</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transaksi">
          <Card className="border-slate-800 bg-slate-900 hover:border-purple-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Transaksi</CardTitle>
              <div className="rounded-lg bg-purple-500/10 p-1.5 group-hover:bg-purple-500/20 transition-colors">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalTransactions}</div>
              <p className="text-xs text-slate-500 mt-1">Semua transaksi</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transaksi?status=Completed">
          <Card className="border-slate-800 bg-slate-900 hover:border-green-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Label Selesai</CardTitle>
              <div className="rounded-lg bg-green-500/10 p-1.5 group-hover:bg-green-500/20 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{completedTransactions}</div>
              <p className="text-xs text-slate-500 mt-1">Siap diunduh</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/materials/font">
          <Card className="border-slate-800 bg-slate-900 hover:border-yellow-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Font</CardTitle>
              <div className="rounded-lg bg-yellow-500/10 p-1.5 group-hover:bg-yellow-500/20 transition-colors">
                <Type className="h-4 w-4 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalFonts}</div>
              <p className="text-xs text-slate-500 mt-1">Font tersedia</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/materials/background">
          <Card className="border-slate-800 bg-slate-900 hover:border-pink-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Background</CardTitle>
              <div className="rounded-lg bg-pink-500/10 p-1.5 group-hover:bg-pink-500/20 transition-colors">
                <ImageIcon className="h-4 w-4 text-pink-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalBackgrounds}</div>
              <p className="text-xs text-slate-500 mt-1">Plat tersedia</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Admin-only KPI Row */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-blue-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Transaksi Hari Ini</CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-1.5">
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{transaksiHariIni}</div>
              <p className="text-xs text-slate-500 mt-1">Dibuat hari ini</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Transaksi Pending</CardTitle>
              <div className="rounded-lg bg-yellow-500/10 p-1.5">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{transaksiPending}</div>
              <p className="text-xs text-slate-500 mt-1">Belum di-generate</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-green-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Nama Dicetak Hari Ini</CardTitle>
              <div className="rounded-lg bg-green-500/10 p-1.5">
                <Printer className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalNamaCetakHariIni}</div>
              <p className="text-xs text-slate-500 mt-1">Total qty selesai hari ini</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-purple-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">User Aktif Hari Ini</CardTitle>
              <div className="rounded-lg bg-purple-500/10 p-1.5">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{userAktifHariIni}</div>
              <p className="text-xs text-slate-500 mt-1">User yang beraktivitas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Action Banner */}
      <Card className="border-slate-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/20 p-2.5">
                <Wand2 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Buat Label Baru</p>
                <p className="text-xs text-slate-400">Pergi ke Transaksi → Tambah Transaksi → Input nama → Generate</p>
              </div>
            </div>
            <Link href="/transaksi">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 cursor-pointer px-3 py-1.5">
                Mulai →
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Rolls */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-blue-400" /> Roll Terbaru
            </CardTitle>
            <Link href="/roll" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentRolls.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Belum ada data roll</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Nama Roll</TableHead>
                    <TableHead className="text-slate-400">Tinggi</TableHead>
                    <TableHead className="text-slate-400">Qty</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRolls.map((roll) => (
                    <TableRow key={roll.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-white">{roll.rollName}</TableCell>
                      <TableCell className="text-slate-300">{parseFloat(roll.heightCm).toFixed(1)} cm</TableCell>
                      <TableCell className="text-slate-300">{roll.quantity}</TableCell>
                      <TableCell>{statusBadge(roll.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" /> Transaksi Terbaru
            </CardTitle>
            <Link href="/transaksi" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Belum ada data transaksi</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Roll</TableHead>
                    <TableHead className="text-slate-400">Detail</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="font-medium text-white text-sm">{tx.roll?.rollName || "-"}</div>
                        {isAdmin && tx.user?.name && (
                          <div className="text-xs text-slate-500">{tx.user.name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {tx.numberOfDetails
                          ? <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{tx.numberOfDetails} nama</Badge>
                          : <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell>{statusBadge(tx.status)}</TableCell>
                      <TableCell className="text-slate-400 text-xs whitespace-nowrap">{formatDate(tx.transactionDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin: Real-time Activity Feed */}
      {isAdmin && recentLogs.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-4 w-4 text-orange-400" /> Aktivitas Terkini
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20 ml-1">Live</Badge>
            </CardTitle>
            <Link href="/log" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              Lihat semua log <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2 hover:bg-slate-800/60 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-medium">{log.userName}</span>
                      <Badge variant="outline" className={`text-xs ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.entityLabel && (
                        <span className="text-slate-500 text-xs truncate max-w-[180px]">{log.entityLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
