"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, ClipboardList, PackageSearch } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { CapStempel } from "@/components/cap-stempel";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ResiOption {
  id: string;
  noResi: string;
}
interface CourierOption {
  id: string;
  name: string;
}

const RESULTS = ["BERHASIL", "GAGAL", "DITITIP_PIHAK_KETIGA"] as const;

interface DeliveryAttemptResponse {
  attemptNumber: number;
  autoReturnTriggered: boolean;
}

export default function DeliveryAttemptsPage() {
  const queryClient = useQueryClient();
  const { data: resiOptions } = useQuery({
    queryKey: ["resi-options"],
    queryFn: () => apiFetch<{ data: ResiOption[] }>("/api/resi"),
  });
  const { data: courierOptions } = useQuery({
    queryKey: ["courier-options"],
    queryFn: () => apiFetch<{ data: CourierOption[] }>("/api/couriers"),
  });

  const [resiId, setResiId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [result, setResult] = useState<(typeof RESULTS)[number]>("BERHASIL");
  const [recipientName, setRecipientName] = useState("");
  const [thirdPartyFlag, setThirdPartyFlag] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [stamp, setStamp] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.set("resiId", resiId);
      formData.set("courierId", courierId);
      formData.set("result", result);
      if (recipientName) formData.set("recipientName", recipientName);
      formData.set("thirdPartyFlag", String(thirdPartyFlag));
      if (thirdPartyName) formData.set("thirdPartyName", thirdPartyName);
      if (evidenceNote) formData.set("evidenceNote", evidenceNote);
      if (proofPhoto) formData.set("proofPhoto", proofPhoto);

      return apiFetch<DeliveryAttemptResponse>("/api/delivery-attempts", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (res) => {
      if (result === "BERHASIL") setStamp(true);
      toast.success(
        `Percobaan ke-${res.attemptNumber} dicatat` +
          (res.autoReturnTriggered ? " — otomatis diretur ke gudang (3x gagal)" : ""),
      );
      setThirdPartyFlag(false);
      setThirdPartyName("");
      setEvidenceNote("");
      setProofPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["resi-options"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <CapStempel show={stamp} label="Terkirim" onDone={() => setStamp(false)} />
      <PageHeader
        icon={Truck}
        title="Delivery Attempt"
        description="3x gagal berturut-turut otomatis memicu retur ke gudang."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />
            Catat Percobaan Antar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Resi</Label>
              <Select value={resiId} onValueChange={(v) => setResiId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih resi" />
                </SelectTrigger>
                <SelectContent>
                  {resiOptions?.data.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.noResi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Kurir</Label>
              <Select value={courierId} onValueChange={(v) => setCourierId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kurir" />
                </SelectTrigger>
                <SelectContent>
                  {courierOptions?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Hasil</Label>
              <Select value={result} onValueChange={(v) => setResult(v as typeof result)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nama Penerima (kalau BERHASIL)</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="thirdPartyFlag"
                type="checkbox"
                checked={thirdPartyFlag}
                onChange={(e) => setThirdPartyFlag(e.target.checked)}
              />
              <Label htmlFor="thirdPartyFlag">Dititip ke pihak ketiga</Label>
            </div>

            {thirdPartyFlag && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Nama Penerima Titipan</Label>
                <Input required value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Bukti Foto</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProofPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Keterangan Bukti (fallback kalau tidak ada foto)</Label>
              <Input value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending} className="gap-1.5">
                <Truck className="size-4" />
                {mutation.isPending ? "Menyimpan..." : "Catat Percobaan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {resiOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="size-4 text-muted-foreground" />
              Resi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Resi</TableHead>
                  <TableHead>Resi Id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resiOptions.data.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.noResi}</TableCell>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
