"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResiListItem {
  id: string;
  noResi: string;
  senderName: string;
  recipientName: string;
  serviceType: string;
  totalOngkir: number;
  isCod: boolean;
  createdAt: string;
  originAgent: { name: string };
}

export default function ResiListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resi-list"],
    queryFn: () => apiFetch<{ data: ResiListItem[] }>("/api/resi"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resi</h1>
          <p className="text-muted-foreground">Daftar resi yang sudah dibuat</p>
        </div>
        <Button render={<Link href="/resi/new" />}>+ Buat Resi</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Resi</TableHead>
                  <TableHead>Pengirim</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Agen Asal</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Ongkir</TableHead>
                  <TableHead>COD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/resi/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.noResi}
                      </Link>
                    </TableCell>
                    <TableCell>{r.senderName}</TableCell>
                    <TableCell>{r.recipientName}</TableCell>
                    <TableCell>{r.originAgent?.name}</TableCell>
                    <TableCell>{r.serviceType}</TableCell>
                    <TableCell>Rp{r.totalOngkir.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{r.isCod ? <Badge>COD</Badge> : "-"}</TableCell>
                  </TableRow>
                ))}
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada resi.
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
