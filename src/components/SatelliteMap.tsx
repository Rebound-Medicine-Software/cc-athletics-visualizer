import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface SatelliteMapProps {
  regionFilters: {
    country: string[];
    region: string[];
    address: string[];
    teamName: string[];
  };
  individualFilters: {
    athleteName: string[];
    sex: string;
    testName: string;
    metricType: string;
  };
  data: TestData[];
  regionData?: {
    countries: string[];
    regions: string[];
    addresses: string[];
    teamNames: string[];
  };
}

export const SatelliteMap = ({ 
  regionFilters, 
  individualFilters, 
  data,
  regionData 
}: SatelliteMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindows, setInfoWindows] = useState<google.maps.InfoWindow[]>([]);

  // Initialize map when API key is set
  useEffect(() => {
    if (!mapContainer.current || !isApiKeySet || !googleMapsApiKey) return;

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
    });

    loader.load().then(() => {
      if (!mapContainer.current) return;

      map.current = new google.maps.Map(mapContainer.current, {
        zoom: 2,
        center: { lat: 20, lng: 0 },
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });

    // Cleanup
    return () => {
      markers.forEach(marker => marker.setMap(null));
      infoWindows.forEach(infoWindow => infoWindow.close());
    };
  }, [isApiKeySet, googleMapsApiKey]);

  // Update markers based on filters
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and info windows
    markers.forEach(marker => marker.setMap(null));
    infoWindows.forEach(infoWindow => infoWindow.close());
    setMarkers([]);
    setInfoWindows([]);

    // Filter data based on region filters
    let filteredData = data;
    
    // Apply individual filters first
    if (individualFilters.athleteName.length > 0) {
      filteredData = filteredData.filter(d => 
        individualFilters.athleteName.includes(d.athlete_name)
      );
    }
    
    if (individualFilters.testName && individualFilters.testName !== 'all') {
      filteredData = filteredData.filter(d => d.test_name === individualFilters.testName);
    }

    // Apply region filters
    if (regionFilters.teamName.length > 0) {
      filteredData = filteredData.filter(d => 
        regionFilters.teamName.includes(d.team_name)
      );
    }

    // Group by team/location for marker placement
    const locationGroups = new Map<string, TestData[]>();
    filteredData.forEach(item => {
      const key = `${item.team_name}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)!.push(item);
    });

    // Create markers for each location group
    const newMarkers: google.maps.Marker[] = [];
    const newInfoWindows: google.maps.InfoWindow[] = [];
    
    locationGroups.forEach((tests, teamName) => {
      const coordinates = getTeamCoordinates(teamName);
      if (!coordinates) return;

      const uniqueAthletes = [...new Set(tests.map(t => t.athlete_name))];
      const testCount = tests.length;
      
      // Create info window content
      const infoWindowContent = `
        <div style="padding: 8px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${teamName}</h3>
          <div style="font-size: 12px;">
            <div style="margin-bottom: 4px;"><strong>Athletes:</strong> ${uniqueAthletes.length}</div>
            <div style="margin-bottom: 4px;"><strong>Tests:</strong> ${testCount}</div>
            <div style="max-height: 80px; overflow-y: auto;">
              <strong>Athletes:</strong><br/>
              ${uniqueAthletes.slice(0, 5).join(', ')}
              ${uniqueAthletes.length > 5 ? '...' : ''}
            </div>
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
      });

      // Create marker with custom icon based on data count
      const markerSize = Math.min(Math.max(testCount * 2, 20), 60);
      const marker = new google.maps.Marker({
        position: { lat: coordinates[1], lng: coordinates[0] },
        map: map.current,
        title: teamName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: markerSize / 4,
          fillColor: '#ef4444',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        // Close all other info windows
        newInfoWindows.forEach(iw => iw.close());
        infoWindow.open(map.current!, marker);
      });

      newMarkers.push(marker);
      newInfoWindows.push(infoWindow);
    });

    setMarkers(newMarkers);
    setInfoWindows(newInfoWindows);
  }, [regionFilters, individualFilters, data, isApiKeySet]);

  const handleApiKeySubmit = () => {
    if (googleMapsApiKey.trim()) {
      setIsApiKeySet(true);
    }
  };

  if (!isApiKeySet) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-center">Google Maps Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 mb-4">
            Please enter your Google Maps API key to view the satellite map.
            <br />
            Get your API key from: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-maps-api-key">Google Maps API Key</Label>
            <Input
              id="google-maps-api-key"
              type="text"
              placeholder="AIzaSyB..."
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button 
            onClick={handleApiKeySubmit}
            disabled={!googleMapsApiKey.trim()}
            className="w-full"
          >
            Initialize Map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 relative">
      <div ref={mapContainer} className="h-96 w-full rounded-lg shadow-lg" />
      <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        Locations based on Region Filters | Data from Individual Filters
      </div>
    </div>
  );
};

// Helper function to get approximate coordinates for teams
// In a real implementation, this would come from your database
function getTeamCoordinates(teamName: string): [number, number] | null {
  const coordinatesMap: Record<string, [number, number]> = {
    // Sample coordinates - replace with real data
    'Team USA': [-98, 39],
    'Team Canada': [-106, 56],
    'Team UK': [-3, 55],
    'Team Australia': [133, -27],
    'Team Germany': [10, 51],
    'Team France': [2, 46],
    'Team Italy': [12, 42],
    'Team Spain': [-4, 40],
    'Team Brazil': [-55, -10],
    'Team Japan': [138, 36],
    'Team South Korea': [128, 36],
    'Team China': [104, 35],
    'Team India': [78, 20],
    'Team South Africa': [24, -29],
    'Team Mexico': [-102, 23],
    'Team Argentina': [-64, -34],
    'Team Russia': [105, 61],
    'Team Sweden': [18, 60],
    'Team Norway': [10, 64],
    'Team Finland': [25, 64],
  };

  // Try exact match first
  if (coordinatesMap[teamName]) {
    return coordinatesMap[teamName];
  }

  // Try partial match
  const lowerTeamName = teamName.toLowerCase();
  for (const [key, coords] of Object.entries(coordinatesMap)) {
    if (key.toLowerCase().includes(lowerTeamName) || lowerTeamName.includes(key.toLowerCase())) {
      return coords;
    }
  }

  // Default to random location if no match found
  return [Math.random() * 360 - 180, Math.random() * 120 - 60];
}