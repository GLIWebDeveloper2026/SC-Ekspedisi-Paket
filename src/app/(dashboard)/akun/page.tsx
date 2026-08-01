"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
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

const ALL_ROLES = ["OWNER", "ADMIN_PUSAT", "PETUGAS_LOKET", "KEPALA_GUDANG", "KURIR"] as const;
type RoleValue = (typeof ALL_ROLES)[number];

function assignableRoles(actorRole?: string): RoleValue[] {
  if (actorRole === "OWNER") return [...ALL_ROLES];
  if (actorRole === "ADMIN_PUSAT") return ALL_ROLES.filter((r) => r !== "OWNER" && r !== "ADMIN_PUSAT");
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Kelola Akun</h1>
        <p className="text-muted-foreground">
          Akun bersifat admin-provisioned — tidak ada pendaftaran mandiri. Nonaktifkan, jangan hapus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Akun Baru</CardTitle>
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
                <Select value={agentId} onValueChange={(v) => setAgentId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih agen" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.data.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsWarehouse && (
              <div className="flex flex-col gap-2">
                <Label>Gudang</Label>
                <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.data.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actorRole === "KEPALA_GUDANG" && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Kamu hanya bisa membuat akun Kurir, otomatis di gudangmu sendiri.
              </p>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Buat Akun"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Akun</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
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
                {data.data.map((u) => (
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
                            disabled={toggleActiveMutation.isPending}
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })
                            }
                          >
                            {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResetTargetId(resetTargetId === u.id ? null : u.id)}
                          >
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
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada akun.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
