import { MOCK_USERS } from "./mock-users.js";
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm =
    document.getElementById("login-form") ||
    document.querySelector(".auth-form");
  const usernameInput = document.getElementById("username-03");
  const passwordInput = document.getElementById("password-03");
  const fullnameInput = document.getElementById("fullname-03");
  const classSelect = document.getElementById("class-select-03");

  if (!loginForm) return;

  // Auto-fill Nama Lengkap & Kelas dari Supabase/Cache ketika username diisi
  if (usernameInput) {
    usernameInput.addEventListener("blur", async () => {
      const inputUsername = usernameInput.value.trim().toLowerCase();
      if (!inputUsername) return;

      try {
        const { data: userDb } = await supabase
          .from("users")
          .select("full_name, class_name")
          .eq("username", inputUsername)
          .maybeSingle();

        if (userDb) {
          if (fullnameInput && userDb.full_name)
            fullnameInput.value = userDb.full_name;
          if (classSelect && userDb.class_name)
            classSelect.value = userDb.class_name;
        }
      } catch (err) {
        console.error("Gagal auto-fill data user:", err);
      }
    });
  }

  // ==========================================
  // 1. MANAJEMEN DEVICE ID UNIK
  // ==========================================
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

  // ==========================================
  // 2. EVENT LISTENER SUBMIT LOGIN
  // ==========================================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputUsername = usernameInput.value.trim().toLowerCase();
    const inputPassword = passwordInput.value.trim();
    const inputFullName = fullnameInput ? fullnameInput.value.trim() : "";
    const inputClass = classSelect ? classSelect.value : "";

    if (!inputFullName || !inputClass) {
      alert("Harap lengkapi Nama Lengkap dan Kelas!");
      return;
    }

    // A. Validasi Kredensial Lokal (MOCK_USERS)
    const foundUser = MOCK_USERS.find(
      (user) =>
        user.username === inputUsername && user.password === inputPassword,
    );

    if (!foundUser) {
      alert("Username atau Password salah! Periksa kembali data login Anda.");
      return;
    }

    try {
      // B. CEK PENGUNCIAN PERANGKAT DARI SUPABASE
      const { data: boundUser, error: boundErr } = await supabase
        .from("users")
        .select("username")
        .eq("device_id", deviceId)
        .neq("username", inputUsername)
        .maybeSingle();

      if (boundErr) console.error("Supabase Device Check Error:", boundErr);

      if (boundUser) {
        alert(
          `AKSES DITOLAK!\nPerangkat ini sudah terdaftar untuk pengguna @${boundUser.username}.\nAnda tidak diizinkan menggunakan username lain pada perangkat yang sama.`,
        );
        return;
      }

      const calculatedGrade = parseInt(inputClass, 10) || 4;

      // C. CEK EXISTENSI AKUN DI DATABASE SUPABASE
      const { data: existingUser } = await supabase
        .from("users")
        .select("username")
        .eq("username", inputUsername)
        .maybeSingle();

      if (existingUser) {
        // D1. JIKA AKUN SUDAH ADA -> UPDATE PROFIL SAJA (TANPA MENYENTUH/MERESET SKOR LATIHAN)
        const { error: updateErr } = await supabase
          .from("users")
          .update({
            device_id: deviceId,
            is_used: true,
            full_name: inputFullName,
            class_name: inputClass,
            grade: calculatedGrade,
          })
          .eq("username", inputUsername);

        if (updateErr) {
          console.error("Gagal update profil user ke Supabase:", updateErr);
          alert("Gagal melakukan autentikasi ke server. Coba lagi.");
          return;
        }
      } else {
        // D2. JIKA AKUN BARU -> INSERT AKUN BARU (MENGGUNAKAN DEFAULT NULL PADA SCORE)
        const { error: insertErr } = await supabase.from("users").insert({
          username: inputUsername,
          device_id: deviceId,
          is_used: true,
          full_name: inputFullName,
          class_name: inputClass,
          grade: calculatedGrade,
        });

        if (insertErr) {
          console.error("Gagal membuat user baru di Supabase:", insertErr);
          alert("Gagal melakukan registrasi akun baru ke server. Coba lagi.");
          return;
        }
      }

      // E. BERSIHKAN SESI LAMA & SIMPAN SESI BARU
      localStorage.removeItem("edualfalah_session");

      localStorage.setItem("edualfalah_device_owner", inputUsername);
      localStorage.setItem("edualfalah_fullname", inputFullName);
      localStorage.setItem("edualfalah_class", inputClass);

      localStorage.setItem(
        "edualfalah_session",
        JSON.stringify({
          username: foundUser.username,
          fullName: inputFullName,
          className: inputClass,
          grade: calculatedGrade,
          isLoggedIn: true,
        }),
      );

      // F. REDIRECT DENGAN JEDA SINGKAT
      setTimeout(() => {
        window.location.href = "05edualfalah2.html";
      }, 100);
    } catch (err) {
      console.error("Connection error:", err);
      alert("Gagal terhubung ke database. Periksa koneksi internet Anda.");
    }
  });

  // ==========================================
  // 3. TOGGLE MATA PASSWORD
  // ==========================================
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
