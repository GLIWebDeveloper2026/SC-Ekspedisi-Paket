"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useCourierId } from "@/lib/offline/use-courier-id";
import { enqueueDeliveryAttempt } from "@/lib/offline/offlineQueue";
import { CapStempel } from "@/components/cap-stempel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RESULTS = [
  { value: "BERHASIL", label: "Berhasil" },
  { value: "GAGAL", label: "Gagal" },
  { value: "DITITIP_PIHAK_KETIGA", label: "Titip Pihak Ketiga" },
] as const;

interface ResiSummary {
  noResi: string;
  recipientName: string;
  recipientAddress: string;
}

type SubmitOutcome = { mode: "online" } | { mode: "offline" };

export default function LaporDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resiId } = use(params);
  const router = useRouter();
  const { courierId } = useCourierId();

  const { data: resi } = useQuery({
    queryKey: ["kurir-resi", resiId],
    queryFn: () => apiFetch<ResiSummary>(`/api/resi/${resiId}`),
  });

  const [result, setResult] = useState<(typeof RESULTS)[number]["value"]>("BERHASIL");
  const [recipientName, setRecipientName] = useState("");
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [stamp, setStamp] = useState(false);

  const mutation = useMutation({
    mutationFn: async (): Promise<SubmitOutcome> => {
      const thirdPartyFlag = result === "DITITIP_PIHAK_KETIGA";
      const payload = {
        resiId,
        noResi: resi?.noResi ?? "",
        courierId: courierId!,
        result,
        recipientName: recipientName || undefined,
        thirdPartyFlag,
        thirdPartyName: thirdPartyFlag ? thirdPartyName : undefined,
        evidenceNote: evidenceNote || undefined,
        proofPhoto,
      };

      if (!navigator.onLine) {
        await enqueueDeliveryAttempt(payload);
        return { mode: "offline" };
      }

      try {
        const formData = new FormData();
        formData.set("resiId", resiId);
        formData.set("courierId", courierId!);
        formData.set("result", result);
        if (recipientName) formData.set("recipientName", recipientName);
        formData.set("thirdPartyFlag", String(thirdPartyFlag));
        if (thirdPartyFlag) formData.set("thirdPartyName", thirdPartyName);
        if (evidenceNote) formData.set("evidenceNote", evidenceNote);
        if (proofPhoto) formData.set("proofPhoto", proofPhoto);

        await apiFetch("/api/delivery-attempts", { method: "POST", body: formData });
        return { mode: "online" };
      } catch {
        // Server unreachable meski navigator.onLine true (mis. sinyal lemah) — fallback ke antrian.
        await enqueueDeliveryAttempt(payload);
        return { mode: "offline" };
      }
    },
    onSuccess: (outcome) => {
      if (outcome.mode === "online") {
        if (result === "BERHASIL") setStamp(true);
        toast.success("Pengantaran dilaporkan");
        setTimeout(() => router.push("/kurir"), result === "BERHASIL" ? 1500 : 0);
      } else {
        toast.warning("Belum ada sinyal — tersimpan lokal, akan dikirim otomatis nanti");
        router.push("/kurir");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <CapStempel show={stamp} label="Terkirim" onDone={() => setStamp(false)} />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">{resi?.noResi ?? resiId}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {resi?.recipientName} — {resi?.recipientAddress}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {RESULTS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setResult(r.value)}
            className={cn(
              "rounded-lg border py-4 text-sm font-medium",
              result === r.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {result === "BERHASIL" && (
        <div className="flex flex-col gap-2">
          <Label>Nama Penerima</Label>
          <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
        </div>
      )}

      {result === "DITITIP_PIHAK_KETIGA" && (
        <div className="flex flex-col gap-2">
          <Label>Nama Penerima Titipan</Label>
          <Input required value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Bukti Foto</Label>
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setProofPhoto(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Keterangan (kalau tidak ada foto)</Label>
        <Input value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} />
      </div>

      <Button
        size="lg"
        className="mt-2 h-14 text-base"
        disabled={mutation.isPending || !courierId}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Mengirim..." : "⚡ Lapor"}
      </Button>
    </div>
  );
}
