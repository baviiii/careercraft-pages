import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, MapPin } from 'lucide-react';
import { getCountryFlag, getCountryName } from '@/lib/geoLocation';

interface SessionLocation {
  country: string | null;
  country_code: string | null;
  city: string | null;
  count: number;
}

interface SessionsMapCardProps {
  sessions: Array<{
    country: string | null;
    country_code: string | null;
    city: string | null;
  }>;
}

export function SessionsMapCard({ sessions }: SessionsMapCardProps) {
  // Group sessions by country
  const locationStats = sessions.reduce<Record<string, SessionLocation>>((acc, session) => {
    const key = session.country_code || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        country: session.country,
        country_code: session.country_code,
        city: session.city,
        count: 0,
      };
    }
    acc[key].count++;
    return acc;
  }, {});

  const sortedLocations = Object.values(locationStats).sort((a, b) => b.count - a.count);
  const uniqueCountries = new Set(sessions.map(s => s.country_code).filter(Boolean)).size;
  const uniqueCities = new Set(sessions.map(s => s.city).filter(Boolean)).size;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Session Locations
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {uniqueCountries} countries
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {sessions.length} sessions
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedLocations.length > 0 ? (
          <div className="space-y-3">
            {sortedLocations.slice(0, 6).map((location) => (
              <div
                key={location.country_code || 'unknown'}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getCountryFlag(location.country_code)}
                  </span>
                  <div>
                    <p className="font-medium text-sm">
                      {getCountryName(location.country_code)}
                    </p>
                    {location.city && (
                      <p className="text-xs text-muted-foreground">
                        Last: {location.city}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {location.count} session{location.count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No location data available</p>
            <p className="text-xs mt-1">Sessions will show location once geo-tracking is active</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
