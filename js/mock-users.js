// Data akun otomatis untuk kelas 4, 5, dan 6 (A-D)
function generateUsers() {
  const grades = [4, 5, 6];
  const classCodes = [
    { classSuffix: "A", code: "aw" },
    { classSuffix: "B", code: "bx" },
    { classSuffix: "C", code: "cy" },
    { classSuffix: "D", code: "dz" },
  ];

  const users = [];

  grades.forEach((grade) => {
    classCodes.forEach(({ classSuffix, code }) => {
      for (let i = 1; i <= 30; i++) {
        const numStr = i < 10 ? `0${i}` : `${i}`;
        const key = `${grade}${code}${numStr}`;

        users.push({
          username: `edu${key}`,
          password: `alfalah${key}`,
          grade: grade,
          className: `${grade}${classSuffix}`,
        });
      }
    });
  });

  return users;
}

export const MOCK_USERS = generateUsers();
