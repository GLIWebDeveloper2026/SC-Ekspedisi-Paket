"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Building2, Warehouse as WarehouseIcon, PlusCircle, Truck, Save } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchableSelect } from "@/components/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DistrictItem {
  id: string;
  name: string;
  isZonaJauh: boolean;
}
interface AgentItem {
  id: string;
  name: string;
  districtName: string;
}
interface WarehouseItem {
  id: string;
  name: string;
}
interface CourierItem {
  id: string;
  name: string;
}

export default function MasterDataPage() {
  const queryClient = useQueryClient();

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => apiFetch<{ data: DistrictItem[] }>("/api/districts"),
  });
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<{ data: AgentItem[] }>("/api/agents"),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<{ data: WarehouseItem[] }>("/api/warehouses"),
  });
  const { data: couriers } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => apiFetch<{ data: CourierItem[] }>("/api/couriers"),
  });

  // Kecamatan
  const [districtName, setDistrictName] = useState("");
  const [isZonaJauh, setIsZonaJauh] = useState(false);
  const [surchargeAmount, setSurchargeAmount] = useState("");
  const districtMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/districts", {
        method: "POST",
        body: JSON.stringify({
          name: districtName,
          isZonaJauh,
          ...(isZonaJauh ? { surchargeAmount: Number(surchargeAmount) } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Kecamatan berhasil ditambahkan");
      setDistrictName("");
      setIsZonaJauh(false);
      setSurchargeAmount("");
      queryClient.invalidateQueries({ queryKey: ["districts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Agen
  const [agentName, setAgentName] = useState("");
  const [agentDistrictId, setAgentDistrictId] = useState("");
  const agentMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/agents", {
        method: "POST",
        body: JSON.stringify({ name: agentName, districtId: agentDistrictId }),
      }),
    onSuccess: () => {
      toast.success("Agen berhasil ditambahkan");
      setAgentName("");
      setAgentDistrictId("");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Gudang
  const [warehouseName, setWarehouseName] = useState("");
  const warehouseMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/warehouses", { method: "POST", body: JSON.stringify({ name: warehouseName }) }),
    onSuccess: () => {
      toast.success("Gudang berhasil ditambahkan");
      setWarehouseName("");
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Wilayah Kurir
  const [coverageCourierId, setCoverageCourierId] = useState("");
  const { data: coverage } = useQuery({
    queryKey: ["courier-coverage", coverageCourierId],
    queryFn: () => apiFetch<{ data: string[] }>(`/api/courier-coverage?courierId=${coverageCourierId}`),
    enabled: !!coverageCourierId,
  });
  const coverageMutation = useMutation({
    mutationFn: (districtIds: string[]) =>
      apiFetch("/api/courier-coverage", {
        method: "PUT",
        body: JSON.stringify({ courierId: coverageCourierId, districtIds }),
      }),
    onSuccess: () => {
      toast.success("Wilayah kurir disimpan");
      queryClient.invalidateQueries({ queryKey: ["courier-coverage", coverageCourierId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const districtOptions = (districts?.data ?? []).map((d) => ({ id: d.id, label: d.name }));
  const courierOptions = (couriers?.data ?? []).map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Building2}
        title="Master Data"
        description="Kelola kecamatan, agen, dan gudang transit — dibuat lewat aplikasi, bukan cuma sekali di seed awal."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              Kecamatan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                districtMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Nama Kecamatan</Label>
                <Input required value={districtName} onChange={(e) => setDistrictName(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isZonaJauh} onCheckedChange={(v) => setIsZonaJauh(v === true)} />
                Zona Jauh
              </label>
              {isZonaJauh && (
                <div className="flex flex-col gap-2">
                  <Label>Surcharge untuk Tarif Aktif (Rp)</Label>
                  <Input
                    type="number"
                    required
                    value={surchargeAmount}
                    onChange={(e) => setSurchargeAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wajib diisi supaya kecamatan ini langsung kena surcharge zona jauh di tarif yang
                    sedang berjalan — tanpa ini, ongkirnya akan dihitung seperti kecamatan biasa.
                  </p>
                </div>
              )}
              <Button type="submit" disabled={districtMutation.isPending} className="gap-1.5">
                <PlusCircle className="size-4" />
                {districtMutation.isPending ? "Menyimpan..." : "Tambah Kecamatan"}
              </Button>
            </form>
            {districts && districts.data.length === 0 ? (
              <EmptyState icon={MapPin} title="Belum ada kecamatan" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Zona Jauh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(districts?.data ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.isZonaJauh ? "Ya" : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              Agen
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                agentMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Nama Agen</Label>
                <Input required value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Kecamatan</Label>
                <SearchableSelect
                  value={agentDistrictId}
                  onValueChange={setAgentDistrictId}
                  options={districtOptions}
                  placeholder="Pilih kecamatan..."
                />
              </div>
              <Button
                type="submit"
                disabled={agentMutation.isPending || !agentDistrictId}
                className="gap-1.5"
              >
                <PlusCircle className="size-4" />
                {agentMutation.isPending ? "Menyimpan..." : "Tambah Agen"}
              </Button>
            </form>
            {agents && agents.data.length === 0 ? (
              <EmptyState icon={Building2} title="Belum ada agen" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kecamatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(agents?.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.districtName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarehouseIcon className="size-4 text-muted-foreground" />
              Gudang Transit
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                warehouseMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Nama Gudang</Label>
                <Input required value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
              </div>
              <Button type="submit" disabled={warehouseMutation.isPending} className="gap-1.5">
                <PlusCircle className="size-4" />
                {warehouseMutation.isPending ? "Menyimpan..." : "Tambah Gudang"}
              </Button>
            </form>
            {warehouses && warehouses.data.length === 0 ? (
              <EmptyState icon={WarehouseIcon} title="Belum ada gudang" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(warehouses?.data ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>{w.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4 text-muted-foreground" />
            Wilayah Kurir
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Kecamatan yang di-cover 1 kurir — dipakai buat menyaring otomatis dropdown &quot;pilih
            kurir&quot; saat sortir/assign, supaya Kepala Gudang tidak perlu ingat manual siapa
            pegang wilayah mana.
          </p>
          <div className="max-w-sm">
            <SearchableSelect
              value={coverageCourierId}
              onValueChange={setCoverageCourierId}
              options={courierOptions}
              placeholder="Pilih kurir..."
            />
          </div>
          {coverageCourierId && coverage && (
            <CoverageEditor
              key={coverageCourierId}
              districts={districts?.data ?? []}
              initialDistrictIds={coverage.data}
              saving={coverageMutation.isPending}
              onSave={(ids) => coverageMutation.mutate(ids)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CoverageEditor({
  districts,
  initialDistrictIds,
  saving,
  onSave,
}: {
  districts: DistrictItem[];
  initialDistrictIds: string[];
  saving: boolean;
  onSave: (districtIds: string[]) => void;
}) {
  const [checked, setChecked] = useState(() => new Set(initialDistrictIds));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {districts.map((d) => (
          <label key={d.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <Checkbox
              checked={checked.has(d.id)}
              onCheckedChange={(v) =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (v) next.add(d.id);
                  else next.delete(d.id);
                  return next;
                })
              }
            />
            {d.name}
          </label>
        ))}
      </div>
      <div>
        <Button size="sm" disabled={saving} className="gap-1.5" onClick={() => onSave([...checked])}>
          <Save className="size-3.5" />
          {saving ? "Menyimpan..." : "Simpan Wilayah"}
        </Button>
      </div>
    </div>
  );
}
