"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useCourierId } from "@/lib/offline/use-courier-id";
import { enqueueCodRemit } from "@/lib/offline/offlineQueue";
import { CapStempel } from "@/components/cap-stempel";
import { CourierPicker } from "@/components/kurir/courier-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";

interface CourierOption {
  id: string;
  name: string;
}
interface CodItem {
  resiId: string;
  noResi: string;
  courierName: string;
  expectedRemit: number;
  remitStatus: "PENDING" | "REMITTED" | "DISCREPANCY";
}

export default function KurirCodPage() {
  const { courierId, hydrated } = useCourierId();
  const { data: couriers } = useQuery({
    queryKey: ["courier-options"],
    queryFn: () => apiFetch<{ data: CourierOption[] }>("/api/couriers"),
    enabled: !!courierId,
  });
  const courierName = couriers?.data.find((c) => c.id === courierId)?.name;

  const { data: codList } = useQuery({
    queryKey: ["kurir-cod-list"],
    queryFn: () => apiFetch<{ data: CodItem[] }>("/api/cod"),
    enabled: !!courierId,
  });

  const pending = codList?.data.filter(
    (c) => c.courierName === courierName && c.remitStatus !== "REMITTED",
  );

  const [activeResiId, setActiveResiId] = useState<string | null>(null);
  const [remitAmount, setRemitAmount] = useState("");
  const [stamp, setStamp] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const resiId = activeResiId!;
      const amount = Number(remitAmount);

      if (!navigator.onLine) {
        await enqueueCodRemit({ resiId, noResi: resiId, remitAmount: amount });
        return { mode: "offline" as const };
      }

      try {
        const res = await apiFetch<{ remitStatus: string }>(`/api/cod/${resiId}/remit`, {
          method: "POST",
          body: JSON.stringify({ remitAmount: amount }),
        });
        return { mode: "online" as const, remitStatus: res.remitStatus };
      } catch {
        await enqueueCodRemit({ resiId, noResi: resiId, remitAmount: amount });
        return { mode: "offline" as const };
      }
    },
    onSuccess: (outcome) => {
      if (outcome.mode === "online") {
        if (outcome.remitStatus === "REMITTED") setStamp(true);
        toast.success("Setoran dicatat");
      } else {
        toast.warning("Belum ada sinyal — tersimpan lokal, akan dikirim otomatis nanti");
      }
      setActiveResiId(null);
      setRemitAmount("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!hydrated) return null;
  if (!courierId) return <CourierPicker />;

  return (
    <div className="flex flex-col gap-3">
      <CapStempel show={stamp} label="Lunas" onDone={() => setStamp(false)} />
      <p className="text-sm text-muted-foreground">{pending?.length ?? 0} setoran menunggu</p>

      {pending?.map((c) => (
        <Card key={c.resiId}>
          <CardHeader>
            <CardTitle className="font-heading text-base">{c.noResi}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setoran wajib</span>
              <Money amount={c.expectedRemit} />
            </div>

            {activeResiId === c.resiId ? (
              <div className="flex flex-col gap-2">
                <Label>Jumlah Setoran (Rp)</Label>
                <Input
                  type="number"
                  value={remitAmount}
                  onChange={(e) => setRemitAmount(e.target.value)}
                />
                <Button
                  className="h-12"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Mengirim..." : "Setor"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setActiveResiId(c.resiId)}>
                Setor Sekarang
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {pending?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Tidak ada setoran pending.</p>
      )}
    </div>
  );
}
