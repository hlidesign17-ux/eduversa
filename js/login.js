import { MOCK_USERS } from "./mock-users.js";
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm =
    document.getElementById("login-form") ||
    document.querySelector(".auth-form");
  const usernameInput = document.getElementById("username-03");
  const passwordInput = document.getElementById("password-03");

  if (!loginForm) return;

  // 1. Ambil atau Buat Device ID Unik di Perangkat Ini
  let deviceId = localStorage.getItem("edualfalah_device_id");
  if (!deviceId) {
    deviceId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "dev_" +
          Math.random().toString(36).substring(2, 15) +
          Date.now().toString(36);
    localStorage.setItem("edualfalah_device_id", deviceId);
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputUsername = usernameInput.value.trim().toLowerCase();
    const inputPassword = passwordInput.value.trim();

    // 2. Validasi Kredensial Lokal (MOCK_USERS)
    const foundUser = MOCK_USERS.find(
      (user) =>
        user.username === inputUsername && user.password === inputPassword,
    );

    if (!foundUser) {
      alert("Username atau Password salah! Periksa kembali data login Anda.");
      return;
    }

    try {
      // 3. CEK PENGUNCIAN PERANGKAT DARI SUPABASE
      // Cek apakah ada AKUN LAIN di Supabase yang sedang mengunci device_id perangkat ini
      const { data: boundUser, error: boundErr } = await supabase
        .from("users")
        .select("username")
        .eq("device_id", deviceId)
        .neq("username", inputUsername)
        .maybeSingle();

      if (boundErr) console.error("Supabase Device Check Error:", boundErr);

      // Jika akun lain MASIH ADA di Supabase dan memegang device_id ini -> BLOKIR LOGIN
      if (boundUser) {
        alert(
          `AKSES DITOLAK!\nPerangkat ini sudah terdaftar untuk pengguna @${boundUser.username}.\nAnda tidak diizinkan menggunakan username lain pada perangkat yang sama.`,
        );
        return;
      }

      // 4. CEK AKUN SAAT INI DI SUPABASE
      const { data: existingUser, error: userErr } = await supabase
        .from("users")
        .select("username, device_id, is_used")
        .eq("username", inputUsername)
        .maybeSingle();

      if (userErr) console.error("Supabase User Check Error:", userErr);

      // 5. PENYESUAIAN METADATA & CALCULATED GRADE
      const calculatedGrade =
        parseInt(foundUser.grade, 10) || parseInt(foundUser.className, 10) || 4;

      // 6. UPSERT AKUN KE SUPABASE (Ikat device_id ke akun ini)
      await supabase.from("users").upsert(
        {
          username: inputUsername,
          full_name: foundUser.fullname || inputUsername,
          class_name: foundUser.className || `${calculatedGrade}A`,
          grade: calculatedGrade,
          device_id: deviceId, // Merekam ID Perangkat di Supabase
          is_used: true,
        },
        { onConflict: "username" },
      );

      // 7. BERSIHKAN LOCALSTORAGE LAMA & SIMPAN SESI BARU
      // Simpan deviceId agar tidak hilang saat localStorage dibersihkan
      const currentDeviceId = localStorage.getItem("edualfalah_device_id");
      localStorage.clear();
      localStorage.setItem("edualfalah_device_id", currentDeviceId);
      localStorage.setItem("edualfalah_device_owner", inputUsername);

      // Simpan Sesi
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
  // Toggle Mata Password
  const toggleBtn = document.getElementById("toggle-password-03");
  if (toggleBtn && passwordInput) {
    const eyeOpen = toggleBtn.querySelector(".eye-open");
    const eyeClosed = toggleBtn.querySelector(".eye-closed");

    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");

      eyeOpen.classList.toggle("hidden", isPassword);
      eyeClosed.classList.toggle("hidden", !isPassword);
    });
  }
});
