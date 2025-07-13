import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";
import { useRegionData } from "@/hooks/useRegionData";

// Fix Leaflet default markers
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const map = useRef<L.Map | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const { data: regionTestingData } = useRegionData();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create map centered on UK
    map.current = L.map(mapContainer.current).setView([54.5, -4.5], 6);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map.current);

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers based on filters and data
  useEffect(() => {
    if (!map.current || !regionTestingData) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    // Filter region data based on region filters
    let filteredRegionData = regionTestingData;
    
    if (regionFilters.teamName.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        regionFilters.teamName.includes(region["Team Name"])
      );
    }
    
    if (regionFilters.country.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        regionFilters.country.includes(region.Country)
      );
    }
    
    if (regionFilters.region.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        region.Region && regionFilters.region.includes(region.Region)
      );
    }

    // Create markers for each filtered region
    const newMarkers: L.Marker[] = [];
    const bounds = L.latLngBounds([]);

    filteredRegionData.forEach((regionItem) => {
      const coordinates = getTeamCoordinates(regionItem["Team Name"]);
      if (!coordinates) return;

      // Filter test data for this team based on individual filters
      let teamTestData = data.filter(testData => testData.team_name === regionItem["Team Name"]);
      
      if (individualFilters.athleteName.length > 0) {
        teamTestData = teamTestData.filter(testData => 
          individualFilters.athleteName.includes(testData.athlete_name)
        );
      }
      
      if (individualFilters.testName && individualFilters.testName !== 'all') {
        teamTestData = teamTestData.filter(testData => testData.test_name === individualFilters.testName);
      }

      // Skip if no data after filtering
      if (teamTestData.length === 0) return;

      const [lng, lat] = coordinates;
      const position = L.latLng(lat, lng);
      bounds.extend(position);

      // Create custom colored icon based on team
      const teamColor = getTeamColor(regionItem["Team Name"]);
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${teamColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(position, { icon: customIcon });

      // Create popup content with athlete data
      const popupContent = createPopupContent(regionItem, teamTestData, individualFilters.metricType);
      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.addTo(map.current!);
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers, or center on UK if no markers
    if (newMarkers.length > 0) {
      map.current.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.current.setView([54.5, -4.5], 6);
    }
  }, [regionFilters, individualFilters, data, regionTestingData]);

  return (
    <div className="mt-6 relative">
      <div ref={mapContainer} className="h-96 w-full rounded-lg shadow-lg" />
      <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        OpenStreetMap | Filtered by Region & Individual Filters
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

// Helper function to get team colors based on team name
function getTeamColor(teamName: string): string {
  const teamColors: Record<string, string> = {
    'Team USA': '#FF0000',
    'Team Canada': '#FF0000',
    'Team UK': '#0066CC',
    'Team Australia': '#FFAA00',
    'Team Germany': '#000000',
    'Team France': '#0055AA',
    'Team Italy': '#009900',
    'Team Spain': '#FFAA00',
    'Team Brazil': '#00AA00',
    'Team Japan': '#CC0000',
    'Team South Korea': '#CC0000',
    'Team China': '#CC0000',
    'Team India': '#FF6600',
    'Team South Africa': '#00AA00',
    'Team Mexico': '#00AA00',
    'Team Argentina': '#66CCFF',
    'Team Russia': '#CC0000',
    'Team Sweden': '#FFCC00',
    'Team Norway': '#CC0000',
    'Team Finland': '#0066CC',
  };

  return teamColors[teamName] || '#666666';
}

// Helper function to create popup content with athlete data
function createPopupContent(regionItem: any, teamTestData: TestData[], selectedMetricType: string): string {
  const teamName = regionItem["Team Name"];
  const country = regionItem.Country;
  const region = regionItem.Region;
  const address = regionItem.Address;

  // Group data by athlete
  const athleteData = new Map<string, TestData[]>();
  teamTestData.forEach(test => {
    if (!athleteData.has(test.athlete_name)) {
      athleteData.set(test.athlete_name, []);
    }
    athleteData.get(test.athlete_name)!.push(test);
  });

  let athleteHtml = '';
  athleteData.forEach((tests, athleteName) => {
    // Get the selected metric type value if specified
    let metricValue = 'N/A';
    if (selectedMetricType && selectedMetricType !== 'all') {
      const testWithMetric = tests.find(test => {
        const metrics = typeof test.metrics === 'string' ? JSON.parse(test.metrics) : test.metrics;
        return metrics && metrics[selectedMetricType] !== undefined;
      });
      
      if (testWithMetric) {
        const metrics = typeof testWithMetric.metrics === 'string' ? JSON.parse(testWithMetric.metrics) : testWithMetric.metrics;
        metricValue = metrics[selectedMetricType]?.toFixed(2) || 'N/A';
      }
    }

    athleteHtml += `
      <div style="margin-bottom: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;">
        <div><strong>Athlete:</strong> ${athleteName}</div>
        ${selectedMetricType && selectedMetricType !== 'all' ? 
          `<div><strong>${selectedMetricType}:</strong> ${metricValue}</div>` : 
          `<div><strong>Tests:</strong> ${tests.length}</div>`
        }
      </div>
    `;
  });

  return `
    <div style="padding: 8px; font-family: Arial, sans-serif; max-width: 250px;">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px; color: #333;">${teamName}</h3>
      <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
        <div><strong>Country:</strong> ${country}</div>
        ${region ? `<div><strong>Region:</strong> ${region}</div>` : ''}
        ${address ? `<div><strong>Address:</strong> ${address}</div>` : ''}
      </div>
      <div style="max-height: 120px; overflow-y: auto; font-size: 11px;">
        ${athleteHtml}
      </div>
      <div style="font-size: 10px; color: #999; margin-top: 8px; text-align: center;">
        Total Athletes: ${athleteData.size} | Total Tests: ${teamTestData.length}
      </div>
    </div>
  `;
}