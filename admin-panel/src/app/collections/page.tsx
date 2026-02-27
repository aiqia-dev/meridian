"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Database,
  ChevronRight,
  Edit,
  MapPin,
  Crosshair,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { HelpTooltip, LabelWithHelp } from "@/components/ui/help-tooltip";
import { CliExample } from "@/components/ui/cli-example";
import { executeCommand } from "@/lib/api";

// Dynamic import to avoid SSR issues with OpenLayers
const MapDrawer = dynamic(
  () => import("@/components/map/map-drawer").then((mod) => mod.MapDrawer),
  { ssr: false, loading: () => <div className="w-full h-[60vh] min-h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

const MapPointPicker = dynamic(
  () => import("@/components/map/map-point-picker").then((mod) => mod.MapPointPicker),
  { ssr: false, loading: () => <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg" /> }
);

interface Collection {
  key: string;
  count: number;
  in_memory_size: number;
}

interface GeoObject {
  id: string;
  object: any;
  fields?: any[];
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [objects, setObjects] = useState<GeoObject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [objectsLoading, setObjectsLoading] = useState(false);

  // Create collection dialog
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Create object dialog
  const [showCreateObject, setShowCreateObject] = useState(false);
  const [newObjectId, setNewObjectId] = useState("");
  const [newObjectType, setNewObjectType] = useState("Point");
  const [newObjectLon, setNewObjectLon] = useState("");
  const [newObjectLat, setNewObjectLat] = useState("");
  const [newObjectGeoJSON, setNewObjectGeoJSON] = useState("");
  const [drawnGeometry, setDrawnGeometry] = useState<object | null>(null);
  const [creatingObject, setCreatingObject] = useState(false);
  const [objectError, setObjectError] = useState("");
  const [objectFields, setObjectFields] = useState<Array<{ key: string; value: string }>>([]);

  // Delete collection dialog
  const [showDeleteCollection, setShowDeleteCollection] = useState(false);
  const [deletingCollection, setDeletingCollection] = useState(false);

  // Test point dialog
  const [showTestPoint, setShowTestPoint] = useState(false);
  const [testPointLat, setTestPointLat] = useState("");
  const [testPointLon, setTestPointLon] = useState("");
  const [testPointResult, setTestPointResult] = useState<{
    tested: boolean;
    matches: { id: string; object: any }[];
  } | null>(null);
  const [testingPoint, setTestingPoint] = useState(false);

  // Delete object dialog
  const [showDeleteObject, setShowDeleteObject] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState<{ key: string; id: string } | null>(null);
  const [deletingObject, setDeletingObject] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchObjects(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const data = await executeCommand("KEYS *");
      if (data.ok && data.keys) {
        // Get stats for each collection
        const collectionsWithStats: Collection[] = await Promise.all(
          data.keys.map(async (key: string) => {
            try {
              const stats = await executeCommand(`STATS ${key}`);
              if (stats.ok && stats.stats && stats.stats[0]) {
                return {
                  key,
                  count: stats.stats[0].num_objects || 0,
                  in_memory_size: stats.stats[0].in_memory_size || 0,
                };
              }
            } catch {}
            return { key, count: 0, in_memory_size: 0 };
          })
        );
        setCollections(collectionsWithStats);
      } else {
        setCollections([]);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (key: string) => {
    setObjectsLoading(true);
    try {
      const data = await executeCommand(`SCAN ${key} LIMIT 100`);
      if (data.ok && data.objects) {
        setObjects(data.objects);
      } else {
        setObjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch objects:", err);
    } finally {
      setObjectsLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    setCreatingCollection(true);
    try {
      // Create collection by adding a temporary object and then optionally keeping it
      // Collections are created implicitly when first object is added
      const result = await executeCommand(
        `SET ${newCollectionName} __init__ POINT 0 0`
      );
      if (result.ok) {
        // Delete the init object
        await executeCommand(`DEL ${newCollectionName} __init__`);
        await fetchCollections();
        setSelectedCollection(newCollectionName);
        setShowCreateCollection(false);
        setNewCollectionName("");
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    } finally {
      setCreatingCollection(false);
    }
  };

  const deleteCollection = async () => {
    if (!selectedCollection) return;

    setDeletingCollection(true);
    try {
      const result = await executeCommand(`DROP ${selectedCollection}`);
      if (result.ok) {
        await fetchCollections();
        setSelectedCollection(null);
        setObjects([]);
        setShowDeleteCollection(false);
      }
    } catch (err) {
      console.error("Failed to delete collection:", err);
    } finally {
      setDeletingCollection(false);
    }
  };

  const createObject = async () => {
    if (!selectedCollection || !newObjectId.trim()) return;

    setCreatingObject(true);
    setObjectError("");

    try {
      // Build fields string
      const fieldsStr = objectFields
        .filter(f => f.key.trim() && f.value.trim())
        .map(f => `FIELD ${f.key.trim()} ${f.value.trim()}`)
        .join(" ");

      let command = "";
      const baseCmd = `SET ${selectedCollection} ${newObjectId}`;
      const fieldsCmd = fieldsStr ? ` ${fieldsStr}` : "";

      if (newObjectType === "Point") {
        if (!newObjectLon || !newObjectLat) {
          setObjectError("Longitude and latitude are required for Point");
          setCreatingObject(false);
          return;
        }
        command = `${baseCmd}${fieldsCmd} POINT ${newObjectLat} ${newObjectLon}`;
      } else if (newObjectType === "GeoJSON") {
        if (!newObjectGeoJSON.trim()) {
          setObjectError("GeoJSON is required");
          setCreatingObject(false);
          return;
        }
        try {
          JSON.parse(newObjectGeoJSON);
        } catch {
          setObjectError("Invalid JSON format");
          setCreatingObject(false);
          return;
        }
        command = `${baseCmd}${fieldsCmd} OBJECT ${newObjectGeoJSON}`;
      } else if (newObjectType === "DrawOnMap") {
        if (!drawnGeometry) {
          setObjectError("Please draw a geometry on the map");
          setCreatingObject(false);
          return;
        }
        const geojsonStr = JSON.stringify(drawnGeometry);
        command = `${baseCmd}${fieldsCmd} OBJECT ${geojsonStr}`;
      }

      const data = await executeCommand(command);
      if (data.ok) {
        await fetchObjects(selectedCollection);
        await fetchCollections();
        setShowCreateObject(false);
        resetObjectForm();
      } else {
        setObjectError(data.err || "Failed to create object");
      }
    } catch (err) {
      console.error("Failed to create object:", err);
      setObjectError("Failed to create object");
    } finally {
      setCreatingObject(false);
    }
  };

  const resetObjectForm = () => {
    setNewObjectId("");
    setNewObjectType("Point");
    setNewObjectLon("");
    setNewObjectLat("");
    setNewObjectGeoJSON("");
    setDrawnGeometry(null);
    setObjectError("");
    setObjectFields([]);
  };

  const addField = () => {
    setObjectFields([...objectFields, { key: "", value: "" }]);
  };

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...objectFields];
    newFields[index] = { key, value };
    setObjectFields(newFields);
  };

  const removeField = (index: number) => {
    setObjectFields(objectFields.filter((_, i) => i !== index));
  };

  const handleGeometryChange = useCallback((geojson: object | null) => {
    setDrawnGeometry(geojson);
  }, []);

  const handleTestPointSelect = useCallback((lat: number, lon: number) => {
    setTestPointLat(lat.toFixed(6));
    setTestPointLon(lon.toFixed(6));
    setTestPointResult(null);
  }, []);

  const testPoint = async () => {
    if (!selectedCollection || !testPointLat || !testPointLon) return;

    setTestingPoint(true);
    setTestPointResult(null);

    try {
      // Use INTERSECTS command to find objects that contain the point
      const data = await executeCommand(
        `INTERSECTS ${selectedCollection} POINT ${testPointLat} ${testPointLon}`
      );
      if (data.ok) {
        setTestPointResult({
          tested: true,
          matches: data.objects || [],
        });
      }
    } catch (err) {
      console.error("Failed to test point:", err);
    } finally {
      setTestingPoint(false);
    }
  };

  const resetTestPoint = () => {
    setTestPointLat("");
    setTestPointLon("");
    setTestPointResult(null);
  };

  const confirmDeleteObject = (key: string, id: string) => {
    setObjectToDelete({ key, id });
    setShowDeleteObject(true);
  };

  const deleteObject = async () => {
    if (!objectToDelete) return;

    setDeletingObject(true);
    try {
      const result = await executeCommand(`DEL ${objectToDelete.key} ${objectToDelete.id}`);
      if (result.ok) {
        setObjects((prev) => prev.filter((obj) => obj.id !== objectToDelete.id));
        await fetchCollections();
        setShowDeleteObject(false);
        setObjectToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete object:", err);
    } finally {
      setDeletingObject(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const filteredCollections = collections.filter((col) =>
    col.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Collections</h1>
              <HelpTooltip content="Collections are containers that group geospatial objects (points, lines, polygons). Each collection can contain thousands of objects that can be queried spatially." />
            </div>
            <p className="text-muted-foreground">
              Manage your geospatial collections and objects
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCollections()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreateCollection(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Collections list */}
          <Card className="w-80 flex-shrink-0 flex flex-col">
            <CardHeader className="py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <CardTitle className="text-sm font-medium">
                  Collections ({collections.length})
                </CardTitle>
              </div>
              <div className="mt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search collections..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading collections...
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No collections found</p>
                  <p className="text-xs mt-1">Click "New Collection" to create one</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCollections.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => setSelectedCollection(col.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                        selectedCollection === col.key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{col.key}</div>
                        <div
                          className={`text-xs ${selectedCollection === col.key ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {col.count} objects - {formatBytes(col.in_memory_size)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Objects list */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {selectedCollection
                    ? `Objects in "${selectedCollection}"`
                    : "Select a collection"}
                </CardTitle>
                {selectedCollection && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreateObject(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Object
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetTestPoint();
                        setShowTestPoint(true);
                      }}
                    >
                      <Crosshair className="w-4 h-4 mr-2" />
                      Test Point
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteCollection(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Collection
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {!selectedCollection ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MapPin className="w-12 h-12 mb-3 opacity-20" />
                  <p>Select a collection to view objects</p>
                </div>
              ) : objectsLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading objects...
                </div>
              ) : objects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MapPin className="w-12 h-12 mb-3 opacity-20" />
                  <p>No objects in this collection</p>
                  <p className="text-xs mt-1">Click "Add Object" to create one</p>
                </div>
              ) : (
                <div className="divide-y">
                  {objects.map((obj) => (
                    <div
                      key={obj.id}
                      className="px-4 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {obj.id}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Type: {obj.object?.type || "Unknown"}
                          </div>
                          {obj.object?.coordinates && (
                            <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                              {JSON.stringify(obj.object.coordinates).slice(
                                0,
                                50
                              )}
                              {JSON.stringify(obj.object.coordinates).length > 50 && "..."}
                            </div>
                          )}
                          {obj.fields && obj.fields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {obj.fields.map((field: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                                >
                                  {typeof field === 'object' ? `${Object.keys(field)[0]}: ${Object.values(field)[0]}` : field}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            selectedCollection && confirmDeleteObject(selectedCollection, obj.id)
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={showCreateCollection} onOpenChange={setShowCreateCollection}>
        <DialogContent className="w-full max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Enter a name for your new geospatial collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="collection-name"
                  help="A unique identifier for the collection. Use lowercase letters, numbers, and hyphens (e.g., 'vehicles', 'delivery-zones')."
                >
                  Collection Name
                </LabelWithHelp>
                <Input
                  id="collection-name"
                  placeholder="my-collection"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createCollection()}
                />
              </div>
            </div>
            <CliExample
              title="CLI Example"
              description="Collections are created automatically when you add the first object."
              commands={[
                {
                  label: "Create collection with a point:",
                  command: `SET ${newCollectionName || "my-collection"} object-id POINT -23.5505 -46.6333`,
                  description: "This creates the collection and adds a point object."
                },
                {
                  label: "Create collection with GeoJSON:",
                  command: `SET ${newCollectionName || "my-collection"} object-id OBJECT {"type":"Point","coordinates":[-46.6333,-23.5505]}`,
                  description: "Use OBJECT for complex geometries like polygons."
                },
              ]}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateCollection(false);
                setNewCollectionName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createCollection}
              disabled={!newCollectionName.trim() || creatingCollection}
            >
              {creatingCollection ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Object Dialog */}
      <Dialog
        open={showCreateObject}
        onOpenChange={(open) => {
          setShowCreateObject(open);
          if (!open) resetObjectForm();
        }}
      >
        <DialogContent className="w-[90vw] max-w-6xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New Object</DialogTitle>
            <DialogDescription>
              Add a new geospatial object to "{selectedCollection}".
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className={newObjectType === "DrawOnMap" ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
              {/* Form Section */}
              <div className={newObjectType === "DrawOnMap" ? "" : "lg:col-span-2 space-y-4"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithHelp
                      htmlFor="object-id"
                      help="A unique identifier for this object within the collection. Can be any string (e.g., 'truck-123', 'warehouse-sp-01')."
                    >
                      Object ID
                    </LabelWithHelp>
                    <Input
                      id="object-id"
                      placeholder="my-object-id"
                      value={newObjectId}
                      onChange={(e) => setNewObjectId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithHelp
                      htmlFor="object-type"
                      help="Choose how to define the geometry: Point for a single location, Draw on Map for polygons/lines, or GeoJSON for raw coordinate data."
                    >
                      Type
                    </LabelWithHelp>
                    <Select
                      id="object-type"
                      value={newObjectType}
                      onChange={(e) => {
                        setNewObjectType(e.target.value);
                        setDrawnGeometry(null);
                      }}
                    >
                      <option value="Point">Point (Latitude/Longitude)</option>
                      <option value="DrawOnMap">Draw on Map</option>
                      <option value="GeoJSON">GeoJSON (Manual)</option>
                    </Select>
                  </div>
                </div>

                {newObjectType === "Point" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <LabelWithHelp
                        htmlFor="object-lat"
                        help="Latitude in decimal degrees. Ranges from -90 (South Pole) to 90 (North Pole). Example: São Paulo is -23.5505"
                      >
                        Latitude
                      </LabelWithHelp>
                      <Input
                        id="object-lat"
                        type="number"
                        step="any"
                        placeholder="-23.5505"
                        value={newObjectLat}
                        onChange={(e) => setNewObjectLat(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <LabelWithHelp
                        htmlFor="object-lon"
                        help="Longitude in decimal degrees. Ranges from -180 (West) to 180 (East). Example: São Paulo is -46.6333"
                      >
                        Longitude
                      </LabelWithHelp>
                      <Input
                        id="object-lon"
                        type="number"
                        step="any"
                        placeholder="-46.6333"
                        value={newObjectLon}
                        onChange={(e) => setNewObjectLon(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {newObjectType === "DrawOnMap" && (
                  <div className="space-y-2">
                    <LabelWithHelp
                      help="Use the drawing tools to create a point, line, or polygon. Click on the map to add vertices. Double-click to finish. Gray objects show existing items in the collection."
                    >
                      Draw Geometry
                    </LabelWithHelp>
                    <MapDrawer
                      onGeometryChange={handleGeometryChange}
                      existingObjects={objects}
                    />
                    {drawnGeometry && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Geometry: {(drawnGeometry as any).type}
                      </div>
                    )}
                  </div>
                )}

                {newObjectType === "GeoJSON" && (
                  <div className="space-y-2">
                    <Label htmlFor="object-geojson">GeoJSON</Label>
                    <Textarea
                      id="object-geojson"
                      placeholder='{"type": "Point", "coordinates": [-46.6333, -23.5505]}'
                      className="font-mono text-sm min-h-[120px]"
                      value={newObjectGeoJSON}
                      onChange={(e) => setNewObjectGeoJSON(e.target.value)}
                    />
                  </div>
                )}

                {/* Custom Fields Section */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <LabelWithHelp
                      help="Add custom metadata fields to this object (e.g., tenant_uuid, driver_id, trip_id). Fields can be used in queries with WHERE clauses."
                    >
                      Custom Fields (Optional)
                    </LabelWithHelp>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addField}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  {objectFields.length > 0 && (
                    <div className="space-y-2">
                      {objectFields.map((field, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="Field name (e.g., tenant_uuid)"
                            value={field.key}
                            onChange={(e) => updateField(index, e.target.value, field.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => updateField(index, field.key, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeField(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {objectFields.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No custom fields. Click "Add Field" to add metadata like tenant_uuid, driver_id, etc.
                    </p>
                  )}
                </div>

                {objectError && (
                  <div className="text-sm text-destructive">{objectError}</div>
                )}
              </div>

              {/* CLI Examples Section */}
              <div className={newObjectType === "DrawOnMap" ? "" : "lg:col-span-1"}>
                <CliExample
                  title="CLI Examples"
                  description="Create objects via command line."
                  commands={
                    newObjectType === "Point"
                      ? [
                          {
                            label: "Your command:",
                            command: `SET ${selectedCollection || "collection"} ${newObjectId || "object-id"}${objectFields.filter(f => f.key && f.value).map(f => ` FIELD ${f.key} ${f.value}`).join("")} POINT ${newObjectLat || "-23.5505"} ${newObjectLon || "-46.6333"}`,
                            description: objectFields.length > 0 ? "With your custom fields" : "Format: SET key id POINT lat lon"
                          },
                          {
                            label: "With expiration (60 seconds):",
                            command: `SET ${selectedCollection || "collection"} ${newObjectId || "object-id"} EX 60 POINT ${newObjectLat || "-23.5505"} ${newObjectLon || "-46.6333"}`,
                          },
                          {
                            label: "Query objects by field:",
                            command: `SCAN ${selectedCollection || "collection"} WHERE tenant_uuid abc123`,
                            description: "Use WHERE to filter by field values"
                          },
                        ]
                      : newObjectType === "GeoJSON"
                      ? [
                          {
                            label: "Your command:",
                            command: `SET ${selectedCollection || "collection"} ${newObjectId || "object-id"}${objectFields.filter(f => f.key && f.value).map(f => ` FIELD ${f.key} ${f.value}`).join("")} OBJECT ${newObjectGeoJSON || '{"type":"Point","coordinates":[-46.6333,-23.5505]}'}`,
                            description: objectFields.length > 0 ? "With your custom fields" : "Use OBJECT for any GeoJSON geometry."
                          },
                          {
                            label: "Query objects by field:",
                            command: `SCAN ${selectedCollection || "collection"} WHERE tenant_uuid abc123`,
                            description: "Use WHERE to filter by field values"
                          },
                        ]
                      : [
                          {
                            label: "Point with fields:",
                            command: `SET ${selectedCollection || "collection"} ${newObjectId || "object-id"} FIELD tenant_uuid abc123 FIELD driver_id xyz POINT -23.5505 -46.6333`,
                          },
                          {
                            label: "Polygon with fields:",
                            command: `SET ${selectedCollection || "collection"} ${newObjectId || "object-id"} FIELD tenant_uuid abc123 OBJECT {"type":"Polygon","coordinates":[[[-46.7,-23.6],[-46.6,-23.6],[-46.6,-23.5],[-46.7,-23.5],[-46.7,-23.6]]]}`,
                          },
                          {
                            label: "Query by field:",
                            command: `SCAN ${selectedCollection || "collection"} WHERE tenant_uuid abc123`,
                            description: "Filter objects by field values"
                          },
                        ]
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateObject(false);
                resetObjectForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createObject}
              disabled={!newObjectId.trim() || creatingObject}
            >
              {creatingObject ? "Adding..." : "Add Object"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Collection Dialog */}
      <Dialog open={showDeleteCollection} onOpenChange={setShowDeleteCollection}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCollection}"? This will
              permanently remove all objects in this collection. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteCollection(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteCollection}
              disabled={deletingCollection}
            >
              {deletingCollection ? "Deleting..." : "Delete Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Point Dialog */}
      <Dialog
        open={showTestPoint}
        onOpenChange={(open) => {
          setShowTestPoint(open);
          if (!open) resetTestPoint();
        }}
      >
        <DialogContent className="w-full max-w-4xl">
          <DialogHeader>
            <DialogTitle>Test Point</DialogTitle>
            <DialogDescription>
              Test if a point intersects with objects in "{selectedCollection}".
              Click on the map or enter coordinates manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <MapPointPicker
              onPointSelect={handleTestPointSelect}
              selectedPoint={
                testPointLat && testPointLon
                  ? { lat: parseFloat(testPointLat), lon: parseFloat(testPointLon) }
                  : null
              }
              geoObjects={objects}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-lat">Latitude</Label>
                <Input
                  id="test-lat"
                  type="number"
                  step="any"
                  placeholder="-23.5505"
                  value={testPointLat}
                  onChange={(e) => {
                    setTestPointLat(e.target.value);
                    setTestPointResult(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-lon">Longitude</Label>
                <Input
                  id="test-lon"
                  type="number"
                  step="any"
                  placeholder="-46.6333"
                  value={testPointLon}
                  onChange={(e) => {
                    setTestPointLon(e.target.value);
                    setTestPointResult(null);
                  }}
                />
              </div>
            </div>

            {testPointResult && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  {testPointResult.matches.length > 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-green-600">
                        Point intersects with {testPointResult.matches.length} object(s)
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-orange-500" />
                      <span className="font-medium text-orange-600">
                        Point does not intersect with any objects
                      </span>
                    </>
                  )}
                </div>
                {testPointResult.matches.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Matching objects:</p>
                    <div className="max-h-[150px] overflow-auto space-y-1">
                      {testPointResult.matches.map((match) => (
                        <div
                          key={match.id}
                          className="text-sm p-2 bg-background rounded border"
                        >
                          <span className="font-medium">{match.id}</span>
                          <span className="text-muted-foreground ml-2">
                            ({match.object?.type || "Unknown"})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTestPoint(false);
                resetTestPoint();
              }}
            >
              Close
            </Button>
            <Button
              onClick={testPoint}
              disabled={!testPointLat || !testPointLon || testingPoint}
            >
              {testingPoint ? "Testing..." : "Test Point"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Object Alert Dialog */}
      <AlertDialog
        open={showDeleteObject}
        onOpenChange={(open) => {
          setShowDeleteObject(open);
          if (!open) setObjectToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Object</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the object "{objectToDelete?.id}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteObject(false);
                setObjectToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteObject}
              disabled={deletingObject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingObject ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
