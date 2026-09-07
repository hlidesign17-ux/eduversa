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

    // 1. CEK DEVICE LOCK (Pencegahan Login Akun Lain dari Perangkat yang Sama)
    const activeDeviceUser = localStorage.getItem("edualfalah_device_owner");

    if (activeDeviceUser && activeDeviceUser !== inputUsername) {
      alert(
        `AKSES DITOLAK!\nPerangkat ini sudah terdaftar untuk pengguna @${activeDeviceUser}.\nAnda tidak diizinkan menggunakan username lain pada perangkat yang sama.`,
      );
      return;
    }

    // 2. Validasi Kredensial (MOCK_USERS)
    const foundUser = MOCK_USERS.find(
      (user) =>
        user.username === inputUsername && user.password === inputPassword,
    );

    if (!foundUser) {
      alert("Username atau Password salah! Periksa kembali data login Anda.");
      return;
    }

    try {
      // 3. Cek Status Penggunaan Akun di Supabase
      const { data, error } = await supabase
        .from("users")
        .select("full_name, is_used")
        .eq("username", inputUsername)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase Error:", error);
      }

      if (data && data.is_used) {
        // Jika akun terpakai tapi device ini adalah pemilik sahnya, izinkan masuk kembali
        if (activeDeviceUser !== inputUsername) {
          alert(
            `Maaf, akun @${inputUsername} sudah terpakai di perangkat/sesi lain.`,
          );
          return;
        }
      }

      // 4. DAFTARKAN PERANGKAT KEPADA USER INI (Device Binding)
      localStorage.setItem("edualfalah_device_owner", inputUsername);

      // 5. Simpan Session Login
      localStorage.setItem(
        "edualfalah_session",
        JSON.stringify({
          username: foundUser.username,
          className: foundUser.className,
          grade: foundUser.grade,
          isLoggedIn: true,
        }),
      );

      // Redirect ke halaman edualfalah
      window.location.href = "05edualfalah2.html";
    } catch (err) {
      console.error("Connection error:", err);
      alert("Gagal terhubung ke database. Periksa koneksi internet Anda.");
    }
  });
});
