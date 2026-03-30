
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
    metricType: string;
  };
  individualFilters: {
    teamName: string[];
    sex: string;
    athleteName: string[];
    testName: string;
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

    // Filter region data based on region filters ONLY
    let filteredRegionData = regionTestingData;
    
    if (regionFilters.country.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        regionFilters.country.includes(region.country)
      );
    }
    
    if (regionFilters.region.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        region.region && regionFilters.region.includes(region.region)
      );
    }
    
    if (regionFilters.address.length > 0) {
      filteredRegionData = filteredRegionData.filter(region => 
        region.address && regionFilters.address.includes(region.address)
      );
    }

    // Create markers for each filtered region
    const newMarkers: L.Marker[] = [];
    const bounds = L.latLngBounds([]);

    filteredRegionData.forEach((regionItem) => {
      const coordinates = getTeamCoordinates(regionItem["Team Name"], regionItem.country, regionItem.region);
      if (!coordinates) return;

      // Get test data for this team (may be empty - that's OK, still show the marker)
      let teamTestData = data.filter(testData => testData.team_name === regionItem["Team Name"]);

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
      const popupContent = createPopupContent(regionItem, teamTestData, regionFilters.metricType);
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
  }, [regionFilters, data, regionTestingData]);

  return (
    <div className="mt-6 relative">
      <div ref={mapContainer} className="h-96 w-full rounded-lg shadow-lg" />
      <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        OpenStreetMap | Filtered by Region & Individual Filters
      </div>
    </div>
  );
};

// Helper function to get coordinates for teams based on region data
function getTeamCoordinates(teamName: string, country: string, region?: string): [number, number] | null {
  // More accurate coordinates based on actual location data
  const locationMap: Record<string, [number, number]> = {
    // Wales teams
    'Two4 Martial Arts': [-3.9436, 51.6214], // Swansea
    'Evolve Physiotherapy': [-3.9436, 51.6214], // Swansea
    'Joshua Athletic': [-4.0237, 51.7130], // Pontarddulais
    'Evolve Physiotherapy (Non-Consenting)': [-3.9436, 51.6214], // Swansea
    'Chris Rees Academy': [-3.9436, 51.6214], // Swansea
    'Leon Welch Academy': [-3.9436, 51.6214], // Swansea
    'Llanelli Town Academy AFC': [-4.1619, 51.6823], // Llanelli
    
    // England teams
    'Manchester United': [-2.2931, 53.4631], // Manchester
    
    // Scotland teams
    'Tom Stoltman': [-4.2026, 57.6920], // Alness
    
    // Northern Ireland teams
    'Conor McGregor': [-6.2603, 53.3498], // Dublin (should be Ireland)
    
    // Ireland teams
    'Ian Garry': [-8.4863, 51.8979], // Cork
  };

  // Try exact team name match first
  if (locationMap[teamName]) {
    return locationMap[teamName];
  }

  // Fallback to country/region-based coordinates
  const countryCoordinates: Record<string, [number, number]> = {
    'Wales': [-3.7837, 52.1307],
    'England': [-1.1743, 52.3555],
    'Scotland': [-4.2026, 56.4907],
    'Northern Ireland': [-5.9301, 54.7877],
    'Ireland': [-8.2439, 53.4129],
  };

  // Regional coordinates within countries
  const regionCoordinates: Record<string, [number, number]> = {
    'Swansea': [-3.9436, 51.6214],
    'Llanelli': [-4.1619, 51.6823],
    'Manchester': [-2.2931, 53.4631],
    'Alness': [-4.2026, 57.6920],
    'Dublin': [-6.2603, 53.3498],
    'Cork': [-8.4863, 51.8979],
  };

  // Try region-based coordinates
  if (region && regionCoordinates[region]) {
    return regionCoordinates[region];
  }

  // Try country-based coordinates
  if (countryCoordinates[country]) {
    return countryCoordinates[country];
  }

  // Default fallback
  return [-3.7837, 52.1307]; // Wales center
}

// Helper function to get team colors based on team name
function getTeamColor(teamName: string): string {
  const teamColors: Record<string, string> = {
    'Two4 Martial Arts': '#FF6B6B',
    'Evolve Physiotherapy': '#4ECDC4',
    'Joshua Athletic': '#45B7D1',
    'Evolve Physiotherapy (Non-Consenting)': '#96CEB4',
    'Chris Rees Academy': '#FECA57',
    'Leon Welch Academy': '#FF9FF3',
    'Llanelli Town Academy AFC': '#54A0FF',
    'Manchester United': '#DC143C',
    'Tom Stoltman': '#00D2D3',
    'Conor McGregor': '#FF6348',
    'Ian Garry': '#2ED573',
  };

  return teamColors[teamName] || '#666666';
}

// Helper function to create popup content with athlete data
function createPopupContent(regionItem: any, teamTestData: TestData[], selectedMetricType: string): string {
  const teamName = regionItem["Team Name"];
  const country = regionItem.country;
  const region = regionItem.region;
  const address = regionItem.address;

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
    const testCount = tests.length;
    
    // Get the selected metric type value and best value if specified
    let metricValue = 'N/A';
    let bestValue = 'N/A';
    let metricDisplayName = selectedMetricType || 'Peak Force';
    
    if (selectedMetricType && selectedMetricType !== 'all') {
      const allMetricValues: number[] = [];
      
      tests.forEach(test => {
        const metrics = typeof test.metrics === 'string' ? JSON.parse(test.metrics) : test.metrics;
        if (metrics) {
          let value = 0;
          
          switch (selectedMetricType) {
            case "Jump Height (cm)":
            case "Jump Height (Pogo)":
              value = metrics.jump_height_ft ? metrics.jump_height_ft * 30.48 : 
                     metrics.jump_height || metrics.avg_jump_height || 0;
              break;
            case "Peak Power":
              value = metrics.peak_power || 0;
              break;
            case "Relative Peak Power":
              const peakPower = metrics.peak_power || 0;
              const bodyMass = metrics.body_mass || 0;
              value = bodyMass > 0 ? peakPower / bodyMass : 0;
              break;
            case "Contact Time":
              value = metrics.contact_time || metrics.avg_contact_time || 0;
              break;
            case "Reactive Strength Index":
              value = metrics.rsi || metrics.avg_rsi || 0;
              break;
            case "Flight Time":
              value = metrics.flight_time || metrics.avg_flight_time || 0;
              break;
            case "Take-off Velocity":
              value = metrics.takeoff_velocity || metrics.peak_velocity || 0;
              break;
            case "Average Rate of Force Development":
              value = metrics.avg_rfd || metrics.rfd_max || 0;
              break;
            case "Average Propulsive Power":
              value = metrics.avg_propulsive_power || metrics.avg_power || 0;
              break;
            case "Power":
              value = metrics.power || metrics.avg_power || 0;
              break;
            case "Maximum Rate of Force Development":
              value = metrics.rfd_max || metrics.avg_rfd || 0;
              break;
            case "Force at Max Rate of Force Development":
              value = metrics.force_150ms || metrics.force_100ms || metrics.force_50ms || metrics.force_peak || 0;
              break;
            case "Peak Force":
              value = metrics.peak_force || metrics.force_peak || 0;
              break;
            case "Early Explosive Power":
              value = metrics.force_50ms || 0;
              break;
            default:
              value = metrics.peak_force || metrics.force_peak || 0;
          }
          
          if (value > 0) {
            allMetricValues.push(value);
          }
        }
      });
      
      if (allMetricValues.length > 0) {
        // Get the most recent value (last test)
        metricValue = allMetricValues[allMetricValues.length - 1].toFixed(2);
        // Get the best (highest) value
        bestValue = Math.max(...allMetricValues).toFixed(2);
      }
    }

    athleteHtml += `
      <div style="margin-bottom: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;">
        <div><strong>Athlete:</strong> ${athleteName}</div>
        <div><strong>Tests:</strong> ${testCount}</div>
        ${selectedMetricType && selectedMetricType !== 'all' ? 
          `<div><strong>${metricDisplayName}:</strong> ${metricValue}</div>
           <div><strong>Best ${metricDisplayName}:</strong> ${bestValue}</div>` : 
          ''
        }
      </div>
    `;
  });

  return `
    <div style="padding: 8px; font-family: Arial, sans-serif; max-width: 280px;">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px; color: #333;">${teamName}</h3>
      <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
        <div><strong>Country:</strong> ${country}</div>
        ${region ? `<div><strong>Region:</strong> ${region}</div>` : ''}
        ${address ? `<div><strong>Address:</strong> ${address}</div>` : ''}
      </div>
      <div style="max-height: 160px; overflow-y: auto; font-size: 11px;">
        ${athleteHtml}
      </div>
      <div style="font-size: 10px; color: #999; margin-top: 8px; text-align: center;">
        Total Athletes: ${athleteData.size} | Total Tests: ${teamTestData.length}
      </div>
    </div>
  `;
}
