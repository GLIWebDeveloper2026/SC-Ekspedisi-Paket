"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchableSelect } from "@/components/searchable-select";
import { TableSearch } from "@/components/table-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL_ROLES = ["OWNER", "PETUGAS_LOKET", "KEPALA_GUDANG", "KURIR"] as const;
type RoleValue = (typeof ALL_ROLES)[number];

function assignableRoles(actorRole?: string): RoleValue[] {
  if (actorRole === "OWNER") return [...ALL_ROLES];
  if (actorRole === "KEPALA_GUDANG") return ["KURIR"];
  return [];
}

interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  isActive: boolean;
  agentName: string | null;
  warehouseName: string | null;
}
interface AgentOption {
  id: string;
  name: string;
}
interface WarehouseOption {
  id: string;
  name: string;
}

export default function KelolaAkunPage() {
  const { data: session } = useSession();
  const actorRole = session?.user?.role;
  const roles = assignableRoles(actorRole);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<{ data: UserListItem[] }>("/api/admin/users"),
  });
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<{ data: AgentOption[] }>("/api/agents"),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<{ data: WarehouseOption[] }>("/api/warehouses"),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleValue>(roles[0] ?? "KURIR");
  const [agentId, setAgentId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          agentId: role === "PETUGAS_LOKET" ? agentId || undefined : undefined,
          warehouseId:
            actorRole !== "KEPALA_GUDANG" && (role === "KEPALA_GUDANG" || role === "KURIR")
              ? warehouseId || undefined
              : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Akun berhasil dibuat");
      setName("");
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      toast.success("Status akun diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/users/${resetTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
      }),
    onSuccess: () => {
      toast.success("Password berhasil direset");
      setResetTargetId(null);
      setNewPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const needsAgent = role === "PETUGAS_LOKET";
  const needsWarehouse = actorRole !== "KEPALA_GUDANG" && (role === "KEPALA_GUDANG" || role === "KURIR");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"SEMUA" | RoleValue>("SEMUA");

  const filteredUsers = useMemo(() => {
    return (data?.data ?? []).filter(
      (u) =>
        (roleFilter === "SEMUA" || u.role === roleFilter) &&
        matchesSearch(search, u.name, u.email, u.agentName, u.warehouseName),
    );
  }, [data, search, roleFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="Kelola Akun"
        description="Akun bersifat admin-provisioned — tidak ada pendaftaran mandiri. Nonaktifkan, jangan hapus."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" />
            Buat Akun Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Nama</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Username/Email</Label>
              <Input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mis. kurir07 atau nama@kilat.test"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Password Awal</Label>
              <Input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as RoleValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsAgent && (
              <div className="flex flex-col gap-2">
                <Label>Agen</Label>
                <SearchableSelect
                  placeholder="Pilih agen"
                  value={agentId}
                  onValueChange={setAgentId}
                  options={(agents?.data ?? []).map((a) => ({ id: a.id, label: a.name }))}
                />
              </div>
            )}

            {needsWarehouse && (
              <div className="flex flex-col gap-2">
                <Label>Gudang</Label>
                <SearchableSelect
                  placeholder="Pilih gudang"
                  value={warehouseId}
                  onValueChange={setWarehouseId}
                  options={(warehouses?.data ?? []).map((w) => ({ id: w.id, label: w.name }))}
                />
              </div>
            )}

            {actorRole === "KEPALA_GUDANG" && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Kamu hanya bisa membuat akun Kurir, otomatis di gudangmu sendiri.
              </p>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
                <UserPlus className="size-4" />
                {createMutation.isPending ? "Menyimpan..." : "Buat Akun"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Daftar Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && data.data.length === 0 && (
            <EmptyState icon={Users} title="Belum ada akun" description="Akun yang dibuat akan muncul di sini." />
          )}
          {data && data.data.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TableSearch value={search} onChange={setSearch} placeholder="Cari nama, email, agen, gudang..." />
                <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v as typeof roleFilter)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA">Semua Role</SelectItem>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState icon={Users} title="Tidak ada hasil" description="Coba ubah kata kunci atau filter role." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Username/Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Agen/Gudang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>{u.agentName ?? u.warehouseName ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "default" : "destructive"}>
                            {u.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                disabled={toggleActiveMutation.isPending}
                                onClick={() =>
                                  toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })
                                }
                              >
                                {u.isActive ? (
                                  <ShieldOff className="size-3.5" />
                                ) : (
                                  <ShieldCheck className="size-3.5" />
                                )}
                                {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setResetTargetId(resetTargetId === u.id ? null : u.id)}
                              >
                                <KeyRound className="size-3.5" />
                                Reset Password
                              </Button>
                            </div>
                            {resetTargetId === u.id && (
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="Password baru"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  disabled={resetPasswordMutation.isPending}
                                  onClick={() => resetPasswordMutation.mutate()}
                                >
                                  Simpan
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
