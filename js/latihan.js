import { DATA_SOAL } from "./soal-data.js";
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Ambil Sesi User
  const sessionData =
    JSON.parse(localStorage.getItem("edualfalah_session")) || {};
  const currentUsername = sessionData.username || "edualfalah_user";

  // Cek Status Terkunci dari Supabase & Local Storage
  try {
    const { data: userDb } = await supabase
      .from("users")
      .select("score_latihan01")
      .eq("username", currentUsername)
      .maybeSingle();

    const dbScore = userDb ? userDb.score_latihan01 : null;
    const localLocked =
      localStorage.getItem(`latihan01_locked_${currentUsername}`) === "true";

    // Jika sudah pernah ada nilai di Supabase atau Local Storage sudah terkunci
    if ((dbScore !== null && dbScore !== undefined) || localLocked) {
      alert("Anda sudah menyelesaikan latihan ini. Latihan telah terkunci.");
      window.location.href = "05edualfalah2.html";
      return;
    }
  } catch (err) {
    console.error("Gagal memeriksa status pengerjaan:", err);
  }

  // 2. DOM Elements
  const questionsWrapper = document.getElementById("questions-wrapper");
  const quizForm = document.getElementById("quiz-form");
  const timerDisplay = document.getElementById("timer-display");
  const totalQuestionsText = document.getElementById("total-questions-text");

  if (totalQuestionsText) {
    totalQuestionsText.textContent = `Total Soal: ${DATA_SOAL.length} Butir`;
  }

  // 3. Render Soal secara Dinamis
  function renderQuestions() {
    if (!questionsWrapper) return;
    questionsWrapper.innerHTML = "";
    const optionLabels = ["A", "B", "C", "D"];

    DATA_SOAL.forEach((soal, index) => {
      const card = document.createElement("article");
      card.className = "soal-card";

      let optionsHTML = "";
      soal.options.forEach((opt, optIndex) => {
        optionsHTML += `
          <label class="option-label">
            <input 
              type="radio" 
              name="question_${soal.id}" 
              value="${optIndex}" 
              required
            />
            <span class="option-text"><strong>${optionLabels[optIndex]}.</strong> ${opt}</span>
          </label>
        `;
      });

      card.innerHTML = `
        <div class="soal-header">
          <span class="soal-number">Soal Nomor ${index + 1}</span>
        </div>
        <div class="soal-image-container">
          <img src="${soal.image}" alt="Gambar Soal ${index + 1}" loading="lazy" />
        </div>
        <p class="soal-question">${soal.question}</p>
        <div class="options-group">
          ${optionsHTML}
        </div>
      `;

      questionsWrapper.appendChild(card);
    });
  }

  renderQuestions();

  // 4. Timer Countdown Safe Guard
  let timeInSeconds = 15 * 60; // 15 Menit
  let timerInterval = null;

  if (timerDisplay) {
    timerInterval = setInterval(() => {
      timeInSeconds--;

      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = timeInSeconds % 60;
      timerDisplay.textContent = `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      if (timeInSeconds <= 0) {
        clearInterval(timerInterval);
        alert(
          "Waktu latihan habis! Sistem akan mengirim jawaban Anda secara otomatis.",
        );
        submitQuiz();
      }
    }, 1000);
  }

  // Hentikan timer jika user berpindah halaman sebelum submit
  window.addEventListener("beforeunload", () => {
    if (timerInterval) clearInterval(timerInterval);
  });

  // 5. Handle Submit & Kalkulasi Skor
  if (quizForm) {
    quizForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (confirm("Apakah Anda yakin ingin menyelesaikan latihan ini?")) {
        if (timerInterval) clearInterval(timerInterval);
        submitQuiz();
      }
    });
  }

  // 6. Eksekusi Submit Quiz
  async function submitQuiz() {
    let correctCount = 0;
    const totalSoal = DATA_SOAL.length;

    DATA_SOAL.forEach((soal) => {
      const selectedOption = document.querySelector(
        `input[name="question_${soal.id}"]:checked`,
      );
      if (
        selectedOption &&
        parseInt(selectedOption.value, 10) === soal.correctAnswer
      ) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / totalSoal) * 100);

    // 1. Simpan skor & status latihan terkunci ke Local Storage
    localStorage.setItem(`latihan01_locked_${currentUsername}`, "true");
    localStorage.setItem(`latihan01_score_${currentUsername}`, finalScore);
    localStorage.setItem("materi01_completed", "true");

    // 2. Simpan ke Supabase
    try {
      await supabase
        .from("users")
        .update({ score_latihan01: finalScore })
        .eq("username", currentUsername);
    } catch (err) {
      console.error("Gagal update nilai ke server:", err);
    }

    alert(
      `Latihan selesai! Anda menjawab benar ${correctCount} dari ${totalSoal} soal.\nSkor Anda: ${finalScore}`,
    );

    // Direct ke halaman utama edualfalah
    window.location.href = "05edualfalah2.html";
  }
});
