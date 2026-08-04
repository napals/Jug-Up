export const COLORS = {
  background: '#EAF6FF',
  primary: '#1E90FF',
  primaryDark: '#0B5ED7',
  accent: '#4FD1E9',
  card: '#FFFFFF',
  text: '#0B2545',
  textMuted: '#5C7A99',
  success: '#22C55E',
  warning: '#F59E0B',
};

export const GLASS_SIZE_ML = 250;

// Playful, rotating encouragement copy — picked randomly so it doesn't feel static.
export const ENCOURAGEMENT = [
  "You're basically part fish today 🐟",
  'Hydration station, fully staffed 💧',
  'Your cells are throwing a party right now 🎉',
  "Keep going — you're on a roll 🌊",
  'Sip sip, hooray!',
  "That's the stuff. Liquid gold, but clear.",
];

export const EMPTY_STATE_MESSAGES = [
  "Not a drop yet today — let's fix that 💧",
  'Your glass is calling your name 🥤',
  "It's quiet in here. Too quiet. Drink water.",
];

export function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Fun labels for how close someone is to their goal.
export function progressMessage(percent) {
  if (percent >= 100) return "Goal smashed! You're a hydration legend 🏆";
  if (percent >= 75) return 'So close — one more glass!';
  if (percent >= 50) return "Halfway there, keep it flowing 🌊";
  if (percent >= 25) return 'Nice start — keep sipping';
  return 'Every drop counts. Let’s go!';
}

// Fun copy for the streak badge, scaled to how impressive the streak is.
export function streakMessage(streak) {
  if (streak === 0) return 'Hit your goal today to start a streak';
  if (streak === 1) return 'Streak started — keep it going!';
  if (streak < 3) return 'Building momentum';
  if (streak < 7) return 'On a roll!';
  if (streak < 14) return 'A full week+ strong 💪';
  if (streak < 30) return "You're unstoppable";
  return 'Absolute hydration legend 👑';
}
