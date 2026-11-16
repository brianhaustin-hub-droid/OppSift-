export type SupportedCountry = {
  code: string;
  name: string;
  region: string;
  regionCode:
    | "africa"
    | "asia"
    | "europe"
    | "north_america"
    | "oceania";
};

export const supportedCountries: readonly SupportedCountry[] = [
  { code: "US", name: "United States", region: "North America", regionCode: "north_america" },
  { code: "GB", name: "United Kingdom", region: "Europe", regionCode: "europe" },
  { code: "CA", name: "Canada", region: "North America", regionCode: "north_america" },
  { code: "IN", name: "India", region: "Asia-Pacific", regionCode: "asia" },
  { code: "SG", name: "Singapore", region: "Asia-Pacific", regionCode: "asia" },
  { code: "JP", name: "Japan", region: "Asia-Pacific", regionCode: "asia" },
  { code: "KR", name: "South Korea", region: "Asia-Pacific", regionCode: "asia" },
  { code: "MY", name: "Malaysia", region: "Asia-Pacific", regionCode: "asia" },
  { code: "ID", name: "Indonesia", region: "Asia-Pacific", regionCode: "asia" },
  { code: "PH", name: "Philippines", region: "Asia-Pacific", regionCode: "asia" },
  { code: "TH", name: "Thailand", region: "Asia-Pacific", regionCode: "asia" },
  { code: "VN", name: "Vietnam", region: "Asia-Pacific", regionCode: "asia" },
  { code: "AU", name: "Australia", region: "Asia-Pacific", regionCode: "oceania" },
  { code: "DE", name: "Germany", region: "Europe", regionCode: "europe" },
  { code: "FR", name: "France", region: "Europe", regionCode: "europe" },
  { code: "NL", name: "Netherlands", region: "Europe", regionCode: "europe" },
  { code: "IE", name: "Ireland", region: "Europe", regionCode: "europe" },
  { code: "IT", name: "Italy", region: "Europe", regionCode: "europe" },
  { code: "ES", name: "Spain", region: "Europe", regionCode: "europe" },
  { code: "SE", name: "Sweden", region: "Europe", regionCode: "europe" },
  { code: "PL", name: "Poland", region: "Europe", regionCode: "europe" },
  { code: "DK", name: "Denmark", region: "Europe", regionCode: "europe" },
  { code: "BE", name: "Belgium", region: "Europe", regionCode: "europe" },
  { code: "KE", name: "Kenya", region: "East Africa", regionCode: "africa" },
  { code: "UG", name: "Uganda", region: "East Africa", regionCode: "africa" },
  { code: "TZ", name: "Tanzania", region: "East Africa", regionCode: "africa" },
  { code: "RW", name: "Rwanda", region: "East Africa", regionCode: "africa" },
  { code: "BI", name: "Burundi", region: "East Africa", regionCode: "africa" },
  { code: "ET", name: "Ethiopia", region: "East Africa", regionCode: "africa" },
  { code: "SS", name: "South Sudan", region: "East Africa", regionCode: "africa" },
  { code: "NG", name: "Nigeria", region: "West Africa", regionCode: "africa" },
  { code: "GH", name: "Ghana", region: "West Africa", regionCode: "africa" },
  { code: "LR", name: "Liberia", region: "West Africa", regionCode: "africa" },
  { code: "SL", name: "Sierra Leone", region: "West Africa", regionCode: "africa" },
  { code: "CI", name: "Côte d'Ivoire", region: "West Africa", regionCode: "africa" },
  { code: "BJ", name: "Benin", region: "West Africa", regionCode: "africa" },
  { code: "SN", name: "Senegal", region: "West Africa", regionCode: "africa" },
  { code: "GM", name: "Gambia", region: "West Africa", regionCode: "africa" },
  { code: "NE", name: "Niger", region: "West Africa", regionCode: "africa" },
  { code: "BF", name: "Burkina Faso", region: "West Africa", regionCode: "africa" },
  { code: "MU", name: "Mauritius", region: "Southern Africa", regionCode: "africa" },
  { code: "ZM", name: "Zambia", region: "Southern Africa", regionCode: "africa" },
  { code: "ZA", name: "South Africa", region: "Southern Africa", regionCode: "africa" },
  { code: "BW", name: "Botswana", region: "Southern Africa", regionCode: "africa" },
  { code: "NA", name: "Namibia", region: "Southern Africa", regionCode: "africa" },
  { code: "MG", name: "Madagascar", region: "Southern Africa", regionCode: "africa" },
  { code: "MW", name: "Malawi", region: "Southern Africa", regionCode: "africa" },
  { code: "MZ", name: "Mozambique", region: "Southern Africa", regionCode: "africa" },
  { code: "EG", name: "Egypt", region: "North Africa", regionCode: "africa" },
  { code: "MA", name: "Morocco", region: "North Africa", regionCode: "africa" },
];

export function getSupportedCountry(code: string) {
  return supportedCountries.find(
    (country) => country.code === code.toUpperCase(),
  );
}
