import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RESOURCE_COLOR = { financial: '#22c55e', industrial: '#f59e0b', tactical: '#ef4444', residential: '#3b82f6' };
const UNIT_COLOR = { patrol: '#60a5fa', swat: '#ef4444', detective: '#a855f7', federal: '#f43f5e', helicopter: '#fbbf24' };
const BIZ_COLOR = { legitimate: '#22c55e', front: '#fbbf24', illicit: '#a855f7' };

function hashStr(s = '') { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function distKm(a, b) { const dLat = a.lat - b.lat; const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180); return Math.sqrt(dLat * dLat + dLng * dLng) * 111; }
function heatColor(v) { return v >= 70 ? '#ef4444' : v >= 40 ? '#f97316' : '#facc15'; }

export function crimeIntensity(t, lawEnforcement, worldEvents, worldState) {
  let v = 20;
  if (t.is_contested) v += 30;
  v += (100 - (t.control_percentage ?? 100)) * 0.2;
  const near = lawEnforcement.filter(u => u.coordinates && t.coordinates && distKm(u.coordinates, t.coordinates) < (u.patrol_radius || 5));
  if (near.length) v += (near.reduce((s, u) => s + (u.threat_level || 50), 0) / near.length) * 0.15;
  const evCount = (worldEvents || []).filter(e => (e.affected_territories || []).includes(t.name)).length;
  v += evCount * 12;
  v += (worldState?.territoryTension || 0) * 0.1;
  v += (worldState?.factionActivity || 0) * 1;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export default function CityIntelligenceMap({ territories = [], lawEnforcement = [], properties = [], worldEvents = [], activeLayers = {}, playerCrewId, worldState, tileMode = 'dark', onSelectDistrict }) {
  const center = useMemo(() => {
    const t = territories.find(x => x.coordinates?.lat != null);
    if (t) return [t.coordinates.lat, t.coordinates.lng];
    const u = lawEnforcement.find(x => x.coordinates?.lat != null);
    if (u) return [u.coordinates.lat, u.coordinates.lng];
    return [40.7128, -74.0060];
  }, [territories, lawEnforcement]);

  const districtMap = useMemo(() => {
    const m = {};
    territories.forEach(t => { if (t.coordinates?.lat != null) m[t.name] = [t.coordinates.lat, t.coordinates.lng]; });
    return m;
  }, [territories]);

  const intensities = useMemo(() => {
    const m = {};
    territories.forEach(t => { if (t.coordinates?.lat != null) m[t.id] = crimeIntensity(t, lawEnforcement, worldEvents, worldState); });
    return m;
  }, [territories, lawEnforcement, worldEvents, worldState]);

  const businessCoords = (p) => {
    const base = districtMap[p.district] || center;
    const h = hashStr(p.id || p.name || '');
    const dLat = ((h % 100) / 100 - 0.5) * 0.012;
    const dLng = (((h >> 8) % 100) / 100 - 0.5) * 0.012;
    return [base[0] + dLat, base[1] + dLng];
  };

  const eventLocations = useMemo(() => {
    return worldEvents.map((e, i) => {
      const named = (e.affected_territories || []).find(n => districtMap[n]);
      if (named) return { id: e.id, pos: districtMap[named], name: e.event_name };
      const jitter = i * 0.008;
      return { id: e.id, pos: [center[0] + jitter, center[1] + jitter], name: e.event_name };
    });
  }, [worldEvents, districtMap, center]);

  return (
    <MapContainer center={center} zoom={12} className="h-[60vh] min-h-[420px] w-full rounded-xl border border-purple-500/20 z-0" attributionControl={false}>
      {tileMode === 'satellite' ? (
        <TileLayer key="sat" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
      ) : (
        <TileLayer key="dark" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      )}

      {activeLayers.heatmap && territories.filter(t => t.coordinates?.lat != null).map(t => {
        const v = intensities[t.id] || 0;
        return (
          <Circle key={`heat-${t.id}`} center={[t.coordinates.lat, t.coordinates.lng]} radius={300 + v * 12}
            pathOptions={{ color: heatColor(v), fillOpacity: 0.12 + v / 280, weight: 0 }} />
        );
      })}

      {activeLayers.districts && territories.filter(t => t.coordinates?.lat != null).map(t => (
        <Circle key={`dist-${t.id}`} center={[t.coordinates.lat, t.coordinates.lng]} radius={650}
          pathOptions={{ color: '#64748b', weight: 1, dashArray: '4 6', fillOpacity: 0 }} />
      ))}

      {activeLayers.territories && territories.filter(t => t.coordinates?.lat != null).map(t => (
        <CircleMarker key={t.id} center={[t.coordinates.lat, t.coordinates.lng]} radius={6 + (t.control_percentage || 50) / 12} pathOptions={{ color: t.is_contested ? '#ef4444' : RESOURCE_COLOR[t.resource_type] || '#3b82f6', fillOpacity: 0.5 }} eventHandlers={{ click: () => onSelectDistrict?.(t) }}>
          <Tooltip>{t.name}{t.is_contested ? ' — CONTESTED' : ''}</Tooltip>
          <Popup>
            <strong>{t.name}</strong><br />
            Control: {t.control_percentage ?? 0}%<br />
            Type: {t.resource_type}<br />
            Crime intensity: {intensities[t.id] ?? 0}/100<br />
            {t.is_contested ? '⚠️ Contested' : 'Stable'}<br />
            {t.controlling_crew_id === playerCrewId ? '📍 Your turf' : ''}
          </Popup>
        </CircleMarker>
      ))}

      {activeLayers.heatmap && territories.filter(t => t.coordinates?.lat != null && (intensities[t.id] || 0) > 70).map(t => (
        <CircleMarker key={`hot-${t.id}`} center={[t.coordinates.lat, t.coordinates.lng]} radius={11} pathOptions={{ color: '#ef4444', fillOpacity: 0.08, weight: 2 }}>
          <Tooltip>🔥 Hotspot — {intensities[t.id]}/100</Tooltip>
        </CircleMarker>
      ))}

      {activeLayers.heatmap && territories.filter(t => t.coordinates?.lat != null && t.is_contested).map(t => (
        <CircleMarker key={`conflict-${t.id}`} center={[t.coordinates.lat, t.coordinates.lng]} radius={15} pathOptions={{ color: '#f97316', fillOpacity: 0.04, weight: 2, dashArray: '2 4' }}>
          <Tooltip>⚔️ Active Conflict Zone — {t.name}</Tooltip>
        </CircleMarker>
      ))}

      {activeLayers.police && lawEnforcement.filter(u => u.coordinates?.lat != null && u.is_active !== false).map(u => (
        <React.Fragment key={u.id}>
          <Circle center={[u.coordinates.lat, u.coordinates.lng]} radius={(u.patrol_radius || 5) * 100} pathOptions={{ color: UNIT_COLOR[u.unit_type] || '#60a5fa', fillOpacity: 0.05, weight: 1 }} />
          <CircleMarker center={[u.coordinates.lat, u.coordinates.lng]} radius={5} pathOptions={{ color: UNIT_COLOR[u.unit_type] || '#60a5fa', fillOpacity: 0.85 }}>
            <Tooltip>Police: {u.unit_type}</Tooltip>
            <Popup>
              <strong>Police — {u.unit_type}</strong><br />
              Threat: {u.threat_level ?? 50}/100<br />
              Patrol radius: {u.patrol_radius ?? 5} km<br />
              Response: {u.response_time ?? 5} min
            </Popup>
          </CircleMarker>
        </React.Fragment>
      ))}

      {activeLayers.businesses && properties.map(p => (
        <CircleMarker key={p.id} center={businessCoords(p)} radius={4} pathOptions={{ color: BIZ_COLOR[p.legitimacy] || '#22c55e', fillOpacity: 0.7 }}>
          <Tooltip>{p.name}</Tooltip>
          <Popup>
            <strong>{p.name}</strong><br />
            Type: {p.property_type}<br />
            Condition: {p.condition ?? 100}%<br />
            Income/hr: ${p.income_per_hour ?? 0}<br />
            Legitimacy: {p.legitimacy}
          </Popup>
        </CircleMarker>
      ))}

      {activeLayers.events && eventLocations.map(e => (
        <CircleMarker key={e.id} center={e.pos} radius={9} pathOptions={{ color: '#ef4444', fillOpacity: 0.35, weight: 2 }}>
          <Tooltip>⚠️ {e.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}