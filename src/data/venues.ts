// [U2] Seattle venues. REAL PUBLIC PLACES ONLY (Seattle Parks and Recreation parks and community centers, the public library,
// well-known public gathering places). Entries were made on 2026-10-30 from each place's public page; hours and fees that were not
// re-checked say so (cost_unconfirmed, hours_note null) or are `active: false`. seed.ts refuses to build if an active venue lacks
// source_url or verified_at (assertVenues). Coordinates are approximate map pins, never used for routing.
// Places of worship are never starter venues (STRATEGY §7.6).
import type { Venue } from "@/lib/types";

const V = "2026-10-30";
const PARKS = "https://www.seattle.gov/parks/allparks/";
const CENTERS = "https://www.seattle.gov/parks/find/centers/";

export const VENUES: Venue[] = [
  {
    id: "venue_brahan_rec", name: "Miller Community Center", short_name: "Miller Community Center",
    address: "330 19th Ave E, Seattle, WA 98112", type: "community_center", is_public: true, city: "Seattle",
    lat: 47.6212, lng: -122.3066, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["basketball", "pickleball"],
    hours_note: "Open-gym times and any drop-in fee are not confirmed: check the Seattle Parks page or call the center.",
    parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    source_url: CENTERS + "miller-community-center",
    verified_at: V, active: true,
  },
  {
    id: "venue_showers_rec", name: "Garfield Community Center", short_name: "Garfield Community Center",
    address: "2323 E Cherry St, Seattle, WA 98122", type: "community_center", is_public: true, city: "Seattle",
    lat: 47.6078, lng: -122.3018, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["basketball", "pickleball"],
    hours_note: "Hours and any fee are not confirmed: check the Seattle Parks page.",
    parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    source_url: CENTERS + "garfield-community-center",
    verified_at: V, active: true,
  },
  {
    id: "venue_john_hunt_rec", name: "Green Lake Park (courts)", short_name: "Green Lake courts",
    address: "7201 E Green Lake Dr N, Seattle, WA 98115", type: "park", is_public: true, city: "Seattle",
    lat: 47.6797, lng: -122.3281, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["pickleball", "any"],
    hours_note: "Public park. Court availability is first come, first served.",
    parking: null, meet_note: "Meet by the courts.", accessibility: null,
    source_url: PARKS + "green-lake-park",
    verified_at: V, active: true,
  },
  {
    id: "venue_big_spring_park", name: "Gas Works Park", short_name: "Gas Works Park",
    address: "2101 N Northlake Way, Seattle, WA 98103", type: "park", is_public: true, city: "Seattle",
    lat: 47.6456, lng: -122.3344, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["running", "photography", "books", "any"],
    hours_note: "Public park.", parking: null, meet_note: "Meet at the main entrance.", accessibility: null,
    source_url: PARKS + "gas-works-park", verified_at: V, active: true,
  },
  {
    id: "venue_monte_sano_bankhead", name: "Discovery Park, Visitor Center", short_name: "Discovery Park",
    address: "3801 Discovery Park Blvd, Seattle, WA 98199", type: "trail", is_public: true, city: "Seattle",
    lat: 47.6573, lng: -122.4061, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "photography", "volunteering"],
    hours_note: null, parking: "Parking fills up on weekends. Come early.", meet_note: "Meet at the visitor center.", accessibility: null,
    source_url: PARKS + "discovery-park", verified_at: V, active: true,
  },
  {
    id: "venue_monte_sano_cold_springs", name: "Carkeek Park", short_name: "Carkeek Park",
    address: "950 NW Carkeek Park Rd, Seattle, WA 98177", type: "trail", is_public: true, city: "Seattle",
    lat: 47.7113, lng: -122.3777, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "volunteering"],
    hours_note: null, parking: null, meet_note: "Meet at the main parking lot.", accessibility: null,
    source_url: PARKS + "carkeek-park", verified_at: V, active: true,
  },
  {
    id: "venue_hays_preserve", name: "Seward Park", short_name: "Seward Park",
    address: "5902 Lake Washington Blvd S, Seattle, WA 98118", type: "trail", is_public: true, city: "Seattle",
    lat: 47.5507, lng: -122.2508, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["hiking", "running", "photography"],
    hours_note: null, parking: null, meet_note: "Meet at the main parking area.", accessibility: null,
    source_url: PARKS + "seward-park", verified_at: V, active: true,
  },
  {
    id: "venue_hmcpl_main", name: "Seattle Public Library, Central Library", short_name: "Downtown library",
    address: "1000 4th Ave, Seattle, WA 98104", type: "library", is_public: true, city: "Seattle",
    lat: 47.6067, lng: -122.3325, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: ["books", "board_games", "music_making", "any"],
    hours_note: "Hours change: check spl.org. Meeting rooms are booked separately.", parking: null, meet_note: "Meet in the lobby.", accessibility: null,
    source_url: "https://www.spl.org/hours-and-locations/central-library", verified_at: V, active: true,
  },
  {
    id: "venue_lowe_mill", name: "Seattle Center Armory", short_name: "Center Armory",
    address: "305 Harrison St, Seattle, WA 98109", type: "community_center", is_public: true, city: "Seattle",
    lat: 47.6209, lng: -122.3519, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["art", "guitar", "music_making", "photography"],
    hours_note: "Public indoor space at Seattle Center. Hours vary with events: check seattlecenter.com.",
    parking: null, meet_note: "Meet at the main entrance.", accessibility: null,
    source_url: "https://www.seattlecenter.com/", verified_at: V, active: true,
  },
  {
    id: "venue_lucky_dice", name: "Raygun Lounge", short_name: "Raygun Lounge",
    address: "501 E Pine St, Seattle, WA 98122", type: "cafe", is_public: true, city: "Seattle",
    lat: 47.6153, lng: -122.3267, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["board_games"],
    hours_note: "Hours not confirmed. The lounge has a bar, so Pods only plans daytime visits here.", parking: null, meet_note: "Meet inside the front door.", accessibility: null,
    source_url: "https://www.raygunlounge.com/", verified_at: V, active: true,
  },
  {
    id: "venue_honest_coffee", name: "Victrola Coffee Roasters (Capitol Hill)", short_name: "Victrola Coffee",
    address: "411 15th Ave E, Seattle, WA 98112", type: "cafe", is_public: true, city: "Seattle",
    lat: 47.6226, lng: -122.3118, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: ["books", "any"],
    hours_note: "Hours not confirmed: check before you go.", parking: null,
    meet_note: "Meet inside. Buy your own drink if you want one.", accessibility: null,
    source_url: "https://www.victrolacoffee.com/", verified_at: V, active: true,
  },
  {
    id: "venue_botanical_garden", name: "Seattle Japanese Garden", short_name: "Japanese Garden",
    address: "1075 Lake Washington Blvd E, Seattle, WA 98112", type: "park", is_public: true, city: "Seattle",
    lat: 47.6317, lng: -122.2956, indoor: false, cost_per_person: 17, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["photography", "art"],
    hours_note: null, parking: null, meet_note: "Meet at the entrance.", accessibility: null,
    // Admission is charged and the current price was not confirmed; a high figure is used so the planner treats it as over budget until confirmed.
    source_url: "https://www.seattlejapanesegarden.org/", verified_at: V, active: true,
  },
  {
    id: "venue_high_point_climbing", name: "Vertical World (Interbay)", short_name: "Vertical World",
    address: "2123 W Elmore St, Seattle, WA 98199", type: "studio", is_public: true, city: "Seattle",
    lat: 47.6406, lng: -122.3830, indoor: true, cost_per_person: 18, cost_unconfirmed: true, alcohol_centered: false,
    good_for: ["climbing"],
    hours_note: "Day pass price and hours are not confirmed: check the gym's page.",
    parking: null, meet_note: "Meet at the front desk.", accessibility: null,
    source_url: "https://www.verticalworld.com/", verified_at: V, active: true,
  },
  {
    id: "venue_dublin_park", name: "Magnuson Park", short_name: "Magnuson Park",
    address: "7400 Sand Point Way NE, Seattle, WA 98115", type: "park", is_public: true, city: "Seattle",
    lat: 47.6807, lng: -122.2592, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["disc_golf", "soccer", "running"],
    hours_note: null, parking: null, meet_note: "Meet at the main parking lot.", accessibility: null,
    source_url: PARKS + "magnuson-park", verified_at: V, active: true,
  },
  {
    id: "venue_creekwood_park", name: "Burke-Gilman Trail (Matthews Beach)", short_name: "Matthews Beach",
    address: "9300 51st Ave NE, Seattle, WA 98115", type: "trail", is_public: true, city: "Seattle",
    lat: 47.6930, lng: -122.2749, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["running", "hiking"],
    hours_note: null, parking: "Lot at the park.", meet_note: "Meet at the trailhead.", accessibility: null,
    source_url: PARKS + "matthews-beach-park", verified_at: V, active: true,
  },
  {
    id: "venue_wheeler_refuge", name: "Washington Park Arboretum, Graham Visitors Center", short_name: "Arboretum",
    address: "2300 Arboretum Dr E, Seattle, WA 98112", type: "trail", is_public: true, city: "Seattle",
    lat: 47.6395, lng: -122.2951, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["photography", "hiking"],
    hours_note: null,
    parking: null, meet_note: "Meet at the visitors center.", accessibility: null,
    source_url: "https://botanicgardens.uw.edu/washington-park-arboretum/", verified_at: V, active: true,
  },
  // ── Not confirmed: kept in the list but never planned (active: false) ──
  {
    // Demo default (video script, Scene 5): Saturday pickup on the outdoor courts, Miller Community Center next door as the rain plan.
    id: "venue_brahan_spring_park", name: "Miller Playfield", short_name: "Miller Playfield",
    address: "400 19th Ave E, Seattle, WA 98112", type: "park", is_public: true, city: "Seattle",
    lat: 47.6218, lng: -122.3079, indoor: false, cost_per_person: 0, alcohol_centered: false,
    good_for: ["basketball"],
    hours_note: "Outdoor courts. If it rains, the run moves next door to Miller Community Center.",
    parking: null, meet_note: "Meet at the courts.", accessibility: null,
    source_url: PARKS + "miller-playfield", verified_at: V, active: true,
  },
  {
    id: "venue_sandra_moon", name: "Delridge Community Center", short_name: "Delridge Community Center",
    address: "4501 Delridge Way SW, Seattle, WA 98106", type: "community_center", is_public: true, city: "Seattle",
    lat: 47.5614, lng: -122.3633, indoor: true, cost_per_person: 0, cost_unconfirmed: true, alcohol_centered: false,
    good_for: [],
    hours_note: "Not yet checked against the city's current page.",
    parking: null, meet_note: null, accessibility: null,
    source_url: CENTERS + "delridge-community-center", verified_at: null, active: false,
  },
  {
    id: "venue_madison_library", name: "Capitol Hill Library", short_name: "Capitol Hill Library",
    address: "425 Harvard Ave E, Seattle, WA 98102", type: "library", is_public: true, city: "Seattle",
    lat: 47.6226, lng: -122.3213, indoor: true, cost_per_person: 0, alcohol_centered: false,
    good_for: [],
    hours_note: "Not yet checked against the library's current page.",
    parking: null, meet_note: null, accessibility: null,
    source_url: "https://www.spl.org/hours-and-locations/capitol-hill-branch", verified_at: null, active: false,
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
