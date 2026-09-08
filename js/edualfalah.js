import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil Data Session & Status Penyelesaian Materi
  const sessionData = JSON.parse(
    localStorage.getItem("edualfalah_session"),
  ) || { username: "edualfalah_user" };
  const isMateriCompleted =
    localStorage.getItem("materi01_completed") === "true";
  const currentUsername = sessionData.username;

  // 2. DOM Elements
  const onboardingModal = document.getElementById("onboarding-modal");
  const onboardingForm = document.getElementById("onboarding-form");
  const fullNameInput = document.getElementById("full-name-input");
  const classSelect = document.getElementById("class-select");

  const greetingText = document.getElementById("greeting-text");
  const classText = document.getElementById("class-text");
  const usernameText = document.getElementById("username-text");

  const userResultDetail = document.getElementById("user-result-detail");
  const cardLatihan01 = document.getElementById("card-latihan-01");

  // DOM Elements Modal Leaderboard Total
  const btnLeaderboardTotal = document.getElementById("btn-leaderboard-total");
  const leaderboardOverlay = document.getElementById(
    "leaderboard-modal-overlay",
  );
  const btnCloseModal = document.getElementById("btn-close-modal");
  const modalLeaderboardBody = document.getElementById(
    "modal-leaderboard-body",
  );

  usernameText.textContent = `@${currentUsername}`;

  // 3. CEK PENGUNCIAN CARD LATIHAN 01
  const isLatihanLocked =
    localStorage.getItem(`latihan01_locked_${currentUsername}`) === "true";

  if (isLatihanLocked && cardLatihan01) {
    cardLatihan01.classList.add("locked");
    cardLatihan01.removeAttribute("href");
    cardLatihan01.setAttribute("aria-disabled", "true");
    cardLatihan01.setAttribute("title", "Sudah Dikerjakan (Terkunci)");
    cardLatihan01.innerHTML = `
      <svg class="locked-icon" viewBox="0 0 24 24">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
      <span>latihan01</span>
    `;
  }

  // 4. CEK KONDISI POP-UP MODAL ONBOARDING
  if (isMateriCompleted && onboardingModal) {
    onboardingModal.classList.add("hidden");

    const savedName =
      localStorage.getItem("edualfalah_fullname") || currentUsername;
    const savedClass = localStorage.getItem("edualfalah_class") || "4A";

    greetingText.textContent = `Assalamualaikum, ${savedName}`;
    classText.textContent = `Kelas: ${savedClass}`;

    renderUserSummary(currentUsername, savedName);
  }

  // 5. Handle Form Submit Onboarding (Kunci Profil ke Supabase)
  if (onboardingForm) {
    onboardingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = fullNameInput.value.trim();
      const selectedClass = classSelect.value;

      if (!fullName || !selectedClass) return;

      try {
        const { error } = await supabase.from("users").upsert({
          username: currentUsername,
          full_name: fullName,
          class_name: selectedClass,
          is_used: true,
        });

        if (error) {
          console.error("Gagal mengunci akun di Supabase:", error);
          alert("Gagal menyimpan profil ke server. Periksa koneksi Anda.");
          return;
        }

        localStorage.setItem("edualfalah_fullname", fullName);
        localStorage.setItem("edualfalah_class", selectedClass);

        greetingText.textContent = `Assalamualaikum, ${fullName}`;
        classText.textContent = `Kelas: ${selectedClass}`;

        if (onboardingModal) onboardingModal.classList.add("hidden");
        renderUserSummary(currentUsername, fullName);
      } catch (err) {
        console.error("Error:", err);
        alert("Terjadi kesalahan sistem saat memproses profil.");
      }
    });
  }

  // 6. Ringkasan Nilai Latihan User Saja (Tanpa Narasi Peringkat)
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

  // 7. POP-UP LEADERBOARD TOTAL (Data Real-time Supabase)
  async function loadRealLeaderboardData() {
    if (!modalLeaderboardBody) return;
    modalLeaderboardBody.innerHTML = `<p class="loading-text">Memuat data peringkat...</p>`;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, class_name, score_latihan01")
        .not("full_name", "is", null)
        .order("score_latihan01", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        modalLeaderboardBody.innerHTML = `<p>Belum ada data nilai siswa.</p>`;
        return;
      }

      let tableHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Peringkat</th>
              <th>Nama Lengkap</th>
              <th>Kelas</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.forEach((user, index) => {
        tableHTML += `
          <tr>
            <td><strong>#${index + 1}</strong></td>
            <td>${user.full_name || "-"}</td>
            <td>${user.class_name || "-"}</td>
            <td><strong>${user.score_latihan01 ?? 0}</strong></td>
          </tr>
        `;
      });

      tableHTML += `</tbody></table>`;
      modalLeaderboardBody.innerHTML = tableHTML;
    } catch (err) {
      console.error("Gagal memuat leaderboard:", err);
      modalLeaderboardBody.innerHTML = `<p class="error-text">Gagal mengambil data peringkat.</p>`;
    }
  }

  // Event Handler Modal Leaderboard
  if (btnLeaderboardTotal) {
    btnLeaderboardTotal.addEventListener("click", () => {
      if (leaderboardOverlay) {
        leaderboardOverlay.classList.remove("hidden");
        loadRealLeaderboardData();
      }
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      if (leaderboardOverlay) leaderboardOverlay.classList.add("hidden");
    });
  }

  // Tutup Pop-Up Jika User Menekan Layer Dasar (Overlay 20% Luar Modal)
  if (leaderboardOverlay) {
    leaderboardOverlay.addEventListener("click", (e) => {
      if (e.target === leaderboardOverlay) {
        leaderboardOverlay.classList.add("hidden");
      }
    });
  }
});
