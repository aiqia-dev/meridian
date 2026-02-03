"use client";

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import { Style, Fill, Stroke, Circle, Text } from "ol/style";
import Draw from "ol/interaction/Draw";
import { Type as GeometryType } from "ol/geom/Geometry";
import GeoJSON from "ol/format/GeoJSON";
import "ol/ol.css";
import { Button } from "@/components/ui/button";
import { Circle as CircleIcon, Minus, Pentagon, Trash2, Eye, EyeOff } from "lucide-react";

type DrawType = "Point" | "LineString" | "Polygon" | null;

interface ExistingObject {
  id: string;
  object: any;
}

interface MapDrawerProps {
  onGeometryChange: (geojson: object | null) => void;
  initialGeometry?: object | null;
  existingObjects?: ExistingObject[];
}

export function MapDrawer({ onGeometryChange, initialGeometry, existingObjects = [] }: MapDrawerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [vectorSource] = useState(() => new VectorSource());
  const [existingSource] = useState(() => new VectorSource());
  const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
  const [activeDrawType, setActiveDrawType] = useState<DrawType>(null);
  const [showExisting, setShowExisting] = useState(true);
  const [existingLayer, setExistingLayer] = useState<VectorLayer<any> | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Layer for drawing new geometry
    const drawLayer = new VectorLayer({
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
      zIndex: 10,
    });

    // Layer for existing objects (muted style)
    const existingObjLayer = new VectorLayer({
      source: existingSource,
      style: (feature) => {
        const id = feature.get("objectId") || "";
        return new Style({
          fill: new Fill({
            color: "rgba(156, 163, 175, 0.2)",
          }),
          stroke: new Stroke({
            color: "#6b7280",
            width: 1.5,
            lineDash: [4, 4],
          }),
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: "#6b7280" }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 1,
            }),
          }),
          text: new Text({
            text: id,
            font: "11px sans-serif",
            fill: new Fill({ color: "#374151" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
            offsetY: -15,
          }),
        });
      },
      zIndex: 5,
    });

    setExistingLayer(existingObjLayer);

    const olMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        existingObjLayer,
        drawLayer,
      ],
      view: new View({
        center: fromLonLat([-46.6333, -23.5505]), // São Paulo default
        zoom: 4,
      }),
    });

    setMap(olMap);

    // Load initial geometry if provided
    if (initialGeometry) {
      try {
        const format = new GeoJSON();
        const feature = format.readFeature(initialGeometry, {
          featureProjection: "EPSG:3857",
        });
        vectorSource.addFeature(feature);
        const extent = vectorSource.getExtent();
        olMap.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
      } catch (e) {
        console.error("Failed to load initial geometry:", e);
      }
    }

    return () => {
      olMap.setTarget(undefined);
    };
  }, []);

  // Load existing objects
  useEffect(() => {
    if (!map) return;

    existingSource.clear();

    if (existingObjects.length > 0) {
      const format = new GeoJSON();

      existingObjects.forEach((obj) => {
        if (obj.object) {
          try {
            const feature = format.readFeature(obj.object, {
              featureProjection: "EPSG:3857",
            });
            feature.set("objectId", obj.id);
            existingSource.addFeature(feature);
          } catch (e) {
            console.error(`Failed to load object ${obj.id}:`, e);
          }
        }
      });

      // Fit view to show all existing objects if no drawing yet
      if (existingSource.getFeatures().length > 0 && vectorSource.getFeatures().length === 0) {
        const extent = existingSource.getExtent();
        if (extent[0] !== Infinity) {
          map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 12 });
        }
      }
    }
  }, [map, existingObjects, existingSource, vectorSource]);

  // Toggle existing objects visibility
  useEffect(() => {
    if (existingLayer) {
      existingLayer.setVisible(showExisting);
    }
  }, [showExisting, existingLayer]);

  // Handle draw type changes
  useEffect(() => {
    if (!map) return;

    // Remove existing draw interaction
    if (drawInteraction) {
      map.removeInteraction(drawInteraction);
      setDrawInteraction(null);
    }

    if (!activeDrawType) return;

    // Add new draw interaction
    const draw = new Draw({
      source: vectorSource,
      type: activeDrawType as GeometryType,
      style: new Style({
        fill: new Fill({
          color: "rgba(59, 130, 246, 0.3)",
        }),
        stroke: new Stroke({
          color: "#3b82f6",
          width: 2,
          lineDash: [5, 5],
        }),
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: "#3b82f6" }),
        }),
      }),
    });

    // Clear previous features when starting a new drawing
    draw.on("drawstart", () => {
      vectorSource.clear();
    });

    draw.on("drawend", (e) => {
      // Feature is automatically added by OpenLayers since we passed source to Draw
      // Convert to GeoJSON
      const format = new GeoJSON();
      const geojson = format.writeFeatureObject(e.feature, {
        featureProjection: "EPSG:3857",
      });

      onGeometryChange(geojson.geometry);
      setActiveDrawType(null);
    });

    map.addInteraction(draw);
    setDrawInteraction(draw);

    return () => {
      map.removeInteraction(draw);
    };
  }, [map, activeDrawType, vectorSource, onGeometryChange]);

  const clearDrawing = () => {
    vectorSource.clear();
    onGeometryChange(null);
    setActiveDrawType(null);
  };

  const selectDrawType = (type: DrawType) => {
    if (activeDrawType === type) {
      setActiveDrawType(null);
    } else {
      setActiveDrawType(type);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant={activeDrawType === "Point" ? "default" : "outline"}
          onClick={() => selectDrawType("Point")}
          title="Draw Point"
        >
          <CircleIcon className="w-4 h-4 mr-1" />
          Point
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeDrawType === "LineString" ? "default" : "outline"}
          onClick={() => selectDrawType("LineString")}
          title="Draw Line"
        >
          <Minus className="w-4 h-4 mr-1" />
          Line
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeDrawType === "Polygon" ? "default" : "outline"}
          onClick={() => selectDrawType("Polygon")}
          title="Draw Polygon"
        >
          <Pentagon className="w-4 h-4 mr-1" />
          Polygon
        </Button>
        <div className="flex-1" />
        {existingObjects.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowExisting(!showExisting)}
            title={showExisting ? "Hide existing objects" : "Show existing objects"}
          >
            {showExisting ? (
              <Eye className="w-4 h-4 mr-1" />
            ) : (
              <EyeOff className="w-4 h-4 mr-1" />
            )}
            {existingObjects.length} existing
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={clearDrawing}
          className="text-destructive hover:text-destructive"
          title="Clear Drawing"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div
        ref={mapRef}
        className="w-full h-[60vh] min-h-[500px] rounded-lg overflow-hidden border"
      />

      <div className="flex items-center justify-between">
        {activeDrawType && (
          <p className="text-xs text-muted-foreground">
            {activeDrawType === "Point" && "Click on the map to place a point"}
            {activeDrawType === "LineString" && "Click to add points, double-click to finish the line"}
            {activeDrawType === "Polygon" && "Click to add vertices, double-click to close the polygon"}
          </p>
        )}
        {existingObjects.length > 0 && showExisting && (
          <p className="text-xs text-muted-foreground ml-auto">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1 align-middle" />
            Gray objects = existing in collection
          </p>
        )}
      </div>
    </div>
  );
}
