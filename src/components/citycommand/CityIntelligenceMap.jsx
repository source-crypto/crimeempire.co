import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RESOURCE_COLOR = { financial: '#22c55e', industrial: '#f59e0b', tactical: '#ef4444', residential: '#3b82f6' };
const UNIT_COLOR = { patrol: '#60a5fa', swat: '#ef4444', detective: '#a855f7', federal: '#f43f5e', helicopter: '#fbbf24' };

export default function CityIntelligenceMap({ territories = [], lawEnforcement = [], worldEvents = [], activeLayers = {}, playerCrewId }) {
  const center = useMemo(() => {
    const t = territories.find(x => x.coordinates?.lat != null);
    if (t) return [t.coordinates.lat, t.coordinates.lng];
    const u = lawEnforcement.find(x => x.coordinates?.lat != null);
    if (u) return [u.coordinates.lat, u.coordinates.lng];
    return [40.7128, -74.0060];
  }, [territories, lawEnforcement]);

  const territoryCoordsByName = useMemo(() => {
    const m = {};
    territories.forEach(t => { if (t.coordinates?.lat != null) m[t.name] = [t.coordinates.lat, t.coordinates.lng]; });
    return m;
  }, [territories]);

  const eventLocations = useMemo(() => {
    const base = center;
    return worldEvents.map((e, i) => {
      const named = (e.affected_territories || []).find(n => territoryCoordsByName[n]);
      if (named) return { id: e.id, pos: territoryCoordsByName[named], name: e.event_name };
      const jitter = i * 0.008;
      return { id: e.id, pos: [base[0] + jitter, base[1] + jitter], name: e.event_name };
    });
  }, [worldEvents, territoryCoordsByName, center]);

  return (
    <MapContainer center={center} zoom={12} className="h-[60vh] min-h-[420px] w-full rounded-xl border border-purple-500/20 z-0" attributionControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

      {activeLayers.territories && territories.filter(t => t.coordinates?.lat != null).map(t => (
        <CircleMarker key={t.id} center={[t.coordinates.lat, t.coordinates.lng]} radius={6 + (t.control_percentage || 50) / 12} pathOptions={{ color: t.is_contested ? '#ef4444' : RESOURCE_COLOR[t.resource_type] || '#3b82f6', fillOpacity: 0.5 }}>
          <Tooltip>{t.name}{t.is_contested ? ' — CONTESTED' : ''}</Tooltip>
          <Popup>
            <strong>{t.name}</strong><br />
            Control: {t.control_percentage ?? 0}%<br />
            Type: {t.resource_type}<br />
            {t.is_contested ? '⚠️ Contested' : 'Stable'}<br />
            {t.controlling_crew_id === playerCrewId ? '📍 Your turf' : ''}
          </Popup>
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

      {activeLayers.events && eventLocations.map(e => (
        <CircleMarker key={e.id} center={e.pos} radius={9} pathOptions={{ color: '#ef4444', fillOpacity: 0.35, weight: 2 }}>
          <Tooltip>⚠️ {e.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}