// utils/sessionHelper.js
export const getSessionRange = () => {
  const now = new Date();
  const sessionDate = new Date(now);

  // Provjera za sessiju od iduceg dana
  if (now.getHours() < 6) {
    sessionDate.setDate(now.getDate() - 1);
  }

  // Sessija pocinje u 6h
  const start = new Date(sessionDate);
  start.setHours(6, 0, 0, 0);

  // Kraj sessije je u 5:59 iduceg dana
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setSeconds(end.getSeconds() - 1);

  return { start, end };
};