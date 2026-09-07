import { MOCK_LEADERBOARD } from "./mock-data.js";
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

  const rankSummaryText = document.getElementById("rank-summary-text");
  const userResultDetail = document.getElementById("user-result-detail");

  // DOM Element untuk Card Latihan 01
  const cardLatihan01 = document.getElementById("card-latihan-01");

  usernameText.textContent = `@${currentUsername}`;

  // 3. CEK PENGUNCIAN CARD LATIHAN 01 (Ditaruh di sini)
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

  // 4. CEK KONDISI POP-UP MODAL
  if (isMateriCompleted) {
    // Sembunyikan Pop-Up Modal
    onboardingModal.classList.add("hidden");

    // Ambil data profil dari penyimpanan lokal
    const savedName =
      localStorage.getItem("edualfalah_fullname") || currentUsername;
    const savedClass = localStorage.getItem("edualfalah_class") || "4A";

    greetingText.textContent = `Assalamualaikum, ${savedName}`;
    classText.textContent = `Kelas: ${savedClass}`;

    // Tampilkan Peringkat & Hasil Latihan Langsung
    processLeaderboard(currentUsername, savedClass, savedName);
  }

  // 5. Handle Form Submit dengan Penguncian Akun di Supabase
  onboardingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const selectedClass = classSelect.value;

    if (!fullName || !selectedClass) return;

    try {
      // Upsert data ke Supabase agar is_used berubah jadi true
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

      // Simpan data profil ke storage lokal
      localStorage.setItem("edualfalah_fullname", fullName);
      localStorage.setItem("edualfalah_class", selectedClass);

      greetingText.textContent = `Assalamualaikum, ${fullName}`;
      classText.textContent = `Kelas: ${selectedClass}`;

      onboardingModal.classList.add("hidden");
      processLeaderboard(currentUsername, selectedClass, fullName);
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan sistem saat memproses profil.");
    }
  });

  // 6. Logic Leaderboard Kalimat Naratif
  function processLeaderboard(username, rawClass, fullName) {
    const gradeNumber = parseInt(rawClass.charAt(0), 10);
    const filteredList = MOCK_LEADERBOARD.filter(
      (item) => item.grade === gradeNumber,
    );

    // Ambil nilai dari storage jika ada, jika belum ada pakai default 0
    const savedScore =
      parseInt(localStorage.getItem(`latihan01_score_${username}`), 10) || 0;

    const currentUserData = {
      username: username,
      displayName: fullName,
      score: savedScore,
      isCurrentUser: true,
    };

    const fullList = [...filteredList, currentUserData];
    fullList.sort((a, b) => b.score - a.score);

    const userRank = fullList.findIndex((item) => item.isCurrentUser) + 1;
    const totalStudents = fullList.length;

    rankSummaryText.textContent = `ananda peringkat ke ${userRank} dari ${totalStudents} orang yang telah menyelesaikan`;

    userResultDetail.innerHTML = `
      <p class="result-text">
        Ananda <strong>${fullName}</strong> (<code>@${username}</code>) telah menyelesaikan <strong>latihan01</strong> dengan memperoleh nilai <strong>${currentUserData.score}</strong>.
      </p>
    `;
  }
});
