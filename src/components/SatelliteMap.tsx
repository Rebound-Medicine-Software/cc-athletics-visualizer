import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";

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
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Initialize map when token is set
  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe',
      zoom: 2,
      center: [0, 20],
      pitch: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add atmosphere effects
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(18, 18, 18)',
        'high-color': 'rgb(36, 36, 36)',
        'horizon-blend': 0.1,
      });
    });

    // Cleanup
    return () => {
      markers.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  // Update markers based on filters
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

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
    const newMarkers: mapboxgl.Marker[] = [];
    locationGroups.forEach((tests, teamName) => {
      // For demo purposes, use approximate coordinates
      // In real implementation, you'd get these from your region data
      const coordinates = getTeamCoordinates(teamName);
      if (!coordinates) return;

      const uniqueAthletes = [...new Set(tests.map(t => t.athlete_name))];
      const testCount = tests.length;
      
      // Create marker popup content
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-sm mb-2">${teamName}</h3>
          <div class="text-xs space-y-1">
            <div><strong>Athletes:</strong> ${uniqueAthletes.length}</div>
            <div><strong>Tests:</strong> ${testCount}</div>
            <div class="max-h-20 overflow-y-auto">
              <strong>Athletes:</strong><br/>
              ${uniqueAthletes.slice(0, 5).join(', ')}
              ${uniqueAthletes.length > 5 ? '...' : ''}
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        className: 'map-popup'
      }).setHTML(popupContent);

      // Create marker with size based on data count
      const markerSize = Math.min(Math.max(testCount * 2, 20), 60);
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = '#ef4444';
      el.style.width = `${markerSize}px`;
      el.style.height = `${markerSize}px`;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [regionFilters, individualFilters, data, isTokenSet]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
    }
  };

  if (!isTokenSet) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-center">Satellite Map Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 mb-4">
            Please enter your Mapbox public token to view the satellite map.
            <br />
            Get your token from: <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">mapbox.com</a>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button 
            onClick={handleTokenSubmit}
            disabled={!mapboxToken.trim()}
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