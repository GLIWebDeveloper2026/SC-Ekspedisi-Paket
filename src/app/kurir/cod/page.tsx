"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, HandCoins } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { enqueueCodRemit } from "@/lib/offline/offlineQueue";
import { CapStempel } from "@/components/cap-stempel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";

interface CodItem {
  resiId: string;
  noResi: string;
  courierId: string;
  expectedRemit: number;
  remitStatus: "PENDING" | "REMITTED" | "DISCREPANCY";
}

export default function KurirCodPage() {
  const { data: session } = useSession();
  const courierId = session?.user?.id;

  const { data: codList } = useQuery({
    queryKey: ["kurir-cod-list"],
    queryFn: () => apiFetch<{ data: CodItem[] }>("/api/cod"),
    enabled: !!courierId,
  });

  const pending = codList?.data.filter(
    (c) => c.courierId === courierId && c.remitStatus !== "REMITTED",
  );

  const [activeResiId, setActiveResiId] = useState<string | null>(null);
  const [remitAmount, setRemitAmount] = useState("");
  const [stamp, setStamp] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const resiId = activeResiId!;
      const noResi = pending?.find((c) => c.resiId === resiId)?.noResi ?? resiId;
      const amount = Number(remitAmount);

      if (!navigator.onLine) {
        await enqueueCodRemit({ resiId, noResi, remitAmount: amount });
        return { mode: "offline" as const };
      }

      try {
        const res = await apiFetch<{ remitStatus: string }>(`/api/cod/${resiId}/remit`, {
          method: "POST",
          body: JSON.stringify({ remitAmount: amount }),
        });
        return { mode: "online" as const, remitStatus: res.remitStatus };
      } catch {
        await enqueueCodRemit({ resiId, noResi, remitAmount: amount });
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

  return (
    <div className="flex flex-col gap-3">
      <CapStempel show={stamp} label="Lunas" onDone={() => setStamp(false)} />
      <p className="text-sm text-muted-foreground">{pending?.length ?? 0} setoran menunggu</p>

      {pending?.map((c) => (
        <Card key={c.resiId}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
              <Wallet className="size-4 text-lampu-natrium" />
            </div>
            <CardTitle className="font-mono text-sm tracking-wide">{c.noResi}</CardTitle>
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
                  className="h-12 gap-2"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  <HandCoins className="size-4" />
                  {mutation.isPending ? "Mengirim..." : "Setor"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setActiveResiId(c.resiId)}>
                <HandCoins className="size-4" />
                Setor Sekarang
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {pending?.length === 0 && (
        <EmptyState icon={Wallet} title="Tidak ada setoran pending" description="Semua COD sudah beres." />
      )}
    </div>
  );
}
