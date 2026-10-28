// [U2] Huntsville-area venues. REAL PUBLIC PLACES ONLY. Every row was checked by web search on 2026-10-27 and carries the
// source_url that backed the address. Where the address, hours or cost could not be confirmed the row says so
// (cost_unconfirmed, hours_note null) or is `active: false`. seed.ts refuses to build if an active venue lacks
// source_url or verified_at (assertVenues). Coordinates are approximate map pins (geocoded or rounded), never used for routing.
// Places of worship are never starter venues (STRATEGY §7.6).
import type { Venue } from "@/lib/types";

const V = "2026-10-27";

export const VENUES: Venue[] = [
  {
    id: "venue_brahan_rec", name: "Brahan Spring Recreation Center", short_name: "Brahan Spring Rec Center",
    address: "3770 Ivy Ave SW, Huntsville, AL 35805", type: "community_center", is_public: true, city: "Huntsville",
    lat: 34.704, lng: -86.601, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["basketball", "pickleball"],
    hours_note: "City lists Sunday 1 to 5 PM. Open-gym times and any fee are not published: call 256-883-3710.",
    parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    source_url: "https://www.huntsvilleal.gov/environment/parks-recreation/recreation/recreation-centers/brahan-spring-recreation-center",
    verified_at: V, active: true,
  },
  {
    id: "venue_showers_rec", name: "Dr. Richard Showers Sr. Recreation Center", short_name: "Showers Rec Center",
    address: "4600 Blue Spring Rd, Huntsville, AL", type: "community_center", is_public: true, city: "Huntsville",
    lat: 34.783, lng: -86.599, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["basketball", "pickleball"],
    hours_note: "Hours and any fee are not published online: call the city, 256-851-4001.",
    parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    source_url: "https://www.huntsvilleal.gov/environment/parks-recreation/recreation/recreation-centers/",
    verified_at: V, active: true,
  },
  {
    id: "venue_john_hunt_rec", name: "John Hunt Park Recreation Center (pickleball courts)", short_name: "John Hunt Park pickleball",
    address: "3035 Leeman Ferry Rd, Huntsville, AL 35801", type: "park", is_public: true, city: "Huntsville",
    lat: 34.707, lng: -86.612, indoor: false, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["pickleball", "any"],
    hours_note: "City lists the pickleball complex open daily 8 AM to 9 PM; the building is open Sunday 1 to 5 PM. Fees are not published.",
    parking: null, meet_note: "Meet by the courts.", accessibility: null,
    source_url: "https://www.huntsvilleal.gov/environment/parks-recreation/recreation/recreation-centers/john-hunt-park-recreation-center/",
    verified_at: V, active: true,
  },
  {
    id: "venue_big_spring_park", name: "Big Spring Park", short_name: "Big Spring Park",
    address: "200 Church St SW, Huntsville, AL 35801", type: "park", is_public: true, city: "Huntsville",
    lat: 34.729, lng: -86.588, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["running", "photography", "books", "any"],
    hours_note: "Listed dawn to dusk.", parking: null, meet_note: "Meet by the footbridge over the lagoon.", accessibility: null,
    source_url: "https://alabama.travel/places-to-go/big-spring-park", verified_at: V, active: true,
  },
  {
    id: "venue_monte_sano_bankhead", name: "Monte Sano Nature Preserve, Bankhead trailhead", short_name: "Monte Sano, Bankhead trailhead",
    address: "2442 Bankhead Pkwy NE, Huntsville, AL 35801", type: "trail", is_public: true, city: "Huntsville",
    lat: 34.744, lng: -86.545, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "photography", "volunteering"],
    hours_note: null, parking: "Parking fills up on weekends. Come early.", meet_note: "Meet at the trailhead lot.", accessibility: null,
    source_url: "https://landtrustnal.org/explore-our-lands/preserves-north-alabama/", verified_at: V, active: true,
  },
  {
    id: "venue_monte_sano_cold_springs", name: "Monte Sano Nature Preserve, Cold Springs trailhead", short_name: "Monte Sano, Cold Springs",
    address: "150 Fearn St SE, Huntsville, AL 35801", type: "trail", is_public: true, city: "Huntsville",
    lat: 34.743, lng: -86.53, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "volunteering"],
    hours_note: null, parking: null, meet_note: "Meet at the trailhead.", accessibility: null,
    source_url: "https://landtrustnal.org/venue/monte-sano-nature-preserve-cold-springs-trailhead", verified_at: V, active: true,
  },
  {
    id: "venue_hays_preserve", name: "J.D. & Annie S. Hays Nature Preserve", short_name: "Hays Nature Preserve",
    address: "7153 Hwy 431 S, Owens Cross Roads, AL 35763", type: "trail", is_public: true, city: "Huntsville",
    lat: 34.62, lng: -86.45, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "running", "photography"],
    hours_note: null, parking: null, meet_note: "Meet at the main parking area.", accessibility: null,
    source_url: "https://www.huntsvilleal.gov/environment/green-team/nature-preserves/hays-nature-preserve/", verified_at: V, active: true,
  },
  {
    id: "venue_hmcpl_main", name: "Huntsville-Madison County Public Library, Main", short_name: "Downtown library",
    address: "915 Monroe St SW, Huntsville, AL 35801", type: "library", is_public: true, city: "Huntsville",
    lat: 34.723, lng: -86.59, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: ["books", "board_games", "music_making", "any"],
    hours_note: "Hours change: check hmcpl.org. Meeting rooms are booked separately.", parking: null, meet_note: "Meet in the lobby.", accessibility: null,
    source_url: "https://en.wikipedia.org/wiki/Huntsville-Madison_County_Public_Library", verified_at: V, active: true,
  },
  {
    id: "venue_lowe_mill", name: "Lowe Mill ARTS & Entertainment", short_name: "Lowe Mill",
    address: "2211 Seminole Dr SW, Huntsville, AL 35805", type: "studio", is_public: true, city: "Huntsville",
    lat: 34.715, lng: -86.597, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["art", "guitar", "music_making", "photography"],
    hours_note: "Public hours Wednesday to Saturday, 11 AM to 7 PM. Closed Sunday to Tuesday. The HTMA acoustic jam in Studio 1038 is listed on Saturdays.",
    parking: null, meet_note: "Meet at the main entrance.", accessibility: null,
    source_url: "https://lowemill.art/venue/huntsville-traditional-music-association-studio-1038", verified_at: V, active: true,
  },
  {
    id: "venue_lucky_dice", name: "Lucky Dice Cafe", short_name: "Lucky Dice Cafe",
    address: "7914 S Memorial Pkwy, Suite B7, Huntsville, AL 35802", type: "cafe", is_public: true, city: "Huntsville",
    lat: 34.64, lng: -86.55, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["board_games"],
    hours_note: "Hours not confirmed. The cafe has a bar, so Pods only plans daytime visits here.", parking: null, meet_note: "Meet inside the front door.", accessibility: null,
    source_url: "https://www.huntsville.org/listing/lucky-dice-cafe/1984/", verified_at: V, active: true,
  },
  {
    id: "venue_honest_coffee", name: "Honest Coffee Roasters (downtown)", short_name: "Honest Coffee",
    address: "114 Clinton Ave E, Suite 106, Huntsville, AL 35801", type: "cafe", is_public: true, city: "Huntsville",
    lat: 34.731, lng: -86.586, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: ["books", "any"],
    hours_note: "Listings differ on hours: check before you go.", parking: null,
    meet_note: "Meet inside. Buy your own drink if you want one.", accessibility: null,
    source_url: "https://joe.coffee/locations/al/huntsville/honest-coffee-roasters-huntsville/", verified_at: V, active: true,
  },
  {
    id: "venue_botanical_garden", name: "Huntsville Botanical Garden", short_name: "Botanical Garden",
    address: "4747 Bob Wallace Ave SW, Huntsville, AL 35805", type: "park", is_public: true, city: "Huntsville",
    lat: 34.708, lng: -86.635, indoor: false, cost_per_person: 17, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["photography", "art"],
    hours_note: null, parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    // Sources list adult admission anywhere from $12 to $17; the highest is used so the planner treats it as over budget until confirmed.
    source_url: "https://hsvbg.org/visit/plan-your-visit/", verified_at: V, active: true,
  },
  {
    id: "venue_high_point_climbing", name: "High Point Climbing & Fitness, MidCity", short_name: "High Point Climbing",
    address: "1020 Nunnahsae, N Park Dr NW, Huntsville, AL 35806", type: "studio", is_public: true, city: "Huntsville",
    lat: 34.76, lng: -86.589, indoor: true, cost_per_person: 18, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["climbing"],
    hours_note: "Official page lists Sunday 10 AM to 8 PM. Day pass price is not shown online (a 2019 review listed $17.50 plus gear).",
    parking: null, meet_note: "Meet at the front desk.", accessibility: null,
    source_url: "https://www.highpointclimbing.com/huntsville/mid-city", verified_at: V, active: true,
  },
  {
    id: "venue_dublin_park", name: "Dublin Park (Madison)", short_name: "Dublin Park",
    address: "8324 Old Madison Pike, Madison, AL 35758", type: "park", is_public: true, city: "Madison",
    lat: 34.707, lng: -86.734, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["disc_golf", "soccer", "running"],
    hours_note: null, parking: null, meet_note: "Meet at the park building lot.", accessibility: null,
    source_url: "https://discgolfcourses.com/Course/1093/Dublin-Park", verified_at: V, active: true,
  },
  {
    id: "venue_creekwood_park", name: "Creekwood Park (Indian Creek Greenway)", short_name: "Creekwood Park",
    address: "360 Harvestwood Ct, Madison, AL 35758", type: "trail", is_public: true, city: "Madison",
    lat: 34.736, lng: -86.705, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["running", "hiking"],
    hours_note: null, parking: "Lot at the park.", meet_note: "Meet at the greenway trailhead.", accessibility: null,
    source_url: "https://www.traillink.com/trail/indian-creek-greenway-(al)", verified_at: V, active: true,
  },
  {
    id: "venue_wheeler_refuge", name: "Wheeler National Wildlife Refuge Visitor Center", short_name: "Wheeler Refuge",
    address: "3121 Visitor Center Rd, Decatur, AL 35603", type: "trail", is_public: true, city: "Decatur",
    lat: 34.53, lng: -86.95, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["photography", "hiking"],
    hours_note: "Visitor center is open daily 9 AM to 5 PM November to February. A waterfowl sanctuary closes part of the refuge from Nov 15, 2026.",
    parking: null, meet_note: "Meet at the visitor center.", accessibility: null,
    source_url: "https://fws.gov/refuge/wheeler/visit-us", verified_at: V, active: true,
  },
  // ── Not confirmed: kept in the list but never planned (active: false) ──
  {
    id: "venue_brahan_spring_park", name: "Brahan Spring Park (outdoor courts)", short_name: "Brahan Spring Park",
    address: "500 Drake Ave SW, Huntsville, AL 35805", type: "park", is_public: true, city: "Huntsville",
    lat: 34.705, lng: -86.585, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: [],
    hours_note: "The address is confirmed, but outdoor basketball courts are NOT. Used only by the park_courts demo variant after the D2 phone check.",
    parking: null, meet_note: null, accessibility: null,
    source_url: "https://www.huntsville.org/listing/brahan-spring-park/1676/", verified_at: null, active: false,
  },
  {
    id: "venue_sandra_moon", name: "Sandra Moon Community Complex", short_name: "Sandra Moon Complex",
    address: "7901 Bailey Cove Rd, Huntsville, AL 35802", type: "community_center", is_public: true, city: "Huntsville",
    lat: 34.661, lng: -86.538, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: [],
    hours_note: "Address is on the city's list, but opening status is unconfirmed (reported as nearing completion).",
    parking: null, meet_note: null, accessibility: null,
    source_url: "https://www.huntsvilleal.gov/environment/parks-recreation/recreation/recreation-centers/", verified_at: null, active: false,
  },
  {
    id: "venue_madison_library", name: "Madison Public Library", short_name: "Madison Library",
    address: "142 Plaza Blvd, Madison, AL 35758", type: "library", is_public: true, city: "Madison",
    lat: 34.699, lng: -86.748, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: [],
    hours_note: "Street number could not be confirmed against an official page.",
    parking: null, meet_note: null, accessibility: null,
    source_url: "https://hmcpl.org/madison", verified_at: null, active: false,
  },
];

/** Build-time rule (BLUEPRINT §12 U2): an active venue must carry a source and a verified date. */
export function assertVenues(venues: Venue[]): void {
  for (const v of venues) {
    if (v.active && (!v.source_url || !v.verified_at)) {
      throw new Error(`Seed: active venue "${v.id}" needs source_url and verified_at`);
    }
    if (v.active && !v.is_public) throw new Error(`Seed: active venue "${v.id}" must be public`);
  }
}
