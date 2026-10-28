// [U2] The simulated members (70 bots). Every one is is_demo_bot: true. Names are first names only (no last names, spec).
// Bios and prompts are written to read like real 18-29s who are new to the area. By rule they carry NO heritage or faith
// cues: those live only in identities.ts (BLUEPRINT D11, ARCHITECTURE §9.3). Chanda is NOT here: onboarding creates her.
import type { ProfilePrompt, Slot, User } from "@/lib/types";
import { at, addDays } from "./time";

type PK = ProfilePrompt["key"];
export type Hair = "buzz" | "short" | "curly" | "fade" | "afro" | "long" | "locs" | "bun" | "puff";

interface Row {
  name: string;
  dob: string;
  pro: "she/her" | "he/him" | "they/them" | null;
  bio: string;
  p: [PK, string][];
  /** availability codes: W weekday evening, SM/SA/SE Saturday, UM/UA/UE Sunday */
  a: string;
  /** days after the pilot opened (Sep 22) that this person joined */
  joined: number;
  /** device-side "Keep this day free" */
  keep?: ("saturday" | "sunday")[];
}

const CODE: Record<string, Slot> = {
  W: "weekday-evening", SM: "saturday-morning", SA: "saturday-afternoon", SE: "saturday-evening",
  UM: "sunday-morning", UA: "sunday-afternoon", UE: "sunday-evening",
};

const R = (name: string, dob: string, pro: Row["pro"], bio: string, p: [PK, string][], a: string, joined: number, keep?: Row["keep"]): Row =>
  ({ name, dob, pro, bio, p, a, joined, keep });

export const ROSTER: Row[] = [
  // ── Hoopers (7): the demo pod. Six are free Sunday afternoons; Marcus is Saturday mornings only. ──
  R("Malik", "2003-05-02", "he/him", "Moved here in August for an engineering job. Left-handed, slow, and I will set a screen for you.", [["ask_me_about", "Why my knees are older than I am"], ["perfect_saturday", "Early run, long breakfast, pickup after"]], "SM,W", 1),
  R("Ama", "2004-08-19", "she/her", "Nursing student, night owl, plays like a guard but is secretly a post.", [["ask_me_about", "Surviving clinical rotations"], ["hot_take", "Zone defense at the rec level is a crime"]], "SM,W", 1),
  R("Tobi", "2002-11-30", "he/him", "Barely out of undergrad and trying to find a run that is not all 6'5\" guys.", [["currently_learning", "A left-hand finish that is not embarrassing"], ["ask_me_about", "The best tacos under $10"]], "SM,UA", 2),
  R("Jordan", "2003-01-12", null, "New in town, plays whatever is open. Will bring the speaker if nobody objects.", [["perfect_saturday", "Pickup, then a nap I did not earn"], ["hot_take", "Winners stay on, always"]], "SM,UA", 2),
  R("Dre", "2001-09-07", "he/him", "Fourth quarter guy. Works in logistics, plays like it: always in the right spot.", [["ask_me_about", "Why a good pick beats a good shot"], ["currently_learning", "Slowing down on defense"]], "SM,W", 3),
  R("Kayla", "2004-02-25", "she/her", "Hooper, runner, reluctant cook. I just want a Saturday that is not just laundry.", [["perfect_saturday", "Farmers market, then a run"], ["hot_take", "Rebounding is the most underrated skill"]], "SM,W", 3),
  R("Marcus", "2002-06-15", "he/him", "Teaches middle school math. Saturdays are for sleeping in, mornings are for the gym.", [["ask_me_about", "Pi day, I will not stop"], ["perfect_saturday", "Gym at 9, lunch with anyone"]], "SM", 4),
  // ── Guitar & jam (5): Chanda's second interest; on deck for her ──
  R("Eli", "2003-03-21", "he/him", "Bass player who got talked into learning guitar. Plays by ear, reads slowly.", [["currently_learning", "Fingerstyle, badly, daily"], ["ask_me_about", "A cheap amp that actually sounds good"]], "W", 2),
  R("Nia", "2004-06-08", "she/her", "Writes songs in the notes app and has never shown anyone. Open to changing that.", [["ask_me_about", "A song about a laundromat"], ["hot_take", "Capos are not cheating"]], "W", 3),
  R("Sam", "2002-12-02", "they/them", "Barista by day, open-mic regular by night. Happy to play the same three chords all afternoon.", [["currently_learning", "Open tunings"], ["perfect_saturday", "Record store, then someone's porch"]], "W,UA", 3),
  R("Rae", "2005-01-19", "she/her", "Self-taught, mostly YouTube, mostly folk. Looking for people who like sitting in a circle.", [["ask_me_about", "Tuning by ear in the car"], ["perfect_saturday", "Coffee, thrift store, bad harmonies"]], "W", 5),
  R("Theo", "2001-10-14", "he/him", "Software dev who keeps an old acoustic under the desk. Plays lunch breaks and nobody has complained.", [["currently_learning", "Travis picking"], ["hot_take", "Every song is better with a shaker"]], "W,UA", 6),
  // ── Southern African community pod (6): 2 Zambians + 4 others, so Chanda's group widens ──
  R("Mwila", "2003-07-11", "she/her", "Moved for a chemistry master's. Cooks big on Sundays and always makes too much.", [["ask_me_about", "Lab stories that are less glamorous than they sound"], ["currently_learning", "Driving on the highway without gripping the wheel"]], "UA,W", 8),
  R("Bupe", "2002-04-27", "she/her", "Accountant by training, baker by hobby. Will trade banana bread for a ride to the airport.", [["perfect_saturday", "Long bake, longer phone call home"], ["ask_me_about", "Why I count everything twice"]], "UA,W", 8),
  R("Tendai", "2003-09-03", "he/him", "Mechanical engineering, second year in town. Will talk about cars, and also about soccer.", [["ask_me_about", "Whether my car will pass inspection"], ["hot_take", "Group projects are fine if people just show up"]], "UA,W", 9),
  R("Lindiwe", "2004-01-30", "she/her", "Design student who walks everywhere to avoid parking. Loves a long picnic.", [["perfect_saturday", "Walk with a sketchbook and no destination"], ["currently_learning", "Screen printing"]], "UA,SM", 9),
  R("Mpho", "2002-08-16", "he/him", "Early-career software developer, new to the South. Learning what sweet tea really means.", [["currently_learning", "Not putting hot sauce on everything"], ["ask_me_about", "Debugging at 11 PM"]], "UA", 10),
  R("Kondwani", "2005-02-09", "he/him", "Quiet at first, then I will not stop talking. Business student, first time away from home.", [["ask_me_about", "Which dining hall is least bad"], ["perfect_saturday", "Soccer on the quad, then a long lunch"]], "W", 10),
  // ── Seventh-day Adventist community pod (7). Bios stay neutral by design. ──
  R("Grace", "2003-02-14", "she/her", "Biology, lab-bench tired, and always up for a hike with a good view.", [["ask_me_about", "Why moss is the best plant"], ["perfect_saturday", "Trail first, food second"]], "UA,W", 6, ["saturday"]),
  R("Josiah", "2002-05-20", "he/him", "Pickleball convert. Four months in and still pretending I am bad at it.", [["currently_learning", "The third-shot drop"], ["hot_take", "Dinking is the real game"]], "UA,W", 6, ["saturday"]),
  R("Naomi", "2004-03-05", "she/her", "Quiet on a first meeting, loud once I am comfortable. Likes slow Sundays.", [["ask_me_about", "Plants I have not killed yet"], ["perfect_saturday", "Walk, coffee, long conversation"]], "UA,UM", 7, ["saturday"]),
  R("Caleb", "2001-12-11", "he/him", "Disc golf, coffee, and spreadsheets. Not in that order.", [["currently_learning", "Backhand that goes where I mean it to"], ["ask_me_about", "Excel, because I will actually enjoy answering"]], "UA,W", 7, ["saturday"]),
  R("Esther", "2003-10-23", "she/her", "Nursing, board games, volunteering when the shift allows.", [["ask_me_about", "The weirdest board game rule we ever found"], ["hot_take", "Everyone should play one cooperative game"]], "UA,W", 7, ["saturday"]),
  R("Micah", "2004-07-17", "he/him", "Photographer-ish. Mostly sunsets, sometimes people if they let me.", [["perfect_saturday", "Golden hour somewhere green"], ["currently_learning", "Shooting in manual, finally"]], "UA,W", 8, ["saturday"]),
  R("Abigail", "2002-09-28", "she/her", "Reads in the car at red lights, which is a bad habit. Currently deep in sci-fi.", [["ask_me_about", "A book you should read next"], ["hot_take", "Audiobooks absolutely count"]], "UA,UE", 8, ["saturday"]),
  // ── West African community pod (6) ──
  R("Chidi", "2002-03-18", "he/him", "Runs a few mornings a week, still slow, still happy. Works nights at a lab.", [["ask_me_about", "Running at 5 AM, and why I do it"], ["currently_learning", "Pacing myself"]], "UA,W", 9),
  R("Ngozi", "2003-11-06", "she/her", "Producer-curious: loops, drum machines, bad demos. Happy to trade feedback.", [["ask_me_about", "How I made a beat out of a dishwasher"], ["currently_learning", "Mixing without clipping everything"]], "UA,W", 9),
  R("Kwame", "2001-08-04", "he/him", "Pickleball, soccer when someone organizes it, and food opinions.", [["hot_take", "Second serve is where games are won"], ["perfect_saturday", "Pickup, cookout, repeat"]], "UA,W", 10),
  R("Abena", "2004-05-29", "she/her", "Hikes more than I admit. Loves a campsite breakfast.", [["perfect_saturday", "Trail by 8, brunch by noon"], ["ask_me_about", "Gear I regret buying"]], "UA", 10),
  R("Femi", "2002-01-25", "he/him", "Soccer all my life. Looking for a Sunday kickabout that actually starts on time.", [["hot_take", "If you are late, you are on defense"], ["currently_learning", "Finishing with the weaker foot"]], "UA,W", 11),
  R("Aminata", "2005-04-12", "she/her", "Second-year student. Book club of one, looking to upgrade to more.", [["ask_me_about", "A book that ruined my week in a good way"], ["perfect_saturday", "Library, then a patient lunch"]], "UA,W", 11),
  // ── Muslim community pod (6) ──
  R("Yusuf", "2003-06-22", "he/him", "Builds synths out of old electronics. The plan is always a bit bigger than the skill.", [["ask_me_about", "A tiny drone synth I made from scrap"], ["currently_learning", "Soldering without burning my thumb"]], "UA,W", 11),
  R("Amira", "2004-09-10", "she/her", "Grad school survivor, board game person. I take game night too seriously.", [["hot_take", "Cooperative games build better friendships"], ["perfect_saturday", "Game night with snacks I did not make"]], "UA,W", 12),
  R("Zainab", "2002-02-02", "she/her", "Marathon someday, slow jogs now. Looking for a regular running crew.", [["currently_learning", "Not sprinting the first mile"], ["ask_me_about", "My very specific playlist order"]], "UA,W", 12),
  R("Idris", "2001-11-15", "he/him", "Soccer midfielder, volunteer tutor. Always the person with a spare water.", [["ask_me_about", "How tutoring changed how I learn"], ["hot_take", "Possession is overrated"]], "UA,W", 12),
  R("Hamza", "2003-04-04", "he/him", "Learning to climb, scared of heights, going anyway.", [["currently_learning", "Trusting my feet"], ["perfect_saturday", "Gym, long lunch, nap"]], "UA,W", 13),
  R("Layla", "2004-10-31", "she/her", "Pickleball, true crime podcasts, and being scared of dogs for no reason.", [["hot_take", "Pickleball is basically tennis for friends"], ["ask_me_about", "A podcast you will regret starting"]], "UA,W", 13),
  // ── Other interest pods ──
  R("Priya", "2003-07-26", "she/her", "Pickleball, weekday evenings, and a good ratio of friends to rackets.", [["currently_learning", "A reliable backhand"], ["ask_me_about", "The paddle I regret"]], "W,UA", 4),
  R("Devon", "2002-10-09", "he/him", "Pickleball and volunteering. Prefers tutoring over cleanups and cleanups over meetings.", [["perfect_saturday", "Court first, then a quiet lunch"], ["hot_take", "Keep score loosely"]], "W,SM", 4),
  R("Camila", "2004-12-20", "she/her", "Hiking and photos of the same trail in different light.", [["ask_me_about", "That one spot with the water"], ["currently_learning", "Not overpacking"]], "SM,UA", 5),
  R("Isaiah", "2003-08-13", "he/him", "Hikes on Sundays, volunteers on Saturdays. Calendar is the opposite of exciting.", [["perfect_saturday", "Trail cleanup, then barbecue"], ["ask_me_about", "Trail snacks, rated"]], "SM,UA", 5),
  R("Maya", "2003-03-30", "she/her", "Running and photography, usually in that order and often at sunrise.", [["perfect_saturday", "Sunrise run, then wander with a camera"], ["currently_learning", "Shooting film"]], "W,SM", 5),
  R("Andre", "2002-07-01", "he/him", "Easy runs and hard conversations. Tell me your training plan.", [["ask_me_about", "Zone 2 running"], ["hot_take", "Walk breaks are fine"]], "W,UA", 6),
  R("Sofia", "2004-05-14", "she/her", "Board games, art, and anything with a good snack table.", [["ask_me_about", "A game with minis I painted"], ["perfect_saturday", "Studio morning, game night"]], "W,UA", 6),
  R("Jalen", "2003-01-07", "he/him", "Just started bouldering. Bad at slopers, good at cheering.", [["currently_learning", "Heel hooks"], ["hot_take", "Chalk is a lifestyle"]], "W,UA", 6),
  R("Noah", "2002-06-26", "he/him", "Disc golf, bad at putting, loyal to the sport anyway.", [["ask_me_about", "My overstable collection"], ["currently_learning", "Putting from 30 feet"]], "SM,UA", 7),
  R("Imani", "2004-03-17", "she/her", "Books and board games. Favorite genre is whichever one is on the shelf.", [["ask_me_about", "A cozy mystery I will lend you"], ["hot_take", "Reading in groups beats reading alone"]], "W,UA", 7),
  R("Tyler", "2001-11-02", "he/him", "Disc golf and volunteer coaching. Soft spot for beginner courses.", [["perfect_saturday", "Nine holes, then lunch"], ["hot_take", "Putters are underrated"]], "SM,UA", 7),
  R("Aaliyah", "2005-07-08", "she/her", "Making music in my room, ready to be heard in a room with other people.", [["ask_me_about", "A loop pedal and too many ideas"], ["currently_learning", "Mixing vocals"]], "W,UA", 8),
  R("Carlos", "2002-09-19", "he/him", "Soccer and good food. Moved for school, stayed for the weather.", [["perfect_saturday", "Pickup, then tacos"], ["hot_take", "Substitutes should be allowed to call fouls"]], "W,UA", 8),
  R("Hannah", "2003-12-27", "she/her", "Pickleball and photography. Prefers action shots.", [["currently_learning", "Shooting in burst mode"], ["ask_me_about", "A picture of a pickleball mid-air"]], "UA,W", 8),
  R("Darius", "2001-10-05", "he/him", "Soccer, and sometimes volunteering. Finally have a Sunday off.", [["hot_take", "Sundays should start at 1"], ["ask_me_about", "Why I coach little kids"]], "UA,W", 9),
  R("Mei", "2004-04-21", "she/her", "Climbing, photography, big coffee orders. Moved here for work.", [["ask_me_about", "Gym chalk and film cameras"], ["perfect_saturday", "Climb, develop, nap"]], "W,UA", 9),
  R("Bryce", "2002-02-18", "he/him", "Running and a lot of spreadsheets about running. Let me walk you through them.", [["ask_me_about", "A shoe that actually lasted"], ["currently_learning", "Pacing a marathon"]], "W,UA", 10),
  R("Simone", "2003-09-25", "she/her", "Art and running. Slow, colorful, consistent.", [["perfect_saturday", "Run, brunch, studio"], ["hot_take", "Music while painting is non-negotiable"]], "SM,UA", 10),
  R("Luis", "2002-11-23", "he/him", "Soccer, sports talk, and ordering the thing I cannot pronounce.", [["ask_me_about", "A tournament I got way too into"], ["currently_learning", "Switching feet on a first touch"]], "W,UA", 11),
  R("Trinity", "2004-01-16", "she/her", "Soccer and sketching. Moved to Alabama for a graduate program.", [["perfect_saturday", "Sketch at the park, play at 4"], ["currently_learning", "Watercolor"]], "W,UA", 11),
  R("Quincy", "2003-05-09", "he/him", "Disc golf, comics, and the first person to say yes to a plan.", [["ask_me_about", "A comic series to start tonight"], ["hot_take", "Frisbee is a real sport"]], "SM,UA", 12),
  R("Jasmine", "2002-08-31", "she/her", "Art and photography. Always carrying a sketchbook and a camera and a bag.", [["perfect_saturday", "A gallery, then a cheap lunch"], ["ask_me_about", "How I frame a photo"]], "W,UA", 12),
  R("Owen", "2005-03-03", "he/him", "Hiking and photography. Big on early starts.", [["perfect_saturday", "Out the door by 6"], ["hot_take", "Trail mix is an art"]], "SM,UA", 12),
  R("Rohan", "2001-12-08", "he/him", "Hiking and board games. I will explain the rules for twenty minutes.", [["ask_me_about", "How to teach a game in five minutes"], ["currently_learning", "Fire starting, safely"]], "W,UA", 13),
  R("Brianna", "2003-06-12", "she/her", "Board games and bad puns. The pun is always the best move.", [["hot_take", "Draft games are the best games"], ["ask_me_about", "A game your parents will like"]], "W,UA", 13),
  R("Xavier", "2002-10-28", "he/him", "Bouldering and breakfast burritos. Usually in that order.", [["currently_learning", "Dynamic moves"], ["perfect_saturday", "Gym, burrito, couch"]], "W,UA", 13),
  R("Leah", "2004-08-02", "she/her", "Climbing and illustrating. Hands are always dusty with something.", [["ask_me_about", "Drawing the climbing wall"], ["currently_learning", "Pen and ink"]], "W,UA", 14),
  R("Wesley", "2001-09-14", "he/him", "Pickleball and board games. Tends to win at one of them.", [["hot_take", "Tabletop is the best social sport"], ["ask_me_about", "A strategy game, no regrets"]], "W,UA", 14),
  R("Destiny", "2003-11-20", "she/her", "Books, tea, and the occasional hot take about endings.", [["ask_me_about", "Why I abandoned a bestseller"], ["hot_take", "Epilogues are optional"]], "W,UA", 14),
  R("Gabe", "2004-02-11", "he/him", "Music maker, amateur photographer. Happy to carry gear.", [["currently_learning", "Mic technique"], ["ask_me_about", "A guitar pedal I would trade"]], "W,UA", 15),
  R("Zoe", "2003-10-08", "she/her", "Disc golf and art. The two share a surprising number of curves.", [["perfect_saturday", "Nine holes, then paint"], ["hot_take", "A bad disc is a flavor"]], "SM,UA", 15),
  R("Elijah", "2002-04-05", "he/him", "Makes beats on a laptop with a sticky keyboard. Wants a room to play them in.", [["ask_me_about", "Sampling a ceiling fan"], ["currently_learning", "Finishing a song"]], "W,UA", 15),
  R("Nadia", "2003-01-29", "she/her", "Books and volunteering. Library card in my bag, always.", [["ask_me_about", "A used bookstore I should visit"], ["perfect_saturday", "Library, food bank shift, library"]], "W,UA", 16),
];

export const ROSTER_BY_NAME = new Map(ROSTER.map((r) => [r.name, r]));
export const botId = (name: string) => `user_${name.toLowerCase()}`;


export function buildUsers(pilotOpen: string): User[] {
  return ROSTER.map((r) => {
    const created = at(addDays(pilotOpen, r.joined), "12:00");
    const id = botId(r.name);
    return {
      id,
      first_name: r.name,
      nickname: null,
      pronouns: r.pro,
      bio: r.bio.slice(0, 150),
      prompts: r.p.map(([key, answer]) => ({ key, answer })),
      photo_urls: [`/avatars/${id}.svg`],
      date_of_birth: r.dob,
      city: "Huntsville",
      phone: "",
      verified: true,
      verified_at: at(addDays(pilotOpen, r.joined), "12:20"),
      availability: r.a.split(",").map((c) => CODE[c]),
      blocked_days: r.keep ?? [],
      created_at: created,
      status: "active",
      onboarding_step: "done",
      pledge_accepted_at: created,
      is_demo_bot: true,
      notification_prefs: { email: false, sms: false, push: false },
    } satisfies User;
  });
}
