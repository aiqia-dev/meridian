"use client";

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Fill, Stroke, Circle } from "ol/style";
import Feature from "ol/Feature";
import { Point, Polygon, LineString } from "ol/geom";
import "ol/ol.css";

interface GeoObject {
  id: string;
  object: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface MapPointPickerProps {
  onPointSelect: (lat: number, lon: number) => void;
  selectedPoint?: { lat: number; lon: number } | null;
  geoObjects?: GeoObject[];
}

export function MapPointPicker({
  onPointSelect,
  selectedPoint,
  geoObjects = [],
}: MapPointPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [markerSource] = useState(() => new VectorSource());
  const [objectsSource] = useState(() => new VectorSource());

  useEffect(() => {
    if (!mapRef.current) return;

    // Layer for collection objects (blue)
    const objectsLayer = new VectorLayer({
      source: objectsSource,
      style: new Style({
        fill: new Fill({
          color: "rgba(59, 130, 246, 0.3)",
        }),
        stroke: new Stroke({
          color: "#3b82f6",
          width: 2,
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: "#3b82f6" }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 2,
          }),
        }),
      }),
    });

    // Layer for test point marker (red)
    const markerLayer = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({ color: "#ef4444" }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 3,
          }),
        }),
      }),
    });

    const olMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        objectsLayer,
        markerLayer,
      ],
      view: new View({
        center: fromLonLat([-46.6333, -23.5505]),
        zoom: 4,
      }),
    });

    // Handle click to select point
    olMap.on("click", (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);
      onPointSelect(lat, lon);
    });

    setMap(olMap);

    return () => {
      olMap.setTarget(undefined);
    };
  }, [onPointSelect, markerSource, objectsSource]);

  // Update objects on the map
  useEffect(() => {
    objectsSource.clear();

    geoObjects.forEach((obj) => {
      if (!obj.object) return;

      let geometry;
      const coords = obj.object.coordinates;

      if (obj.object.type === "Point" && Array.isArray(coords) && coords.length === 2) {
        geometry = new Point(fromLonLat(coords as [number, number]));
      } else if (obj.object.type === "LineString") {
        geometry = new LineString(
          (coords as number[][]).map((c) => fromLonLat(c as [number, number]))
        );
      } else if (obj.object.type === "Polygon") {
        geometry = new Polygon([
          (coords as number[][][])[0].map((c) =>
            fromLonLat(c as [number, number])
          ),
        ]);
      }

      if (geometry) {
        const feature = new Feature({
          geometry,
          id: obj.id,
        });
        feature.set("id", obj.id);
        objectsSource.addFeature(feature);
      }
    });

    // Fit to objects extent if we have objects and no selected point
    if (geoObjects.length > 0 && map && !selectedPoint) {
      const extent = objectsSource.getExtent();
      if (extent[0] !== Infinity) {
        map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
      }
    }
  }, [geoObjects, objectsSource, map, selectedPoint]);

  // Update marker when selectedPoint changes
  useEffect(() => {
    markerSource.clear();

    if (selectedPoint) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([selectedPoint.lon, selectedPoint.lat])),
      });
      markerSource.addFeature(feature);
    }
  }, [selectedPoint, markerSource]);

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-lg overflow-hidden border cursor-crosshair"
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Collection objects</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Test point</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Click on the map to select a test point
      </p>
    </div>
  );
}
