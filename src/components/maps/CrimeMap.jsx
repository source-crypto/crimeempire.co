import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom marker icons by severity
const getMarkerIcon = (severity) => {
  const colors = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#10b981"
  };
  
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${colors[severity] || colors.medium}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapUpdater({ reports }) {
  const map = useMap();
  
  useEffect(() => {
    if (reports.length > 0) {
      const validReports = reports.filter(r => r.latitude && r.longitude);
      if (validReports.length > 0) {
        const bounds = L.latLngBounds(
          validReports.map(r => [r.latitude, r.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [reports, map]);
  
  return null;
}

export default function CrimeMap({ reports, height = "500px" }) {
  const validReports = reports.filter(r => r.latitude && r.longitude);
  const center = validReports.length > 0 
    ? [validReports[0].latitude, validReports[0].longitude]
    : [40.7128, -74.0060]; // Default to NYC

  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater reports={validReports} />
        {validReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={getMarkerIcon(report.severity)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                <p className="text-xs text-slate-600 mb-2">{report.location}</p>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    report.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {report.severity}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                    {report.status}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}