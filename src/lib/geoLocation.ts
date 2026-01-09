// Geo-location utilities for admin dashboard

// Country flag emoji from country code
export function getCountryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

// Get location display string
export function formatLocation(city: string | null, region: string | null, country: string | null): string {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length === 0) return 'Unknown Location';
  return parts.join(', ');
}

// Get short location (city, country)
export function formatShortLocation(city: string | null, country: string | null): string {
  if (!city && !country) return 'Unknown';
  if (!city) return country || 'Unknown';
  if (!country) return city;
  return `${city}, ${country}`;
}

// IP-based geolocation lookup (client-side fallback)
export async function lookupIPLocation(ip: string): Promise<{
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  try {
    // Using ip-api.com for free geo-location (no API key required)
    // Note: Using HTTPS to avoid mixed content warnings in browsers
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.regionName,
        latitude: data.lat,
        longitude: data.lon,
      };
    }
    return null;
  } catch (error) {
    console.error('Error looking up IP location:', error);
    return null;
  }
}

// Known country codes and names for display
export const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  NZ: 'New Zealand',
  IN: 'India',
  SG: 'Singapore',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  BR: 'Brazil',
  // Add more as needed
};

export function getCountryName(countryCode: string | null): string {
  if (!countryCode) return 'Unknown';
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}
