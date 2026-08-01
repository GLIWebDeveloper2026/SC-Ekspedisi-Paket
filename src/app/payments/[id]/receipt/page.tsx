"use client";

import { use } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";

interface ReceiptItem {
  resiId: string;
  noResi: string;
  recipientName: string;
  amountAllocated: number;
}
interface ReceiptData {
  id: string;
  payerName: string;
  method: string;
  totalAmount: number;
  paymentDate: string;
  items: ReceiptItem[];
}

export default function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-receipt", id],
    queryFn: () => apiFetch<ReceiptData>(`/api/payment-transactions/${id}`),
  });

  if (isLoading || !data) {
    return <p className="p-6 text-sm text-muted-foreground">Memuat...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-muted/40 py-8 print:bg-white print:py-0">
      <Button onClick={() => window.print()} className="gap-1.5 print:hidden">
        <Printer className="size-4" />
        Cetak Bukti
      </Button>

      <div className="w-[420px] rounded-lg border-2 border-dashed border-foreground/30 bg-white p-6 text-black print:w-full print:rounded-none print:border-solid">
        <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
          <Image src="/logo-wordmark.png" alt="Kilat Nusantara" width={150} height={53} />
          <div className="text-right text-xs">
            <p className="font-semibold">BUKTI TRANSAKSI</p>
            <p className="font-mono">{data.id.slice(0, 10).toUpperCase()}</p>
          </div>
        </div>

        <div className="mb-4 flex justify-between text-sm">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Pembayar
            </p>
            <p className="font-medium">{data.payerName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Tanggal / Metode
            </p>
            <p>
              {new Date(data.paymentDate).toLocaleDateString("id-ID")} · {data.method}
            </p>
          </div>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left text-xs">
              <th className="pb-1 font-semibold">No Resi</th>
              <th className="pb-1 font-semibold">Penerima</th>
              <th className="pb-1 text-right font-semibold">Ongkir</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.resiId} className="border-b border-dashed">
                <td className="py-1 font-mono">{item.noResi}</td>
                <td className="py-1">{item.recipientName}</td>
                <td className="py-1 text-right">
                  <Money amount={item.amountAllocated} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t-2 border-black pt-2">
          <span className="text-sm font-semibold">
            Total ({data.items.length} resi)
          </span>
          <span className="font-mono text-lg font-bold">
            <Money amount={data.totalAmount} />
          </span>
        </div>
      </div>
    </div>
  );
}
