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
import Overlay from "ol/Overlay";
import "ol/ol.css";

interface GeoObject {
  id: string;
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

interface MapViewProps {
  objects?: GeoObject[];
  center?: [number, number];
  zoom?: number;
  onSelect?: (id: string) => void;
}

export function MapView({
  objects = [],
  center = [0, 20],
  zoom = 2,
  onSelect,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({
          color: "rgba(59, 130, 246, 0.2)",
        }),
        stroke: new Stroke({
          color: "#3b82f6",
          width: 2,
        }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "#3b82f6" }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 2,
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
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom,
      }),
    });

    // Popup overlay
    if (popupRef.current) {
      const popup = new Overlay({
        element: popupRef.current,
        autoPan: true,
      });
      olMap.addOverlay(popup);

      olMap.on("click", (evt) => {
        const feature = olMap.forEachFeatureAtPixel(evt.pixel, (f) => f);
        if (feature) {
          const id = feature.get("id");
          setSelectedFeature(id);
          popup.setPosition(evt.coordinate);
          if (onSelect) onSelect(id);
        } else {
          setSelectedFeature(null);
          popup.setPosition(undefined);
        }
      });
    }

    setMap(olMap);

    return () => {
      olMap.setTarget(undefined);
    };
  }, []);

  // Update objects on the map
  useEffect(() => {
    if (!map) return;

    const layers = map.getLayers().getArray();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vectorLayer = layers[1] as any;
    const source = vectorLayer.getSource() as VectorSource;
    if (!source) return;

    source.clear();

    objects.forEach((obj) => {
      let geometry;
      const coords = obj.coordinates;

      if (obj.type === "Point" && Array.isArray(coords) && coords.length === 2) {
        geometry = new Point(fromLonLat(coords as [number, number]));
      } else if (obj.type === "LineString") {
        geometry = new LineString(
          (coords as number[][]).map((c) => fromLonLat(c as [number, number]))
        );
      } else if (obj.type === "Polygon") {
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
        source.addFeature(feature);
      }
    });

    // Fit to extent if we have objects
    if (objects.length > 0) {
      const extent = source.getExtent();
      map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
    }
  }, [map, objects]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      <div
        ref={popupRef}
        className="ol-popup bg-card border rounded-lg shadow-lg p-3 min-w-[150px]"
        style={{ display: selectedFeature ? "block" : "none" }}
      >
        {selectedFeature && (
          <div>
            <div className="font-medium text-sm">{selectedFeature}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Click to view details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
