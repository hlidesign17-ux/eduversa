// js/leaderboard-total.js
import { supabase } from "./supabase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const gradeSelect = document.getElementById("grade-select");
  const leaderboardBody = document.getElementById("total-leaderboard-body");

  if (!gradeSelect || !leaderboardBody) return;

  gradeSelect.addEventListener("change", async (e) => {
    const selectedGrade = parseInt(e.target.value, 10);
    if (!selectedGrade) return;

    await renderLeaderboardByGrade(selectedGrade);
  });

  async function renderLeaderboardByGrade(grade) {
    // 1. Tampilkan Indikator Loading
    leaderboardBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state">Memuat data peringkat kelas ${grade}...</td>
      </tr>
    `;

    try {
      // 2. Ambil Data Real-time dari Supabase Berdasarkan Grade
      const { data, error } = await supabase
        .from("users")
        .select("username, score_latihan01, grade")
        .eq("grade", grade)
        .order("score_latihan01", { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        leaderboardBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-state">
              Gagal memuat data dari server. Periksa koneksi internet Anda.
            </td>
          </tr>
        `;
        return;
      }

      // 3. Jika Data Kosong
      if (!data || data.length === 0) {
        leaderboardBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-state">
              Belum ada data nilai untuk Kelas ${grade}.
            </td>
          </tr>
        `;
        return;
      }

      // 4. Render Tabel (Hanya Username & Skor demi Privasi)
      leaderboardBody.innerHTML = data
        .map((item, index) => {
          const rank = index + 1;
          let rankDisplay = `<strong>${rank}</strong>`;

          if (rank === 1) rankDisplay = "🥇 1";
          else if (rank === 2) rankDisplay = "🥈 2";
          else if (rank === 3) rankDisplay = "🥉 3";

          return `
            <tr>
              <td>${rankDisplay}</td>
              <td>@${item.username}</td>
              <td><strong>${item.score_latihan01 || 0}</strong></td>
            </tr>
          `;
        })
        .join("");
    } catch (err) {
      console.error("Error:", err);
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">Terjadi kesalahan sistem.</td>
        </tr>
      `;
    }
  }
});
