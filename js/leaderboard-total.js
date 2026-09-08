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
      // 2. Ambil Data Real-time dari Supabase
      const { data, error } = await supabase
        .from("users")
        .select("username, class_name, grade, score_latihan01")
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

      // 3. Filter berdasarkan 'grade' atau awalan 'class_name' (misal "6C" -> kelas 6)
      const filteredData = (data || []).filter((item) => {
        if (item.grade === grade) return true;
        if (item.class_name && item.class_name.startsWith(grade.toString()))
          return true;
        return false;
      });

      // 4. Jika Data Kosong
      if (filteredData.length === 0) {
        leaderboardBody.innerHTML = `
          <tr>
            <td colspan="3" class="empty-state">
              Belum ada data nilai untuk Kelas ${grade}.
            </td>
          </tr>
        `;
        return;
      }

      // 5. HITUNG PERINGKAT DENGAN DENSE RANKING (Skor sama = Peringkat sama)
      let currentRank = 0;
      let previousScore = null;

      leaderboardBody.innerHTML = filteredData
        .map((item) => {
          const score = item.score_latihan01 || 0;

          // Jika skor berbeda dengan skor sebelumnya, tingkatkan nomor peringkat
          if (score !== previousScore) {
            currentRank++;
            previousScore = score;
          }

          let rankDisplay = `<strong>${currentRank}</strong>`;
          if (currentRank === 1) rankDisplay = "🥇 1";
          else if (currentRank === 2) rankDisplay = "🥈 2";
          else if (currentRank === 3) rankDisplay = "🥉 3";

          return `
            <tr>
              <td>${rankDisplay}</td>
              <td>@${item.username}</td>
              <td><strong>${score}</strong></td>
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
