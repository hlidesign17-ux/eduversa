// logic dropdown dan privasi data

import { MOCK_LEADERBOARD } from "./mock-data.js";

document.addEventListener("DOMContentLoaded", () => {
  const gradeSelect = document.getElementById("grade-select");
  const leaderboardBody = document.getElementById("total-leaderboard-body");

  gradeSelect.addEventListener("change", (e) => {
    const selectedGrade = parseInt(e.target.value, 10);
    renderLeaderboardByGrade(selectedGrade);
  });

  function renderLeaderboardByGrade(grade) {
    // 1. Filter Data Berdasarkan Tingkat Kelas (4, 5, atau 6)
    const filteredData = MOCK_LEADERBOARD.filter(
      (item) => item.grade === grade,
    );

    // 2. Urutkan Berdasarkan Skor Tertinggi
    filteredData.sort((a, b) => b.score - a.score);

    // 3. Jika Data Kosong
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

    // 4. Render Tabel (Nama Lengkap Dihilangkan/Tidak Dipakai untuk Privasi)
    leaderboardBody.innerHTML = "";
    filteredData.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${index + 1}</strong></td>
        <td>@${item.username}</td>
        <td><strong>${item.score}</strong></td>
      `;
      leaderboardBody.appendChild(row);
    });
  }
});
