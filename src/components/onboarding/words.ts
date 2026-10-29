// First-run words: the short, lowercase word a like or a free time takes inside the sentence (K D3 plain host;
// "hoops", not "Basketball"). Pure, so the line can be written as you choose.

export const LIKE_WORD: Record<string, string> = {
  basketball: "basketball",
  pickleball: "pickleball",
  running: "running",
  hiking: "hiking",
  climbing: "climbing",
  soccer: "soccer",
  disc_golf: "disc golf",
  guitar: "guitar",
  music_making: "making music",
  board_games: "board games",
  books: "books",
  art: "art",
  photography: "photos",
  volunteering: "volunteering",
  cooking: "cooking",
  coffee: "coffee",
  gym_yoga: "gym and yoga",
  dancing: "dancing",
  gaming: "gaming",
};

export const joinWords = (w: string[]) => w.join(", ");

export type Part = "morning" | "afternoon" | "evening";
export const PARTS: Part[] = ["morning", "afternoon", "evening"];
