/* The set a list's emoji is chosen from.

   choosing-a-value rule 1: an emoji is an enumerable domain, so the control has
   to SHOW the set. Nobody has a keyboard key labelled 📚, and the OS palette is
   invisible — a door you cannot see does not exist (rule 2). This array is that
   set; the picker renders it as a grid.

   Picked for a to-do app: the kinds of list a person actually keeps. */
export const listEmoji = [
  '📋', '✅', '⭐', '🔥', '🎯', '📌', '🗓️', '⏰',
  '💼', '💻', '📈', '💰', '✉️', '📞', '🧾', '🗂️',
  '🏠', '🧹', '🛒', '🍳', '🧺', '🔧', '🌱', '🐾',
  '🎒', '📚', '✏️', '🎓', '🧪', '🎨', '🎸', '🎬',
  '✈️', '🏝️', '🚗', '🏃', '🏋️', '🧘', '💊', '🩺',
  '🎁', '🎉', '❤️', '👨‍👩‍👧', '🍽️', '☕', '🌙', '💡',
];

/* Rendered wherever a list has no emoji of its own. One constant so the
   sidebar, the detail panel's list picker and the emoji grid cannot drift. */
export const defaultListEmoji = '📋';
