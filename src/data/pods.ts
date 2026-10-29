// [U2] Pod definitions + who is in each (by first name). Interest pods exist for all 14 launch interests, plus four
// community pods: Southern African (the widened demo pod), Seventh-day Adventist, West African and Muslim.
// age_min/age_max are derived from the members in seed.ts so the band always contains them.
import type { Pod } from "@/lib/types";
import { DEMO } from "@/config/demo";

export interface PodDef {
  id: string;
  name: string;
  type: Pod["type"];
  kind: Pod["community_kind"];
  topic: string;
  topic_key: string;
  hue: Pod["hue"];
  members: string[];
  /** interest id (interest pods) or TOPICS key (community pods) */
  plan: string;
  /** one of the four pods that exist for the Chanda demo: formed on Nov 1, no history yet */
  demo?: boolean;
  /** does this pod keep meeting? false = only one hangout happened and nobody has re-planned yet */
  repeats?: boolean;
  /** group widening that created the pod, if any */
  widened?: Pod["widened_from"];
  /** availability of the live persona who will join this pod (Chanda), for the pre-written counts */
  persona?: ("W" | "UA")[];
}

export const POD_DEFS: PodDef[] = [
  { id: DEMO.hoopers.podId, name: "Hoopers", type: "interest", kind: null, topic: "basketball", topic_key: "basketball", hue: "ember", plan: "basketball", demo: true, persona: ["W", "UA"],
    members: ["Malik", "Ama", "Tobi", "Jordan", "Dre", "Kayla", "Marcus"] },
  // Strings wears the "signal" slot (renders ember, POD_SOLID): your second interest pod, so your pods read as the logo
  { id: "pod_rocket_city_strings", name: "Strings", type: "interest", kind: null, topic: "guitar", topic_key: "guitar", hue: "signal", plan: "guitar", demo: true, persona: ["W", "UA"],
    members: ["Eli", "Nia", "Sam", "Rae", "Theo"] },
  { id: DEMO.southernAfrican.podId, name: "Southern African", type: "community", kind: "heritage", topic: "Southern African", topic_key: "southern_african", hue: "grove", plan: "southern_african", demo: true, persona: ["UA", "W"],
    widened: { kind: "group", from: "Zambian", to: "Southern African" },
    members: ["Mwila", "Bupe", "Tendai", "Lindiwe", "Mpho", "Kondwani"] },
  { id: "pod_adventist_young_adults", name: "Adventist young adults", type: "community", kind: "faith", topic: "Seventh-day Adventist", topic_key: "sda", hue: "grove", plan: "sda", demo: true, persona: ["UA", "W"],
    members: ["Grace", "Josiah", "Naomi", "Caleb", "Esther", "Micah", "Abigail"] },
  { id: "pod_west_african", name: "West African", type: "community", kind: "heritage", topic: "West African", topic_key: "west_african", hue: "grove", plan: "west_african", repeats: true,
    widened: { kind: "group", from: "Nigerian", to: "West African" },
    members: ["Chidi", "Ngozi", "Kwame", "Abena", "Femi", "Aminata"] },
  { id: "pod_muslim_young_adults", name: "Muslim young adults", type: "community", kind: "faith", topic: "Muslim", topic_key: "muslim", hue: "grove", plan: "muslim", repeats: false,
    widened: { kind: "group", from: "Muslim (Sunni)", to: "Muslim" },
    members: ["Yusuf", "Amira", "Zainab", "Idris", "Hamza", "Layla"] },
  { id: "pod_pickleball", name: "Dinkers", type: "interest", kind: null, topic: "pickleball", topic_key: "pickleball", hue: "ember", plan: "pickleball", repeats: true,
    members: ["Priya", "Devon", "Josiah", "Hannah", "Wesley", "Layla", "Kwame"] },
  { id: "pod_running", name: "Striders", type: "interest", kind: null, topic: "running & walking", topic_key: "running", hue: "ember", plan: "running", repeats: true,
    members: ["Maya", "Andre", "Grace", "Chidi", "Zainab", "Bryce", "Mwila", "Simone"] },
  { id: "pod_hiking", name: "Wanderers", type: "interest", kind: null, topic: "hiking", topic_key: "hiking", hue: "ember", plan: "hiking", repeats: true,
    members: ["Isaiah", "Camila", "Micah", "Naomi", "Owen", "Rohan", "Abena"] },
  { id: "pod_climbing", name: "Chalk & Coffee", type: "interest", kind: null, topic: "climbing & bouldering", topic_key: "climbing", hue: "ember", plan: "climbing", repeats: false,
    members: ["Jalen", "Mei", "Xavier", "Leah", "Hamza", "Tendai"] },
  { id: "pod_soccer", name: "Kickabout", type: "interest", kind: null, topic: "soccer", topic_key: "soccer", hue: "ember", plan: "soccer", repeats: true,
    members: ["Carlos", "Luis", "Idris", "Femi", "Kondwani", "Darius", "Trinity"] },
  { id: "pod_disc_golf", name: "Disc Club", type: "interest", kind: null, topic: "disc golf", topic_key: "disc_golf", hue: "ember", plan: "disc_golf", repeats: false,
    members: ["Tyler", "Noah", "Caleb", "Quincy", "Mpho", "Zoe"] },
  { id: "pod_music_making", name: "Loop Room", type: "interest", kind: null, topic: "music making", topic_key: "music_making", hue: "ember", plan: "music_making", repeats: true,
    members: ["Aaliyah", "Gabe", "Ngozi", "Yusuf", "Elijah", "Theo"] },
  { id: "pod_board_games", name: "Roll Call", type: "interest", kind: null, topic: "board games", topic_key: "board_games", hue: "ember", plan: "board_games", repeats: true,
    members: ["Sofia", "Imani", "Esther", "Brianna", "Lindiwe", "Amira", "Wesley"] },
  { id: "pod_books", name: "Page Turners", type: "interest", kind: null, topic: "books", topic_key: "books", hue: "ember", plan: "books", repeats: true,
    members: ["Nadia", "Destiny", "Abigail", "Bupe", "Aminata", "Imani", "Rae"] },
  { id: "pod_art", name: "Studio Hours", type: "interest", kind: null, topic: "art & making", topic_key: "art", hue: "ember", plan: "art", repeats: false,
    members: ["Jasmine", "Simone", "Trinity", "Leah", "Sofia", "Nia", "Zoe"] },
  { id: "pod_photography", name: "Golden Hour", type: "interest", kind: null, topic: "photography", topic_key: "photography", hue: "ember", plan: "photography", repeats: true,
    members: ["Mei", "Jasmine", "Abena", "Lindiwe", "Owen", "Camila"] },
  { id: "pod_volunteering", name: "Hands On", type: "interest", kind: null, topic: "volunteering", topic_key: "volunteering", hue: "ember", plan: "volunteering", repeats: true,
    members: ["Grace", "Esther", "Nadia", "Idris", "Isaiah", "Devon"] },
];
