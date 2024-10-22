export const getLastFriday = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  let difference = dayOfWeek - 5; // Calculate difference from Friday
  if (difference <= 0) {
    difference += 7; // If today is before Friday, go back to the previous week
  }
  const lastFriday = new Date(today.setDate(today.getDate() - difference));

  const year = lastFriday.getFullYear();
  const month = lastFriday.getMonth() + 1; // getMonth() is 0-indexed
  const day = lastFriday.getDate();

  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
};
