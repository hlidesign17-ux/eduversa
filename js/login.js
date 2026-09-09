import { MOCK_USERS } from "./mock-users.js";
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm =
    document.getElementById("login-form") ||
    document.querySelector(".auth-form");
  const usernameInput = document.getElementById("username-03");
  const passwordInput = document.getElementById("password-03");

  if (!loginForm) return;

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

      // C. CEK DATA EKSISTING DI SUPABASE
      const { data: existingUser, error: userErr } = await supabase
        .from("users")
        .select("username, full_name, class_name, grade, device_id")
        .eq("username", inputUsername)
        .maybeSingle();

      if (userErr) console.error("Supabase User Check Error:", userErr);

      const calculatedGrade =
        parseInt(foundUser.grade, 10) || parseInt(foundUser.className, 10) || 4;

      // D. MENYUSUN DATA USER (Selalu sertakan full_name & class_name agar tidak NULL saat UPSERT)
      const userDataToSave = {
        username: inputUsername,
        device_id: deviceId,
        is_used: true,
        full_name:
          existingUser &&
          existingUser.full_name &&
          existingUser.full_name !== inputUsername
            ? existingUser.full_name
            : foundUser.fullname || "",
        class_name:
          existingUser && existingUser.class_name
            ? existingUser.class_name
            : foundUser.className || "",
        grade:
          existingUser && existingUser.grade
            ? existingUser.grade
            : calculatedGrade,
      };

      // E. EKSEKUSI UPSERT KE SUPABASE DENGAN AWAIT
      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(userDataToSave, { onConflict: "username" });

      if (upsertErr) {
        console.error("Gagal simpan user ke Supabase:", upsertErr);
        alert("Gagal melakukan autentikasi ke server. Coba lagi.");
        return;
      }

      // F. BERSIHKAN LOCALSTORAGE LAMA & SIMPAN SESI BARU
      const currentDeviceId = localStorage.getItem("edualfalah_device_id");
      localStorage.clear();
      localStorage.setItem("edualfalah_device_id", currentDeviceId);
      localStorage.setItem("edualfalah_device_owner", inputUsername);

      localStorage.setItem(
        "edualfalah_session",
        JSON.stringify({
          username: foundUser.username,
          className: userDataToSave.class_name,
          grade: userDataToSave.grade,
          isLoggedIn: true,
        }),
      );

      // G. REDIRECT DENGAN JEDA SINGKAT
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
