import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Ambil Data Session
  const sessionData = JSON.parse(localStorage.getItem("edualfalah_session"));

  if (!sessionData || !sessionData.username) {
    window.location.href = "02LoginPage.html";
    return;
  }

  const currentUsername = sessionData.username;

  // 2. CEK DAN BUAT AKUN DI SUPABASE JIKA TABEL KOSONG
  try {
    const { data: userExist, error: userCheckErr } = await supabase
      .from("users")
      .select("username")
      .eq("username", currentUsername)
      .maybeSingle();

    if (userCheckErr) console.error("Error cek user:", userCheckErr);

    // Jika user belum ada di tabel Supabase (karena baru dihapus), masukkan kembali dasar akunnya
    if (!userExist) {
      await supabase.from("users").upsert({
        username: currentUsername,
        is_used: false,
      });
    }
  } catch (err) {
    console.error("Gagal sinkronisasi akun dengan Supabase:", err);
  }

  // 3. DOM Elements
  const onboardingModal = document.getElementById("onboarding-modal");
  const onboardingForm = document.getElementById("onboarding-form");
  const fullNameInput = document.getElementById("full-name-input");
  const classSelect = document.getElementById("class-select");

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

  if (usernameText) usernameText.textContent = `@${currentUsername}`;

  // 4. CEK PENGUNCIAN CARD LATIHAN 01
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

  // 5. CEK KONDISI POP-UP MODAL ONBOARDING
  const isMateriCompleted =
    localStorage.getItem("materi01_completed") === "true";

  if (isMateriCompleted && onboardingModal) {
    onboardingModal.classList.add("hidden");

    const savedName =
      localStorage.getItem("edualfalah_fullname") || currentUsername;
    const savedClass = localStorage.getItem("edualfalah_class") || "4A";

    if (greetingText)
      greetingText.textContent = `Assalamualaikum, ${savedName}`;
    if (classText) classText.textContent = `Kelas: ${savedClass}`;

    renderUserSummary(currentUsername, savedName);
  }

  // 6. Handle Form Submit Onboarding (Mengisi Profil Baru ke Supabase)
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
          console.error("Gagal menyimpan profil ke Supabase:", error);
          alert("Gagal menyimpan profil ke server. Periksa koneksi Anda.");
          return;
        }

        localStorage.setItem("edualfalah_fullname", fullName);
        localStorage.setItem("edualfalah_class", selectedClass);

        if (greetingText)
          greetingText.textContent = `Assalamualaikum, ${fullName}`;
        if (classText) classText.textContent = `Kelas: ${selectedClass}`;

        if (onboardingModal) onboardingModal.classList.add("hidden");
        renderUserSummary(currentUsername, fullName);
      } catch (err) {
        console.error("Error:", err);
        alert("Terjadi kesalahan sistem saat memproses profil.");
      }
    });
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

  // 7. FETCH LEADERBOARD REAL-TIME
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
        modalLeaderboardBody.innerHTML = `<p style="padding: 1rem; text-align: center;">Belum ada data siswa yang tersimpan di server.</p>`;
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
      modalLeaderboardBody.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #f43f5e;">
          <p>Gagal memuat data dari server.</p>
          <small style="color: #94a3b8;">Periksa kebijakan akses (RLS) pada tabel 'users' di Supabase.</small>
        </div>
      `;
    }
  }

  // Event Listeners Modal Leaderboard
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

  if (leaderboardOverlay) {
    leaderboardOverlay.addEventListener("click", (e) => {
      if (e.target === leaderboardOverlay) {
        leaderboardOverlay.classList.add("hidden");
      }
    });
  }
});
