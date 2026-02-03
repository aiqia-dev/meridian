"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MapView } from "@/components/map/map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Layers } from "lucide-react";

interface Collection {
  key: string;
  count: number;
}

interface GeoObject {
  id: string;
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

export default function MapPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [objects, setObjects] = useState<GeoObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchObjects(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    try {
      const response = await fetch("/KEYS *");
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.keys) {
          setCollections(
            data.keys.map((k: string) => ({ key: k, count: 0 }))
          );
          if (data.keys.length > 0) {
            setSelectedCollection(data.keys[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (key: string) => {
    try {
      const response = await fetch(`/SCAN ${key} LIMIT 1000`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.objects) {
          const geoObjects: GeoObject[] = data.objects
            .filter((obj: any) => obj.object?.type)
            .map((obj: any) => ({
              id: obj.id,
              type: obj.object.type,
              coordinates: obj.object.coordinates,
            }));
          setObjects(geoObjects);
        }
      }
    } catch (err) {
      console.error("Failed to fetch objects:", err);
    }
  };

  const handleSelectObject = (id: string) => {
    console.log("Selected object:", id);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Map View</h1>
            <p className="text-muted-foreground">
              Visualize geospatial data on an interactive map
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCollections()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Collections sidebar */}
          <Card className="w-64 flex-shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : collections.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No collections found
                </div>
              ) : (
                <div className="space-y-1">
                  {collections.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => setSelectedCollection(col.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCollection === col.key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      {col.key}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="flex-1">
            <CardContent className="p-0 h-full">
              <MapView
                objects={objects}
                onSelect={handleSelectObject}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
