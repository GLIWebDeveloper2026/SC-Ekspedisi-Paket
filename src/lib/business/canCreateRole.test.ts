import { describe, it, expect } from "vitest";
import { canCreateRole } from "./canCreateRole";

describe("canCreateRole", () => {
  it("Owner boleh membuat akun role apa saja, termasuk Owner baru", () => {
    expect(canCreateRole("OWNER", "OWNER")).toBe(true);
    expect(canCreateRole("OWNER", "PETUGAS_LOKET")).toBe(true);
    expect(canCreateRole("OWNER", "KEPALA_GUDANG")).toBe(true);
    expect(canCreateRole("OWNER", "KURIR")).toBe(true);
  });

  it("Kepala Gudang hanya boleh membuat akun Kurir", () => {
    expect(canCreateRole("KEPALA_GUDANG", "KURIR")).toBe(true);
    expect(canCreateRole("KEPALA_GUDANG", "PETUGAS_LOKET")).toBe(false);
    expect(canCreateRole("KEPALA_GUDANG", "OWNER")).toBe(false);
  });

  it("Petugas Loket dan Kurir tidak boleh membuat akun apa pun", () => {
    expect(canCreateRole("PETUGAS_LOKET", "KURIR")).toBe(false);
    expect(canCreateRole("KURIR", "KURIR")).toBe(false);
  });
});
