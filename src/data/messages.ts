// [U2] Chat copy for the simulated members. Written to sound like 19-26 year olds who just moved: warm, specific, a little
// dry, never salesy. No names of other members, no heritage or faith cues, no invented stats.
// pre = before a hangout, post = right after, misc = in between. Picked deterministically by history.ts.

export interface Lines { pre: string[]; post: string[]; misc: string[] }

export const LINES: Record<string, Lines> = {
  basketball: {
    pre: ["I'll be the one in the gray shirt that's already sweating", "Anyone have a ball with air in it? Mine does not", "Bringing water for the whole court if somebody carries the ball", "Sunday run, don't let me skip it"],
    post: ["My legs are gone. That was fun though", "Who was the guy who kept calling travels? I respect it", "Same time in two weeks? I'm in", "Tacos was the right call"],
    misc: ["Anyone know if the gym has a water fountain that works", "Left-handed layups are my entire personality", "Please do not put me on defense against the tall guy"],
  },
  pickleball: {
    pre: ["I have two paddles, one is for you if you forgot", "Is anyone else a total beginner or just me", "Wearing sunscreen in November, long story", "Please bring a hat, the sun is rude out there"],
    post: ["I did not know I could be this competitive about a plastic ball", "Doubles with everyone was a great idea", "Same time in two weeks? I'll bring snacks", "My shoulder is already regretting it"],
    misc: ["Which paddle did you end up buying", "Pickleball is just ping pong with more cardio", "Weeknight game soon?"],
  },
  running: {
    pre: ["Easy pace today, I promise, I will not drop anyone", "I'll walk the loop twice and call it a win", "Coffee after if anyone wants it", "Anyone know a good sub-30 playlist"],
    post: ["That felt good. First time in weeks", "I finally ran without checking my watch", "Same loop in two weeks?", "Thanks for not leaving me behind"],
    misc: ["Does anyone use a running belt or is a pocket enough", "Fall is the best running weather and I will fight about it", "Anyone running a race this winter"],
  },
  hiking: {
    pre: ["Bringing extra trail mix, the good kind", "What are the shoes situation, is mine ok for gravel", "I'll drive and take two if you need a ride", "Bring a layer, it gets cold up there"],
    post: ["The view at the turnaround was worth it", "My calves, my calves", "Same trail but different time of day next time?", "Photos are going in the chat, hang on"],
    misc: ["Anyone have a favorite hiking app", "I need more hiking socks, any recs", "Is it weird to get excited about a sunrise hike"],
  },
  climbing: {
    pre: ["I'll be there with my terrible rented shoes", "Coffee first, pain later", "Is it dumb that I'm nervous about a coffee meeting", "Who has done a gym before and who is brand new"],
    post: ["Good to put faces to the chat", "We should absolutely pick a gym night", "I'm in for whichever day works", "Chalk bag shopping this weekend, wish me luck"],
    misc: ["Gym day passes are pricey, anyone know if there's a student rate", "Heel hooks are witchcraft", "Rope or bouldering for a first timer?"],
  },
  soccer: {
    pre: ["I'm bringing a ball and a pump", "Do we want to do small sides or a big game", "Cleats or flats, what's the field like", "Warm up at 1:15 please, my hamstrings need it"],
    post: ["That last goal though", "Everyone was so chill, I loved it", "Same time in two weeks? I'll bring oranges", "I'm already sore and I'm already planning the next one"],
    misc: ["Anyone watch the match yesterday", "Shin guards or no shin guards for pickup", "We need a group name for the group chat"],
  },
  disc_golf: {
    pre: ["I have three discs and zero skill", "Anyone have a spare putter for a beginner", "Bring a layer, it's cold at the first tee", "Nine holes, then lunch"],
    post: ["I threw a disc into a tree and I'm calling it a technique", "That was the most relaxed I've been all week", "Nine more next time? I'll practice putting", "Who is bringing the speaker"],
    misc: ["What disc should a beginner buy", "Anyone seen a course with an actual basket I can find", "Discs as gifts is a real idea"],
  },
  guitar: {
    pre: ["I'm bringing my beat-up acoustic and a capo", "Do we do covers or originals or whatever", "I only know four songs, you've been warned", "Is it ok if I just listen at first"],
    post: ["That was the first time I played in front of people in like a year", "I loved that nobody cared about mistakes", "Next time I'll bring a song I wrote", "Thursday again?"],
    misc: ["Anyone have strings recs", "What's your favorite beginner song", "I bought a clip-on tuner and I feel like a pro"],
  },
  music_making: {
    pre: ["I have a rough loop I'm kind of embarrassed about", "Bringing headphones and one good idea", "Anyone using Ableton or FL or something else", "Can't wait to hear what everyone is working on"],
    post: ["That track you played stuck in my head all night", "Super useful feedback, thank you", "Let's do a swap again soon", "I'm going to rework my bridge tonight"],
    misc: ["Free sample packs worth downloading?", "Headphones under $100 that don't suck", "Anyone else mix on a laptop in bed"],
  },
  board_games: {
    pre: ["Bringing a cooperative game for the first round", "I'll teach it, but I'll teach it badly", "Does anyone have strong feelings about Catan", "I'll bring snacks if someone brings drinks"],
    post: ["I lost and I still want a rematch", "The rules explanation took 20 minutes and it was worth it", "Same time in two weeks? I'll pick the game", "Best afternoon I've had since moving here"],
    misc: ["Anyone have game recs for 4 players", "Co-op or competitive, pick a side", "Is a game night with 7 too many"],
  },
  books: {
    pre: ["I'm bringing a book I've read four times", "Pitching a mystery, fair warning", "Anyone want to trade after", "I have a long list and no shelf space"],
    post: ["I came home with three new books", "Great conversation, thanks for sharing", "Next book swap? I'll find one with a happy ending", "Now I have a reading list for winter"],
    misc: ["Audiobooks count, fight me", "What are you reading on your commute", "Anyone know a good used bookstore"],
  },
  art: {
    pre: ["I'll bring a sketchbook but no promises", "Going to wander first, then sit with someone", "Anyone want to split a supply order", "Excited and slightly intimidated"],
    post: ["I spotted a piece I want to go back to", "I sketched something for the first time in months", "Next time let's make something together", "Loved hearing what caught everyone's eye"],
    misc: ["Anyone want to try a screen print workshop", "Where do you buy cheap sketchbooks", "Let's do a paint night soon"],
  },
  photography: {
    pre: ["I'm shooting on my phone, don't be intimidated", "Golden hour is the plan, bring a jacket", "Anyone have a favorite spot I should see", "I'll bring my film camera for the nostalgia"],
    post: ["I got one shot I actually love", "Share a favorite in the chat, I'll go first", "Let's try a sunrise walk next", "Thanks for making me slow down"],
    misc: ["Phone or camera, what do you reach for", "Editing apps you actually use", "I want to print some of these"],
  },
  volunteering: {
    pre: ["I have a few ideas for where we could help", "Bringing gloves just in case", "Excited to find something we can do together", "Is anyone free on weekends or mostly evenings"],
    post: ["Let's actually sign up for something this month", "Good first walk, good first idea", "I'll look up opportunities and drop links here", "Nice to meet people who want to help"],
    misc: ["Anyone done a food bank shift before", "Trail cleanups are underrated", "Would the group do a monthly thing"],
  },
  // community pods: neutral, no heritage or faith cues
  southern_african: {
    pre: ["I'm bringing way too much food, I always do", "Anyone want me to bring plates and napkins", "Blanket check: who has one", "Excited, a little nervous, the usual"],
    post: ["That was exactly what I needed", "I'll bring more next time", "Can Pods plan another one? Yes please", "Good to be around people who get it"],
    misc: ["Anyone know a good grocery store for what I miss", "How is everyone getting around without a car", "First winter here, any tips"],
  },
  west_african: {
    pre: ["Bringing snacks to share, don't tell anybody it's a whole meal", "I'll bring the blanket, someone bring the speaker", "Excited to see everyone", "Dress for the breeze, it gets cold by the water"],
    post: ["I forgot how nice it is to just sit and talk", "Same park, different dish next time", "Round two sounds right to me", "I laughed more today than all week"],
    misc: ["Any tips for finding a barber around here", "How is everyone dealing with the weather", "I found a great little grocery near campus"],
  },
  sda: {
    pre: ["Packing snacks, mostly for me", "Trail shoes check, mine are muddy", "I can drive three if you need a ride", "Looking forward to meeting everyone properly"],
    post: ["The view was worth the hill", "Pretty sure I'm sore everywhere", "Let's do a longer one next time", "Thanks for being easy to be around"],
    misc: ["Anyone know a good place for fresh produce", "How do you handle dark evenings now", "I need a new water bottle, recs?"],
  },
  muslim: {
    pre: ["I'll be there early to grab a table", "Will there be a quiet spot, I'm sort of shy at first", "Looking forward to meeting everyone", "I'll bring my own tea bag, don't judge"],
    post: ["That was a lovely hour, thank you all", "I did not want to leave", "Let's do it again soon", "Great to find people so easy to talk to"],
    misc: ["Anyone found a good quiet spot to study nearby", "How do you handle winter in this town", "Weekend plans, anyone"],
  },
};

/** Host copy (BLUEPRINT §2.12 voice): short, plain, never hype. */
export const HOST = {
  welcome: (podName: string, n: number, what: string) =>
    `Welcome to ${podName}. You're ${n} people ${what}, all close by. Your first hangout is already planned. Say hi.`,
  planPosted: "Here's a plan for you. Tap I'm in if it works.",
  locked: (n: number) => `It's on. ${n} people are in.`,
  checkin: "Did you make it? Check in so Pods can plan the next one.",
  runItBack: "Private question: want to run it back? Only the total is ever shown.",
  runItBackReveal: (yes: number, answered: number) => `${yes} of ${answered} want to run it back.`,
  runItBackNo: "Planning your next one.",
  voteOpen: "Pick the next one. First to 4 votes wins.",
  quiet: "Want to plan something? Tap and Pods will plan it.",
};

export const WHAT_WELCOME: Record<string, string> = {
  basketball: "who play and are new-ish here",
  pickleball: "who play pickleball and are new-ish here",
  running: "who run or walk and are new-ish here",
  hiking: "who like to hike and are new-ish here",
  climbing: "who climb or want to start",
  soccer: "who play soccer and are new-ish here",
  disc_golf: "who throw discs and are new-ish here",
  guitar: "who play guitar or want to",
  music_making: "who make music",
  board_games: "who love a good game",
  books: "who read",
  art: "who make things",
  photography: "who take photos",
  volunteering: "who want to help out",
  southern_african: "with roots across Southern Africa",
  west_african: "with roots across West Africa",
  sda: "who share a community",
  muslim: "who share a community",
};
