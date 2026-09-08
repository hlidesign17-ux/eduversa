import { MOCK_USERS } from "./mock-users.js";
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm =
    document.getElementById("login-form") ||
    document.querySelector(".auth-form");
  const usernameInput = document.getElementById("username-03");
  const passwordInput = document.getElementById("password-03");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputUsername = usernameInput.value.trim().toLowerCase();
    const inputPassword = passwordInput.value.trim();

    // 1. Validasi Kredensial (MOCK_USERS)
    const foundUser = MOCK_USERS.find(
      (user) =>
        user.username === inputUsername && user.password === inputPassword,
    );

    if (!foundUser) {
      alert("Username atau Password salah! Periksa kembali data login Anda.");
      return;
    }

    try {
      // 2. CEK STATUS AKUN DI SUPABASE
      const { data, error } = await supabase
        .from("users")
        .select("full_name, is_used")
        .eq("username", inputUsername)
        .maybeSingle();

      if (error) {
        console.error("Supabase Error:", error);
      }

      // SINKRONISASI: Jika data akun di Supabase TIDAK ADA (karena tabel dihapus/di-reset),
      // Bersihkan penguncian perangkat lokal agar akun bisa mendaftar ulang secara bersih.
      if (!data) {
        const currentOwner = localStorage.getItem("edualfalah_device_owner");
        if (currentOwner === inputUsername) {
          localStorage.removeItem("edualfalah_device_owner");
          localStorage.removeItem("edualfalah_session");
          localStorage.removeItem("edualfalah_fullname");
          localStorage.removeItem("edualfalah_class");
          localStorage.removeItem("materi01_completed");
          localStorage.removeItem(`latihan01_locked_${inputUsername}`);
        }
      }

      // 3. CEK DEVICE LOCK (Pencegahan Login Akun Lain dari Perangkat yang Sama)
      const activeDeviceUser = localStorage.getItem("edualfalah_device_owner");

      if (activeDeviceUser && activeDeviceUser !== inputUsername) {
        alert(
          `AKSES DITOLAK!\nPerangkat ini sudah terdaftar untuk pengguna @${activeDeviceUser}.\nAnda tidak diizinkan menggunakan username lain pada perangkat yang sama.`,
        );
        return;
      }

      // 4. CEK APAKAH AKUN SUDAH DIPAKAI DI PERANGKAT LAIN
      if (data && data.is_used) {
        if (activeDeviceUser !== inputUsername) {
          alert(
            `Maaf, akun @${inputUsername} sudah terpakai di perangkat/sesi lain.`,
          );
          return;
        }
      }

      // 5. EXTRACT GRADE & UPSERT KE SUPABASE
      // Ambil angka dari grade atau className (misal "6C" -> 6)
      const calculatedGrade =
        parseInt(foundUser.grade, 10) || parseInt(foundUser.className, 10) || 4;

      await supabase.from("users").upsert(
        {
          username: inputUsername,
          full_name: foundUser.fullname || inputUsername,
          class_name: foundUser.className || `${calculatedGrade}A`,
          grade: calculatedGrade,
          is_used: true,
        },
        { onConflict: "username" },
      );

      // 6. DAFTARKAN PERANGKAT KEPADA USER INI (Device Binding)
      localStorage.setItem("edualfalah_device_owner", inputUsername);

      // 7. Simpan Session Login Baru
      localStorage.setItem(
        "edualfalah_session",
        JSON.stringify({
          username: foundUser.username,
          className: foundUser.className,
          grade: calculatedGrade,
          isLoggedIn: true,
        }),
      );

      // Redirect ke Halaman Utama
      window.location.href = "05edualfalah2.html";
    } catch (err) {
      console.error("Connection error:", err);
      alert("Gagal terhubung ke database. Periksa koneksi internet Anda.");
    }
  });
});
