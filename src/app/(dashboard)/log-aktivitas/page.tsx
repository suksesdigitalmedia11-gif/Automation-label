import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/actions/audit-log-actions";
import { LogAktivitasClient } from "./log-aktivitas-client";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function LogAktivitasPage({ searchParams }: PageProps) {
  const session = await auth();

  // Only admin can access
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const result = await getAuditLogs({
    page: parseInt(params.page || "1"),
    action: params.action || "all",
    search: params.search || "",
    startDate: params.startDate || "",
    endDate: params.endDate || "",
  });

  if ("error" in result) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-medium">Gagal memuat log aktivitas</p>
          <p className="text-slate-400 text-sm mt-1">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <LogAktivitasClient
      initialData={result.data}
      totalCount={result.totalCount}
      totalPages={result.totalPages}
      currentPage={result.currentPage}
      actionFilter={params.action || "all"}
      searchFilter={params.search || ""}
      startDate={params.startDate || ""}
      endDate={params.endDate || ""}
    />
  );
}
