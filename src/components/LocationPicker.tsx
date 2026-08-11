"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import { LocateFixed, MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { Button } from "@/components/ui/button";
import { MAP_STYLE_URL } from "@/lib/config";
import { Coords } from "@/lib/models";

interface LocationPickerProps {
  value: Coords;
  onChange: (coords: Coords) => void;
  /** Posición del GPS, para el botón de "volver a mi ubicación". */
  gpsCoords?: Coords | null;
}

/**
 * Elegir el punto exacto moviendo el mapa bajo un pin fijo, no arrastrando un
 * marcador. Con el dedo encima de un pin de 30 px no se ve dónde se está
 * soltando; con el pin clavado en el centro, la mano nunca tapa el objetivo.
 *
 * Sólo se avisa al terminar el gesto (`moveend`), no en cada fotograma.
 */
export function LocationPicker({ value, onChange, gpsCoords }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onChangeRef = useRef(onChange);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: value.toLngLat(),
      zoom: 16,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("movestart", () => setMoving(true));
    map.on("moveend", () => {
      setMoving(false);
      const center = map.getCenter();
      const next = Coords.parse(center.lat, center.lng);
      if (next) onChangeRef.current(next);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Sólo al montar: `value` fija el centro inicial y a partir de ahí manda
    // el gesto. Reaccionar a cada cambio pelearía con la mano del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recenter = (coords: Coords) => {
    mapRef.current?.easeTo({ center: coords.toLngLat(), zoom: 16, duration: 600 });
  };

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} className="h-full w-full" />

      {/* Pin fijo en el centro. `pointer-events-none` para no robarle el
          gesto al mapa. El desplazamiento vertical hace que la punta del pin
          caiga justo en el centro geométrico. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <MapPin
          className={`size-9 -translate-y-4 text-destructive drop-shadow-md transition-transform ${
            moving ? "-translate-y-6" : ""
          }`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </div>

      {gpsCoords && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute bottom-2 left-2 shadow-sm"
          onClick={() => recenter(gpsCoords)}
        >
          <LocateFixed data-icon="inline-start" />
          Mi ubicación
        </Button>
      )}
    </div>
  );
}
