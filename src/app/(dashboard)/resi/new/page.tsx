"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, User, MapPin, Ruler, Wallet, PackageSearch } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SectionLabel({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:col-span-2">
      <Icon className="size-3.5" />
      {children}
    </div>
  );
}

interface Agent {
  id: string;
  name: string;
  districtName: string;
}
interface District {
  id: string;
  name: string;
  isZonaJauh: boolean;
}
interface CreateResiResponse {
  id: string;
  noResi: string;
  totalOngkir: number;
}
interface OngkirPreview {
  beratTertagihKg: number;
  biayaDasar: number;
  biayaZona: number;
  totalOngkir: number;
}

const SERVICE_TYPES = ["REGULER", "KILAT", "KARGO"] as const;

export default function NewResiPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isPetugasLoket = session?.user?.role === "PETUGAS_LOKET";

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<{ data: Agent[] }>("/api/agents"),
  });
  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => apiFetch<{ data: District[] }>("/api/districts"),
  });

  const [form, setForm] = useState({
    originAgentId: "",
    destinationDistrictId: "",
    senderName: "",
    senderPhone: "",
    recipientName: "",
    recipientAddress: "",
    serviceType: "REGULER" as (typeof SERVICE_TYPES)[number],
    beratAktualKg: "",
    panjangCm: "",
    lebarCm: "",
    tinggiCm: "",
    isCod: false,
    nilaiCod: "",
    itemDescription: "",
    isFragile: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Petugas Loket cuma boleh bikin resi atas nama agennya sendiri — kunci
  // field-nya (turunan dari session, bukan state sendiri) supaya dia tidak
  // bisa pilih agen lain. Server juga menegakkan ini secara independen.
  const originAgentId = isPetugasLoket ? (session?.user?.agentId ?? "") : form.originAgentId;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<CreateResiResponse>("/api/resi", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          originAgentId,
          beratAktualKg: Number(form.beratAktualKg),
          panjangCm: Number(form.panjangCm),
          lebarCm: Number(form.lebarCm),
          tinggiCm: Number(form.tinggiCm),
          nilaiCod: form.isCod ? Number(form.nilaiCod) : undefined,
        }),
      }),
    onSuccess: (res) => {
      toast.success(`Resi ${res.noResi} berhasil dibuat — total ongkir Rp${res.totalOngkir.toLocaleString("id-ID")}`);
      router.push(`/resi/${res.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const previewInput = {
    destinationDistrictId: form.destinationDistrictId,
    serviceType: form.serviceType,
    beratAktualKg: Number(form.beratAktualKg),
    panjangCm: Number(form.panjangCm),
    lebarCm: Number(form.lebarCm),
    tinggiCm: Number(form.tinggiCm),
  };
  const previewReady =
    !!previewInput.destinationDistrictId &&
    previewInput.beratAktualKg > 0 &&
    previewInput.panjangCm > 0 &&
    previewInput.lebarCm > 0 &&
    previewInput.tinggiCm > 0;

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["resi-ongkir-preview", previewInput],
    queryFn: () =>
      apiFetch<OngkirPreview>("/api/resi/preview", {
        method: "POST",
        body: JSON.stringify(previewInput),
      }),
    enabled: previewReady,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-terpal/10 text-terpal">
          <PackagePlus className="size-5" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Buat Resi Baru</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detail Resi</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <SectionLabel icon={MapPin}>Rute</SectionLabel>
            <div className="flex flex-col gap-2">
              <Label>Agen Asal</Label>
              <SearchableSelect
                placeholder="Pilih agen"
                value={originAgentId}
                onValueChange={(v) => update("originAgentId", v)}
                options={(agents?.data ?? []).map((a) => ({
                  id: a.id,
                  label: `${a.name} (${a.districtName})`,
                }))}
                disabled={isPetugasLoket}
              />
              {isPetugasLoket && (
                <p className="text-xs text-muted-foreground">
                  Resi selalu dibuat atas nama agenmu sendiri.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Kecamatan Tujuan</Label>
              <SearchableSelect
                placeholder="Pilih kecamatan"
                value={form.destinationDistrictId}
                onValueChange={(v) => update("destinationDistrictId", v)}
                options={(districts?.data ?? []).map((d) => ({
                  id: d.id,
                  label: d.isZonaJauh ? `${d.name} (Zona Jauh)` : d.name,
                }))}
              />
            </div>

            <SectionLabel icon={User}>Pengirim & Penerima</SectionLabel>
            <div className="flex flex-col gap-2">
              <Label>Nama Pengirim</Label>
              <Input required value={form.senderName} onChange={(e) => update("senderName", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>No HP Pengirim</Label>
              <Input required value={form.senderPhone} onChange={(e) => update("senderPhone", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nama Penerima</Label>
              <Input
                required
                value={form.recipientName}
                onChange={(e) => update("recipientName", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Alamat Penerima</Label>
              <Input
                required
                value={form.recipientAddress}
                onChange={(e) => update("recipientAddress", e.target.value)}
              />
            </div>

            <SectionLabel icon={Ruler}>Layanan & Dimensi</SectionLabel>
            <div className="flex flex-col gap-2">
              <Label>Jenis Layanan</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v) => update("serviceType", v as (typeof SERVICE_TYPES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Berat Aktual (kg)</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={form.beratAktualKg}
                onChange={(e) => update("beratAktualKg", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Panjang (cm)</Label>
              <Input
                type="number"
                required
                value={form.panjangCm}
                onChange={(e) => update("panjangCm", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Lebar (cm)</Label>
              <Input
                type="number"
                required
                value={form.lebarCm}
                onChange={(e) => update("lebarCm", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tinggi (cm)</Label>
              <Input
                type="number"
                required
                value={form.tinggiCm}
                onChange={(e) => update("tinggiCm", e.target.value)}
              />
            </div>

            <SectionLabel icon={PackageSearch}>Isi Paket</SectionLabel>
            <div className="flex flex-col gap-2">
              <Label>Keterangan Barang</Label>
              <Input
                value={form.itemDescription}
                onChange={(e) => update("itemDescription", e.target.value)}
                placeholder="mis. Bantal, kaca, dokumen..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isFragile"
                checked={form.isFragile}
                onCheckedChange={(v) => update("isFragile", v === true)}
              />
              <Label htmlFor="isFragile">Mudah Pecah / Fragile</Label>
            </div>

            <SectionLabel icon={Wallet}>Pembayaran</SectionLabel>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="isCod"
                checked={form.isCod}
                onCheckedChange={(v) => update("isCod", v === true)}
              />
              <Label htmlFor="isCod">Bayar di Tempat (COD)</Label>
            </div>
            {form.isCod && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Nilai COD (Rp)</Label>
                <Input
                  type="number"
                  required
                  value={form.nilaiCod}
                  onChange={(e) => update("nilaiCod", e.target.value)}
                />
              </div>
            )}

            {previewReady && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm sm:col-span-2">
                {previewLoading && <p className="text-muted-foreground">Menghitung ongkir...</p>}
                {preview && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Berat Tertagih</span>
                      <span className="font-mono tabular-nums">{preview.beratTertagihKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biaya Dasar</span>
                      <span className="font-mono tabular-nums">
                        Rp{preview.biayaDasar.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {preview.biayaZona > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Biaya Zona Jauh</span>
                        <span className="font-mono tabular-nums">
                          Rp{preview.biayaZona.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t pt-1.5 font-semibold">
                      <span>Total Ongkir</span>
                      <span className="font-mono tabular-nums">
                        Rp{preview.totalOngkir.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending} className="w-full gap-1.5">
                <PackagePlus className="size-4" />
                {mutation.isPending ? "Menyimpan..." : "Buat Resi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
