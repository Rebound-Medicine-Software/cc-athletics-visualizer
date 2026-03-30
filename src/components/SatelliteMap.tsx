
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TestData } from "@/types/forcePlateTypes";
import { useRegionData } from "@/hooks/useRegionData";
import { supabase } from "@/integrations/supabase/client";

// Fix Leaflet default markers
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AthleteInfo {
  name: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  avatar_url?: string;
}

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
  const [athletesByTeam, setAthletesByTeam] = useState<Record<string, AthleteInfo[]>>({});

  // Fetch athletes from Supabase for popup details
  useEffect(() => {
    const fetchAthletes = async () => {
      const { data: athletes } = await supabase
        .from('athletes')
        .select('name, age, height_cm, weight_kg, avatar_url, cc_team_id');
      
      if (athletes) {
        const grouped: Record<string, AthleteInfo[]> = {};
        athletes.forEach(a => {
          const teamId = a.cc_team_id || 'unknown';
          if (!grouped[teamId]) grouped[teamId] = [];
          grouped[teamId].push({
            name: a.name,
            age: a.age ?? undefined,
            height_cm: a.height_cm ? Number(a.height_cm) : undefined,
            weight_kg: a.weight_kg ? Number(a.weight_kg) : undefined,
            avatar_url: a.avatar_url ?? undefined,
          });
        });
        setAthletesByTeam(grouped);
      }
    };
    fetchAthletes();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current).setView([54.5, -4.5], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map.current);

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

    markers.forEach(marker => marker.remove());
    setMarkers([]);

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

    const newMarkers: L.Marker[] = [];
    const bounds = L.latLngBounds([]);

    filteredRegionData.forEach((regionItem) => {
      const coordinates = getTeamCoordinates(regionItem["Team Name"], regionItem.country, regionItem.region);
      if (!coordinates) return;

      let teamTestData = data.filter(testData => testData.team_name === regionItem["Team Name"]);

      const [lng, lat] = coordinates;
      const position = L.latLng(lat, lng);
      bounds.extend(position);

      const teamColor = getTeamColor(regionItem["Team Name"]);
      const customIcon = L.divIcon({
        html: `<div style="background-color: ${teamColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(position, { icon: customIcon });

      const popupContent = createPopupContent(
        regionItem, 
        teamTestData, 
        regionFilters.metricType,
        regionItem.logo,
        athletesByTeam
      );
      marker.bindPopup(popupContent, { maxWidth: 360, maxHeight: 400 });

      marker.addTo(map.current!);
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    if (newMarkers.length > 0) {
      map.current.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.current.setView([54.5, -4.5], 6);
    }
  }, [regionFilters, data, regionTestingData, athletesByTeam]);

  return (
    <div className="mt-6 relative">
      <div ref={mapContainer} className="h-96 w-full rounded-lg shadow-lg" />
      <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        OpenStreetMap | Filtered by Region & Individual Filters
      </div>
    </div>
  );
};

// Helper: coordinates
function getTeamCoordinates(teamName: string, country: string, region?: string): [number, number] | null {
  const locationMap: Record<string, [number, number]> = {
    'Two4 Martial Arts': [-3.9436, 51.6214],
    'Evolve Physiotherapy': [-3.9436, 51.6214],
    'Joshua Athletic': [-4.0237, 51.7130],
    'Evolve Physiotherapy (Non-Consenting)': [-3.9436, 51.6214],
    'Chris Rees Academy': [-3.9436, 51.6214],
    'Leon Welch Academy': [-3.9436, 51.6214],
    'Llanelli Town Academy AFC': [-4.1619, 51.6823],
    'Manchester United': [-2.2931, 53.4631],
    'Tom Stoltman': [-4.2026, 57.6920],
    'Conor McGregor': [-6.2603, 53.3498],
    'Ian Garry': [-8.4863, 51.8979],
  };
  if (locationMap[teamName]) return locationMap[teamName];

  const countryCoordinates: Record<string, [number, number]> = {
    'Wales': [-3.7837, 52.1307],
    'England': [-1.1743, 52.3555],
    'Scotland': [-4.2026, 56.4907],
    'Northern Ireland': [-5.9301, 54.7877],
    'Ireland': [-8.2439, 53.4129],
  };
  const regionCoordinates: Record<string, [number, number]> = {
    'Swansea': [-3.9436, 51.6214],
    'Llanelli': [-4.1619, 51.6823],
    'Manchester': [-2.2931, 53.4631],
    'Alness': [-4.2026, 57.6920],
    'Dublin': [-6.2603, 53.3498],
    'Cork': [-8.4863, 51.8979],
  };
  if (region && regionCoordinates[region]) return regionCoordinates[region];
  if (countryCoordinates[country]) return countryCoordinates[country];
  return [-3.7837, 52.1307];
}

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

// Build popup HTML with team logo + athlete scoreboard
function createPopupContent(
  regionItem: any, 
  teamTestData: TestData[], 
  selectedMetricType: string,
  teamLogo: string | null,
  athletesByTeam: Record<string, AthleteInfo[]>
): string {
  const teamName = regionItem["Team Name"];
  const country = regionItem.country;
  const region = regionItem.region;
  const address = regionItem.address;

  // Collect all athlete names from test data for this team
  const athleteNamesFromTests = new Set<string>();
  teamTestData.forEach(t => athleteNamesFromTests.add(t.athlete_name));

  // Build metric values per athlete
  const athleteMetrics = new Map<string, { value: number; best: number }>();
  if (selectedMetricType && selectedMetricType !== 'all') {
    const grouped = new Map<string, number[]>();
    teamTestData.forEach(test => {
      if (!grouped.has(test.athlete_name)) grouped.set(test.athlete_name, []);
      const metrics: any = typeof test.metrics === 'string' ? JSON.parse(test.metrics) : test.metrics;
      if (!metrics) return;
      const v = extractMetricValue(metrics, selectedMetricType);
      if (v > 0) grouped.get(test.athlete_name)!.push(v);
    });
    grouped.forEach((vals, name) => {
      if (vals.length > 0) {
        athleteMetrics.set(name, { value: vals[vals.length - 1], best: Math.max(...vals) });
      }
    });
  }

  // Sort athletes by best metric value descending for scoreboard
  const sortedAthletes = Array.from(athleteNamesFromTests).sort((a, b) => {
    const aVal = athleteMetrics.get(a)?.best ?? 0;
    const bVal = athleteMetrics.get(b)?.best ?? 0;
    return bVal - aVal;
  });

  // Find athlete details from the athletes table — match by name
  const allAthletes = Object.values(athletesByTeam).flat();

  // Logo HTML
  const logoHtml = teamLogo 
    ? `<img src="${teamLogo}" alt="${teamName}" style="width:40px;height:40px;border-radius:6px;object-fit:contain;border:1px solid #e2e8f0;" />`
    : `<div style="width:40px;height:40px;border-radius:6px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#94a3b8;">${teamName.charAt(0)}</div>`;

  // Athlete rows
  let athleteRowsHtml = '';
  sortedAthletes.forEach((name, idx) => {
    const info = allAthletes.find(a => a.name === name);
    const metric = athleteMetrics.get(name);
    const rank = idx + 1;
    const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
    
    const avatarHtml = info?.avatar_url
      ? `<img src="${info.avatar_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
      : `<div style="width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#64748b;flex-shrink:0;">${name.charAt(0)}</div>`;

    const detailParts: string[] = [];
    if (info?.age) detailParts.push(`Age: ${info.age}`);
    if (info?.height_cm) detailParts.push(`H: ${info.height_cm}cm`);
    if (info?.weight_kg) detailParts.push(`W: ${info.weight_kg}kg`);

    athleteRowsHtml += `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;${idx % 2 === 0 ? 'background:#f8fafc;' : ''}border-radius:4px;">
        <span style="min-width:20px;text-align:center;font-size:12px;">${rankBadge}</span>
        ${avatarHtml}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
          <div style="font-size:9px;color:#64748b;">${detailParts.join(' · ') || 'No details'}</div>
          ${metric ? `<div style="font-size:9px;color:#3b82f6;">Latest: ${metric.value.toFixed(2)} | Best: ${metric.best.toFixed(2)}</div>` : ''}
        </div>
      </div>
    `;
  });

  if (!athleteRowsHtml) {
    athleteRowsHtml = `<div style="padding:12px;text-align:center;color:#94a3b8;font-size:11px;">No athlete data available</div>`;
  }

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:340px;">
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">
        ${logoHtml}
        <div>
          <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">${teamName}</h3>
          <div style="font-size:10px;color:#64748b;">${country}${region ? ' · ' + region : ''}${address ? ' · ' + address : ''}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">
        Athlete Scoreboard${selectedMetricType && selectedMetricType !== 'all' ? ' — ' + selectedMetricType : ''}
      </div>
      <div style="max-height:200px;overflow-y:auto;">
        ${athleteRowsHtml}
      </div>
      <div style="font-size:9px;color:#94a3b8;margin-top:6px;text-align:center;padding-top:6px;border-top:1px solid #e2e8f0;">
        ${sortedAthletes.length} Athletes · ${teamTestData.length} Tests
      </div>
    </div>
  `;
}

function extractMetricValue(metrics: any, metricType: string): number {
  switch (metricType) {
    case "Jump Height (cm)":
    case "Jump Height (Pogo)":
      return metrics.jump_height_ft ? metrics.jump_height_ft * 30.48 : metrics.jump_height || metrics.avg_jump_height || 0;
    case "Peak Power":
      return metrics.peak_power || 0;
    case "Relative Peak Power":
      return (metrics.peak_power && metrics.body_mass && metrics.body_mass > 0) ? metrics.peak_power / metrics.body_mass : 0;
    case "Contact Time":
      return metrics.contact_time || metrics.avg_contact_time || 0;
    case "Reactive Strength Index":
      return metrics.rsi || metrics.avg_rsi || 0;
    case "Flight Time":
      return metrics.flight_time || metrics.avg_flight_time || 0;
    case "Take-off Velocity":
      return metrics.takeoff_velocity || metrics.peak_velocity || 0;
    case "Average Rate of Force Development":
      return metrics.avg_rfd || metrics.rfd_max || 0;
    case "Average Propulsive Power":
      return metrics.avg_propulsive_power || metrics.avg_power || 0;
    case "Power":
      return metrics.power || metrics.avg_power || 0;
    case "Maximum Rate of Force Development":
      return metrics.rfd_max || metrics.avg_rfd || 0;
    case "Force at Max Rate of Force Development":
      return metrics.force_150ms || metrics.force_100ms || metrics.force_50ms || metrics.force_peak || 0;
    case "Peak Force":
      return metrics.peak_force || metrics.force_peak || 0;
    case "Early Explosive Power":
      return metrics.force_50ms || 0;
    default:
      return metrics.peak_force || metrics.force_peak || 0;
  }
}
