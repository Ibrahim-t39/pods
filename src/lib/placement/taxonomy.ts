// [U3] Group ladders for placement (ARCHITECTURE §9.1 step 5.2). Heritage: country -> region -> continent.
// Faith: denomination -> tradition -> religion. Interests never widen by group.
// NOTE(U3): U2 may ship src/data/taxonomy.ts with the full picker list. The engine takes a Taxonomy as an option and
// defaults to this one, so the two only need to agree on keys (lowercase) and on the parent chain.
export type TaxKind = "heritage" | "faith";

export interface TaxNode {
  key: string; // lowercase, e.g. "zm", "southern_african", "sda"
  /** Singular noun used in copy: "Zambian", "Southern African", "Seventh-day Adventist". */
  label: string;
  /** Plural noun: "Zambians". */
  plural: string;
  /** Place or community phrase for body copy: "Zambia", "Southern Africa". */
  place: string;
  parent: string | null;
  level: "country" | "region" | "continent" | "denomination" | "tradition" | "religion";
}

export interface Taxonomy {
  heritage: Record<string, TaxNode>;
  faith: Record<string, TaxNode>;
}

type Row = [key: string, label: string, plural: string, place: string, parent: string | null, level: TaxNode["level"]];

function build(rows: Row[]): Record<string, TaxNode> {
  const out: Record<string, TaxNode> = {};
  for (const [key, label, plural, place, parent, level] of rows) out[key] = { key, label, plural, place, parent, level };
  return out;
}

const C = "country" as const;
const R = "region" as const;
const K = "continent" as const;

export const DEFAULT_TAXONOMY: Taxonomy = {
  heritage: build([
    ["african", "African", "Africans", "Africa", null, K],
    ["southern_african", "Southern African", "Southern Africans", "Southern Africa", "african", R],
    ["west_african", "West African", "West Africans", "West Africa", "african", R],
    ["east_african", "East African", "East Africans", "East Africa", "african", R],
    ["central_african", "Central African", "Central Africans", "Central Africa", "african", R],
    ["north_african", "North African", "North Africans", "North Africa", "african", R],
    ["zm", "Zambian", "Zambians", "Zambia", "southern_african", C],
    ["zw", "Zimbabwean", "Zimbabweans", "Zimbabwe", "southern_african", C],
    ["bw", "Botswanan", "Botswanans", "Botswana", "southern_african", C],
    ["mw", "Malawian", "Malawians", "Malawi", "southern_african", C],
    ["mz", "Mozambican", "Mozambicans", "Mozambique", "southern_african", C],
    ["na", "Namibian", "Namibians", "Namibia", "southern_african", C],
    ["za", "South African", "South Africans", "South Africa", "southern_african", C],
    ["ng", "Nigerian", "Nigerians", "Nigeria", "west_african", C],
    ["gh", "Ghanaian", "Ghanaians", "Ghana", "west_african", C],
    ["sn", "Senegalese", "Senegalese", "Senegal", "west_african", C],
    ["ci", "Ivorian", "Ivorians", "Cote d'Ivoire", "west_african", C],
    ["sl", "Sierra Leonean", "Sierra Leoneans", "Sierra Leone", "west_african", C],
    ["lr", "Liberian", "Liberians", "Liberia", "west_african", C],
    ["ke", "Kenyan", "Kenyans", "Kenya", "east_african", C],
    ["et", "Ethiopian", "Ethiopians", "Ethiopia", "east_african", C],
    ["ug", "Ugandan", "Ugandans", "Uganda", "east_african", C],
    ["tz", "Tanzanian", "Tanzanians", "Tanzania", "east_african", C],
    ["cm", "Cameroonian", "Cameroonians", "Cameroon", "central_african", C],
    ["cd", "Congolese", "Congolese", "DR Congo", "central_african", C],
    ["eg", "Egyptian", "Egyptians", "Egypt", "north_african", C],
    ["ma", "Moroccan", "Moroccans", "Morocco", "north_african", C],
    ["americas", "Caribbean and Latin American", "Caribbean and Latin Americans", "the Caribbean and Latin America", null, K],
    ["caribbean", "Caribbean", "Caribbeans", "the Caribbean", "americas", R],
    ["jm", "Jamaican", "Jamaicans", "Jamaica", "caribbean", C],
    ["ht", "Haitian", "Haitians", "Haiti", "caribbean", C],
    ["tt", "Trinidadian", "Trinidadians", "Trinidad and Tobago", "caribbean", C],
    ["mx", "Mexican", "Mexicans", "Mexico", "americas", C],
  ]),
  faith: build([
    ["christian", "Christian", "Christians", "the Christian community", null, "religion"],
    ["protestant", "Protestant Christian", "Protestant Christians", "the Protestant community", "christian", "tradition"],
    ["catholic", "Catholic", "Catholics", "the Catholic community", "christian", "tradition"],
    ["orthodox", "Orthodox Christian", "Orthodox Christians", "the Orthodox community", "christian", "tradition"],
    ["sda", "Seventh-day Adventist", "Seventh-day Adventists", "the Adventist community", "protestant", "denomination"],
    ["baptist", "Baptist", "Baptists", "the Baptist community", "protestant", "denomination"],
    ["pentecostal", "Pentecostal", "Pentecostals", "the Pentecostal community", "protestant", "denomination"],
    ["methodist", "Methodist", "Methodists", "the Methodist community", "protestant", "denomination"],
    ["ame", "African Methodist Episcopal", "African Methodist Episcopal members", "the AME community", "protestant", "denomination"],
    ["nondenominational", "Non-denominational Christian", "Non-denominational Christians", "the non-denominational community", "protestant", "denomination"],
    ["islam", "Muslim", "Muslims", "the Muslim community", null, "religion"],
    ["sunni", "Sunni Muslim", "Sunni Muslims", "the Sunni community", "islam", "tradition"],
    ["shia", "Shia Muslim", "Shia Muslims", "the Shia community", "islam", "tradition"],
    ["judaism", "Jewish", "Jewish people", "the Jewish community", null, "religion"],
    ["hindu", "Hindu", "Hindus", "the Hindu community", null, "religion"],
    ["buddhist", "Buddhist", "Buddhists", "the Buddhist community", null, "religion"],
  ]),
};
