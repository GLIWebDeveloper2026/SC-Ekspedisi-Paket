"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export interface SearchableSelectOption {
  id: string;
  label: string;
}

/**
 * Dropdown dengan search, dan yang penting: menampilkan LABEL yang dipilih,
 * bukan raw id-nya. shadcn/ui Select (Base UI) hanya menampilkan label kalau
 * diberi `items`/`itemToStringLabel` — tanpa itu, `<Select.Value>` fallback ke
 * menampilkan value mentah (id). Combobox di sini selalu diberi keduanya.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "Tidak ada hasil.",
  disabled,
  className,
}: {
  value: string;
  onValueChange: (id: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item) =>
        onValueChange(item ? (item as SearchableSelectOption).id : "")
      }
      itemToStringLabel={(o: SearchableSelectOption) => o?.label ?? ""}
      isItemEqualToValue={(a: SearchableSelectOption, b: SearchableSelectOption) => a?.id === b?.id}
      disabled={disabled}
    >
      <ComboboxInput placeholder={placeholder} className={className ?? "w-full"} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
