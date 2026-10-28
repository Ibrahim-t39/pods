// [U2 owns] The fixed launch interest list: exactly BLUEPRINT D9's 14, four sections.
// Emoji are allowed inside interest chips only (D5).
import type { Interest } from "@/lib/types";

export const INTERESTS: Interest[] = [
  { id: "basketball", label: "Basketball", icon: "🏀", category: "sport", section: "move", active: true },
  { id: "pickleball", label: "Pickleball", icon: "🏓", category: "sport", section: "move", active: true },
  { id: "running", label: "Running & walking", icon: "👟", category: "wellness", section: "move", active: true },
  { id: "hiking", label: "Hiking", icon: "🥾", category: "outdoors", section: "move", active: true },
  { id: "climbing", label: "Climbing & bouldering", icon: "🧗", category: "sport", section: "move", active: true },
  { id: "soccer", label: "Soccer", icon: "⚽", category: "sport", section: "move", active: true },
  { id: "disc_golf", label: "Disc golf", icon: "🥏", category: "sport", section: "play", active: true },
  { id: "guitar", label: "Guitar & jam", icon: "🎸", category: "music", section: "make", active: true },
  { id: "music_making", label: "Music making", icon: "🎹", category: "music", section: "make", active: true },
  { id: "board_games", label: "Board games", icon: "🎲", category: "games", section: "play", active: true },
  { id: "books", label: "Books", icon: "📚", category: "learning", section: "learn_give", active: true },
  { id: "art", label: "Art & making", icon: "🎨", category: "creative", section: "make", active: true },
  { id: "photography", label: "Photography", icon: "📷", category: "creative", section: "make", active: true },
  { id: "volunteering", label: "Volunteering", icon: "🤝", category: "learning", section: "learn_give", active: true },
];

export const INTEREST_SECTIONS = [
  { id: "move", label: "Move" },
  { id: "make", label: "Make" },
  { id: "play", label: "Play" },
  { id: "learn_give", label: "Learn & give" },
] as const;
