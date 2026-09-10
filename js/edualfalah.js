import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================
  // 1. MANAJEMEN DEVICE ID PERANGKAT
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
  // 2. VALIDASI SESSION & PENGUNCIAN PERANGKAT
  // ==========================================
  const sessionData = JSON.parse(localStorage.getItem("edualfalah_session"));

  if (!sessionData || !sessionData.username) {
    clearLocalSessionExceptDevice();
    window.location.href = "02LoginPage.html";
    return;
  }

  const currentUsername = sessionData.username;

  try {
    // A. Cek apakah device_id ini terikat akun LAIN di Supabase
    const { data: boundUser, error: boundErr } = await supabase
      .from("users")
      .select("username")
      .eq("device_id", deviceId)
      .neq("username", currentUsername)
      .maybeSingle();

    if (boundErr) console.error("Error cek device bound:", boundErr);

    if (boundUser) {
      alert(
        `Perangkat ini sudah terikat dengan akun @${boundUser.username}. Satu perangkat hanya untuk satu akun!`,
      );
      clearLocalSessionExceptDevice();
      window.location.href = "02LoginPage.html";
      return;
    }

    // B. Cek ketersediaan akun saat ini di Supabase
    let { data: currentUserData, error: userErr } = await supabase
      .from("users")
      .select("username, device_id")
      .eq("username", currentUsername)
      .maybeSingle();

    if (userErr) console.error("Error cek user aktif:", userErr);

    if (!currentUserData) {
      alert("Akun tidak ditemukan atau telah dihapus dari server.");
      clearLocalSessionExceptDevice();
      window.location.href = "02LoginPage.html";
      return;
    } else if (!currentUserData.device_id) {
      // Ikatkan device_id jika belum terikat di Supabase
      await supabase
        .from("users")
        .update({ device_id: deviceId })
        .eq("username", currentUsername);
    }
  } catch (err) {
    console.error("Gagal verifikasi penguncian perangkat:", err);
  }

  function clearLocalSessionExceptDevice() {
    const savedDeviceId = localStorage.getItem("edualfalah_device_id");
    localStorage.clear();
    if (savedDeviceId) {
      localStorage.setItem("edualfalah_device_id", savedDeviceId);
    }
  }

  // ==========================================
  // 3. DOM ELEMENTS
  // ==========================================
  const greetingText = document.getElementById("greeting-text");
  const classText = document.getElementById("class-text");
  const usernameText = document.getElementById("username-text");

  const userResultDetail = document.getElementById("user-result-detail");
  const cardLatihan01 = document.getElementById("card-latihan-01");

  const btnLeaderboardTotal = document.getElementById("btn-leaderboard-total");
  const leaderboardOverlay = document.getElementById(
    "leaderboard-modal-overlay",
  );
  const btnCloseModal = document.getElementById("btn-close-modal");
  const modalLeaderboardBody = document.getElementById(
    "modal-leaderboard-body",
  );
  const dashboardGradeSelect = document.getElementById(
    "dashboard-grade-select",
  );

  if (usernameText) usernameText.textContent = `@${currentUsername}`;

  // ==========================================
  // 4. SYNC & TAMPILKAN PROFIL USER
  // ==========================================
  let userFullName =
    localStorage.getItem("edualfalah_fullname") || currentUsername;
  let userClass = localStorage.getItem("edualfalah_class") || "-";

  try {
    const { data: profileData } = await supabase
      .from("users")
      .select("full_name, class_name")
      .eq("username", currentUsername)
      .maybeSingle();

    if (profileData) {
      if (profileData.full_name) {
        userFullName = profileData.full_name;
        localStorage.setItem("edualfalah_fullname", userFullName);
      }
      if (profileData.class_name) {
        userClass = profileData.class_name;
        localStorage.setItem("edualfalah_class", userClass);
      }
    }
  } catch (err) {
    console.error("Gagal ambil profil Supabase:", err);
  }

  if (greetingText)
    greetingText.textContent = `Assalamualaikum, ${userFullName}`;
  if (classText) classText.textContent = `Kelas: ${userClass}`;

  renderUserSummary(currentUsername, userFullName);

  // ==========================================
  // 5. CEK PENGUNCIAN CARD LATIHAN 01
  // ==========================================
  const isLatihanLocked =
    localStorage.getItem(`latihan01_locked_${currentUsername}`) === "true";

  if (isLatihanLocked && cardLatihan01) {
    cardLatihan01.classList.add("locked");
    cardLatihan01.removeAttribute("href");
    cardLatihan01.setAttribute("aria-disabled", "true");
    cardLatihan01.setAttribute("title", "Sudah Dikerjakan (Terkunci)");

    cardLatihan01.innerHTML = `
      <div class="stamp-badge">SELESAI</div>
      <svg class="locked-icon" viewBox="0 0 24 24">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
      <span>latihan01</span>
    `;
  }

  function renderUserSummary(username, fullName) {
    const savedScore =
      parseInt(localStorage.getItem(`latihan01_score_${username}`), 10) || 0;

    if (userResultDetail) {
      userResultDetail.innerHTML = `
        <p class="result-text">
          Ananda <strong>${fullName}</strong> (<code>@${username}</code>) telah menyelesaikan <strong>latihan01</strong> dengan memperoleh nilai <strong>${savedScore}</strong>.
        </p>
      `;
    }
  }

  // ==========================================
  // 6. FETCH & RENDER LEADERBOARD REAL-TIME
  // ==========================================
  let cachedLeaderboardData = [];

  async function loadRealLeaderboardData() {
    if (!modalLeaderboardBody) return;
    modalLeaderboardBody.innerHTML = `<p class="loading-text">Memuat data peringkat...</p>`;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username, class_name, grade, score_latihan01")
        .order("score_latihan01", { ascending: false });

      if (error) throw error;

      cachedLeaderboardData = data || [];
      renderFilteredLeaderboard();
    } catch (err) {
      console.error("Gagal memuat leaderboard:", err);
      modalLeaderboardBody.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #f43f5e;">
          <p>Gagal memuat data dari server.</p>
          <small style="color: #94a3b8;">Periksa koneksi internet Anda.</small>
        </div>
      `;
    }
  }

  function renderFilteredLeaderboard() {
    if (!modalLeaderboardBody) return;

    const selectedGrade = dashboardGradeSelect
      ? dashboardGradeSelect.value
      : "all";

    const filtered = cachedLeaderboardData.filter((user) => {
      if (selectedGrade === "all") return true;
      const gradeNum = parseInt(selectedGrade, 10);
      if (user.grade === gradeNum) return true;
      if (user.class_name && user.class_name.startsWith(selectedGrade))
        return true;
      return false;
    });

    if (filtered.length === 0) {
      modalLeaderboardBody.innerHTML = `
        <p style="padding: 1rem; text-align: center; color: #94a3b8;">
          Belum ada data nilai untuk kelas ini.
        </p>
      `;
      return;
    }

    let tableHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Peringkat</th>
            <th>Username</th>
            <th>Skor</th>
          </tr>
        </thead>
        <tbody>
    `;

    let currentRank = 0;
    let previousScore = null;

    filtered.forEach((user) => {
      const score = user.score_latihan01 ?? 0;

      if (score !== previousScore) {
        currentRank++;
        previousScore = score;
      }

      let rankBadge = `<strong>${currentRank}</strong>`;
      if (currentRank === 1) rankBadge = "🥇 1";
      else if (currentRank === 2) rankBadge = "🥈 2";
      else if (currentRank === 3) rankBadge = "🥉 3";

      tableHTML += `
        <tr>
          <td>${rankBadge}</td>
          <td>@${user.username}</td>
          <td><strong>${score}</strong></td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    modalLeaderboardBody.innerHTML = tableHTML;
  }

  // Event Listeners Leaderboard Modal
  if (btnLeaderboardTotal) {
    btnLeaderboardTotal.addEventListener("click", () => {
      if (leaderboardOverlay) {
        leaderboardOverlay.classList.remove("hidden");
        loadRealLeaderboardData();
      }
    });
  }

  if (dashboardGradeSelect) {
    dashboardGradeSelect.addEventListener("change", () => {
      renderFilteredLeaderboard();
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      if (leaderboardOverlay) leaderboardOverlay.classList.add("hidden");
    });
  }

  if (leaderboardOverlay) {
    leaderboardOverlay.addEventListener("click", (e) => {
      if (e.target === leaderboardOverlay) {
        leaderboardOverlay.classList.add("hidden");
      }
    });
  }
});
