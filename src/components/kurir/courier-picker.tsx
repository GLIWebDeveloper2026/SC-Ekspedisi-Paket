"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCourierId } from "@/lib/offline/use-courier-id";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CourierOption {
  id: string;
  name: string;
}

/** Ditampilkan sekali di perangkat kurir untuk memilih identitas Courier-nya. */
export function CourierPicker({ onPicked }: { onPicked?: () => void }) {
  const { setCourierId } = useCourierId();
  const { data } = useQuery({
    queryKey: ["courier-options"],
    queryFn: () => apiFetch<{ data: CourierOption[] }>("/api/couriers"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih Identitas Kurir</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          onValueChange={(v: string | null) => {
            if (v) {
              setCourierId(v);
              onPicked?.();
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Saya adalah..." />
          </SelectTrigger>
          <SelectContent>
            {data?.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
