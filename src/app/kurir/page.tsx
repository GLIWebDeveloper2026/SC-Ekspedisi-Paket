"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCourierId } from "@/lib/offline/use-courier-id";
import { CourierPicker } from "@/components/kurir/courier-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResiListItem {
  id: string;
  noResi: string;
  recipientName: string;
  serviceType: string;
  isCod: boolean;
}

export default function KurirResiPage() {
  const { courierId, hydrated } = useCourierId();
  const { data, isLoading } = useQuery({
    queryKey: ["kurir-resi-options"],
    queryFn: () => apiFetch<{ data: ResiListItem[] }>("/api/resi"),
    enabled: !!courierId,
  });

  if (!hydrated) return null;

  if (!courierId) {
    return <CourierPicker />;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Memuat..." : `Hari ini: ${data?.data.length ?? 0} resi`}
      </p>

      {data?.data.map((r) => (
        <Link key={r.id} href={`/kurir/lapor/${r.id}`}>
          <Card className="active:scale-[0.98]">
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-heading font-bold">{r.noResi}</p>
                <p className="text-sm text-muted-foreground">{r.recipientName}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.isCod && <Badge>COD</Badge>}
                <span className="text-xs text-primary">Lapor →</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}

      {data?.data.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Tidak ada resi.</p>
      )}
    </div>
  );
}
