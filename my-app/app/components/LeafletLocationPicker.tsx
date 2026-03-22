"use client"

import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fixx default marker assets when bundling with Next.js
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function RecenterMap({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap()

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 13))
    }
  }, [latitude, longitude, map])

  return null
}

export function LeafletLocationPicker({
  latitude,
  longitude,
  onChange,
  height = 360,
}: {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
  height?: number
}) {
  const defaultCenter: LatLngExpression = [20.5937, 78.9629] // Center on India by default

  const center = useMemo<LatLngExpression>(() => {
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude]
    }
    return defaultCenter
  }, [latitude, longitude])

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer
        key={`${center.toString()}`}
        center={center}
        zoom={latitude !== null && longitude !== null ? 14 : 5}
        className="w-full"
        style={{ height }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onChange={onChange} />
        <RecenterMap latitude={latitude} longitude={longitude} />

        {latitude !== null && longitude !== null && (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        )}
      </MapContainer>
    </div>
  )
}
