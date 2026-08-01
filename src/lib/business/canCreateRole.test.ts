import { describe, it, expect } from "vitest";
import { canCreateRole } from "./canCreateRole";

describe("canCreateRole", () => {
  it("Owner boleh membuat akun role apa saja, termasuk Admin Pusat dan Owner baru", () => {
    expect(canCreateRole("OWNER", "ADMIN_PUSAT")).toBe(true);
    expect(canCreateRole("OWNER", "OWNER")).toBe(true);
    expect(canCreateRole("OWNER", "KURIR")).toBe(true);
  });

  it("Admin Pusat TIDAK boleh membuat sesama Admin Pusat atau Owner baru (cegah privilege escalation)", () => {
    expect(canCreateRole("ADMIN_PUSAT", "ADMIN_PUSAT")).toBe(false);
    expect(canCreateRole("ADMIN_PUSAT", "OWNER")).toBe(false);
  });

  it("Admin Pusat boleh membuat Petugas Loket, Kepala Gudang, dan Kurir", () => {
    expect(canCreateRole("ADMIN_PUSAT", "PETUGAS_LOKET")).toBe(true);
    expect(canCreateRole("ADMIN_PUSAT", "KEPALA_GUDANG")).toBe(true);
    expect(canCreateRole("ADMIN_PUSAT", "KURIR")).toBe(true);
  });

  it("Kepala Gudang hanya boleh membuat akun Kurir", () => {
    expect(canCreateRole("KEPALA_GUDANG", "KURIR")).toBe(true);
    expect(canCreateRole("KEPALA_GUDANG", "PETUGAS_LOKET")).toBe(false);
    expect(canCreateRole("KEPALA_GUDANG", "ADMIN_PUSAT")).toBe(false);
    expect(canCreateRole("KEPALA_GUDANG", "OWNER")).toBe(false);
  });

  it("Petugas Loket dan Kurir tidak boleh membuat akun apa pun", () => {
    expect(canCreateRole("PETUGAS_LOKET", "KURIR")).toBe(false);
    expect(canCreateRole("KURIR", "KURIR")).toBe(false);
  });
});
