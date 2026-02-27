"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Webhook,
  Bell,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { CliExample } from "@/components/ui/cli-example";
import { executeCommand } from "@/lib/api";

interface Hook {
  name: string;
  key: string;
  endpoints: string[];
  command: string[];
  meta: any;
}

interface Collection {
  key: string;
}

interface GeoObject {
  id: string;
  object: any;
}

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Create hook dialog
  const [showCreateHook, setShowCreateHook] = useState(false);
  const [newHookName, setNewHookName] = useState("");
  const [newHookEndpoint, setNewHookEndpoint] = useState("");
  const [newHookCollection, setNewHookCollection] = useState("");
  const [newHookType, setNewHookType] = useState("WITHIN");
  const [newHookDetect, setNewHookDetect] = useState("enter,exit");

  // Geofence source: "object" (use existing object) or "bounds" (manual coordinates)
  const [geofenceSource, setGeofenceSource] = useState<"object" | "bounds">("object");
  const [geofenceCollection, setGeofenceCollection] = useState("");
  const [geofenceObjectId, setGeofenceObjectId] = useState("");
  const [geofenceObjects, setGeofenceObjects] = useState<GeoObject[]>([]);
  const [loadingGeofenceObjects, setLoadingGeofenceObjects] = useState(false);

  const [newHookBounds, setNewHookBounds] = useState({
    minLat: "",
    minLon: "",
    maxLat: "",
    maxLon: "",
  });
  const [creatingHook, setCreatingHook] = useState(false);
  const [hookError, setHookError] = useState("");

  // Delete hook dialog
  const [showDeleteHook, setShowDeleteHook] = useState(false);
  const [hookToDelete, setHookToDelete] = useState<string | null>(null);
  const [deletingHook, setDeletingHook] = useState(false);

  useEffect(() => {
    fetchHooks();
    fetchCollections();
  }, []);

  const fetchHooks = async () => {
    setLoading(true);
    try {
      const data = await executeCommand("HOOKS *");
      if (data.ok && data.hooks) {
        setHooks(data.hooks);
      } else {
        setHooks([]);
      }
    } catch (err) {
      console.error("Failed to fetch hooks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const data = await executeCommand("KEYS *");
      if (data.ok && data.keys) {
        setCollections(data.keys.map((key: string) => ({ key })));
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  };

  const fetchGeofenceObjects = async (collectionKey: string) => {
    if (!collectionKey) {
      setGeofenceObjects([]);
      return;
    }

    setLoadingGeofenceObjects(true);
    try {
      const data = await executeCommand(`SCAN ${collectionKey}`);
      if (data.ok && data.objects) {
        setGeofenceObjects(data.objects);
      } else {
        setGeofenceObjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch geofence objects:", err);
      setGeofenceObjects([]);
    } finally {
      setLoadingGeofenceObjects(false);
    }
  };

  // Fetch objects when geofence collection changes
  useEffect(() => {
    if (geofenceCollection) {
      fetchGeofenceObjects(geofenceCollection);
      setGeofenceObjectId("");
    } else {
      setGeofenceObjects([]);
    }
  }, [geofenceCollection]);

  const createHook = async () => {
    if (!newHookName.trim() || !newHookEndpoint.trim() || !newHookCollection) {
      setHookError("Name, endpoint, and collection are required");
      return;
    }

    // Validate geofence source
    if (geofenceSource === "object") {
      if (!geofenceCollection || !geofenceObjectId) {
        setHookError("Please select a collection and object for the geofence area");
        return;
      }
    } else {
      if (
        !newHookBounds.minLat ||
        !newHookBounds.minLon ||
        !newHookBounds.maxLat ||
        !newHookBounds.maxLon
      ) {
        setHookError("All bounds coordinates are required");
        return;
      }
    }

    setCreatingHook(true);
    setHookError("");

    try {
      const detectClause = newHookDetect ? `DETECT ${newHookDetect}` : "";
      let command: string;

      if (geofenceSource === "object") {
        // SETHOOK name endpoint WITHIN|INTERSECTS key FENCE DETECT detect GET geofenceKey geofenceId
        command = `SETHOOK ${newHookName} ${newHookEndpoint} ${newHookType} ${newHookCollection} FENCE ${detectClause} GET ${geofenceCollection} ${geofenceObjectId}`;
      } else {
        // SETHOOK name endpoint WITHIN|INTERSECTS key FENCE DETECT detect BOUNDS minlat minlon maxlat maxlon
        command = `SETHOOK ${newHookName} ${newHookEndpoint} ${newHookType} ${newHookCollection} FENCE ${detectClause} BOUNDS ${newHookBounds.minLat} ${newHookBounds.minLon} ${newHookBounds.maxLat} ${newHookBounds.maxLon}`;
      }

      const data = await executeCommand(command);
      if (data.ok) {
        await fetchHooks();
        setShowCreateHook(false);
        resetHookForm();
      } else {
        setHookError(data.err || "Failed to create webhook");
      }
    } catch (err) {
      console.error("Failed to create hook:", err);
      setHookError("Failed to create webhook");
    } finally {
      setCreatingHook(false);
    }
  };

  const confirmDeleteHook = (name: string) => {
    setHookToDelete(name);
    setShowDeleteHook(true);
  };

  const deleteHook = async () => {
    if (!hookToDelete) return;

    setDeletingHook(true);
    try {
      const result = await executeCommand(`DELHOOK ${hookToDelete}`);
      if (result.ok) {
        await fetchHooks();
        setShowDeleteHook(false);
        setHookToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete hook:", err);
    } finally {
      setDeletingHook(false);
    }
  };

  const resetHookForm = () => {
    setNewHookName("");
    setNewHookEndpoint("");
    setNewHookCollection("");
    setNewHookType("WITHIN");
    setNewHookDetect("enter,exit");
    setGeofenceSource("object");
    setGeofenceCollection("");
    setGeofenceObjectId("");
    setGeofenceObjects([]);
    setNewHookBounds({ minLat: "", minLon: "", maxLat: "", maxLon: "" });
    setHookError("");
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Webhooks & Geofences</h1>
            <p className="text-muted-foreground">
              Configure webhooks to receive notifications when objects enter or
              leave geofenced areas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchHooks()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetHookForm();
                setShowCreateHook(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Webhook
            </Button>
          </div>
        </div>

        <Card className="flex-1">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              <CardTitle className="text-sm font-medium">
                Active Webhooks ({hooks.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading webhooks...
              </div>
            ) : hooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p>No webhooks configured</p>
                <p className="text-xs mt-1">
                  Click "New Webhook" to create a geofence notification
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {hooks.map((hook) => (
                  <div
                    key={hook.name}
                    className="px-6 py-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{hook.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {hook.command?.[0] || "UNKNOWN"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Collection:{" "}
                          <span className="font-mono">{hook.key}</span>
                        </div>
                        {hook.endpoints && hook.endpoints.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <ExternalLink className="w-3 h-3" />
                            <span className="font-mono text-xs truncate max-w-md">
                              {hook.endpoints[0]}
                            </span>
                          </div>
                        )}
                        {hook.command && hook.command.length > 1 && (
                          <div className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 p-2 rounded">
                            {hook.command.join(" ")}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDeleteHook(hook.name)}
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

      {/* Create Webhook Dialog */}
      <Dialog
        open={showCreateHook}
        onOpenChange={(open) => {
          setShowCreateHook(open);
          if (!open) resetHookForm();
        }}
      >
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure a geofence webhook to receive notifications when objects
              enter or leave an area.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 py-4">
            {/* Form Section */}
            <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hook-name">Webhook Name</Label>
                <Input
                  id="hook-name"
                  placeholder="my-geofence"
                  value={newHookName}
                  onChange={(e) => setNewHookName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hook-collection">Collection to Monitor</Label>
                <Select
                  id="hook-collection"
                  value={newHookCollection}
                  onChange={(e) => setNewHookCollection(e.target.value)}
                >
                  <option value="">Select collection...</option>
                  {collections.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.key}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hook-endpoint">Webhook URL</Label>
              <Input
                id="hook-endpoint"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={newHookEndpoint}
                onChange={(e) => setNewHookEndpoint(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                POST request will be sent to this URL when events occur
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hook-type">Fence Type</Label>
                <Select
                  id="hook-type"
                  value={newHookType}
                  onChange={(e) => setNewHookType(e.target.value)}
                >
                  <option value="WITHIN">WITHIN (inside area)</option>
                  <option value="INTERSECTS">INTERSECTS (touches area)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hook-detect">Detect Events</Label>
                <Select
                  id="hook-detect"
                  value={newHookDetect}
                  onChange={(e) => setNewHookDetect(e.target.value)}
                >
                  <option value="enter,exit">Enter & Exit</option>
                  <option value="enter">Enter only</option>
                  <option value="exit">Exit only</option>
                  <option value="inside,outside">Inside & Outside</option>
                  <option value="cross">Cross (line crossing)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Geofence Area</Label>
              <Select
                value={geofenceSource}
                onChange={(e) => setGeofenceSource(e.target.value as "object" | "bounds")}
              >
                <option value="object">Use Existing Object</option>
                <option value="bounds">Define Bounds Manually</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {geofenceSource === "object"
                  ? "Select an existing polygon or geometry as the geofence area"
                  : "Define a rectangular area using coordinates"}
              </p>
            </div>

            {geofenceSource === "object" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="geofence-collection">Geofence Collection</Label>
                    <Select
                      id="geofence-collection"
                      value={geofenceCollection}
                      onChange={(e) => setGeofenceCollection(e.target.value)}
                    >
                      <option value="">Select collection...</option>
                      {collections.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.key}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="geofence-object">Geofence Object</Label>
                    <Select
                      id="geofence-object"
                      value={geofenceObjectId}
                      onChange={(e) => setGeofenceObjectId(e.target.value)}
                      disabled={!geofenceCollection || loadingGeofenceObjects}
                    >
                      <option value="">
                        {loadingGeofenceObjects
                          ? "Loading..."
                          : geofenceCollection
                          ? "Select object..."
                          : "Select collection first"}
                      </option>
                      {geofenceObjects.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                          {obj.id} ({obj.object?.type || "Unknown"})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The selected object&apos;s geometry will be used as the geofence boundary.
                  Objects in &quot;{newHookCollection || "..."}&quot; will trigger events when they
                  enter/exit this area.
                </p>
              </div>
            )}

            {geofenceSource === "bounds" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hook-minlat" className="text-xs">
                      Min Latitude (SW)
                    </Label>
                    <Input
                      id="hook-minlat"
                      type="number"
                      step="any"
                      placeholder="-23.60"
                      value={newHookBounds.minLat}
                      onChange={(e) =>
                        setNewHookBounds({
                          ...newHookBounds,
                          minLat: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hook-minlon" className="text-xs">
                      Min Longitude (SW)
                    </Label>
                    <Input
                      id="hook-minlon"
                      type="number"
                      step="any"
                      placeholder="-46.70"
                      value={newHookBounds.minLon}
                      onChange={(e) =>
                        setNewHookBounds({
                          ...newHookBounds,
                          minLon: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hook-maxlat" className="text-xs">
                      Max Latitude (NE)
                    </Label>
                    <Input
                      id="hook-maxlat"
                      type="number"
                      step="any"
                      placeholder="-23.50"
                      value={newHookBounds.maxLat}
                      onChange={(e) =>
                        setNewHookBounds({
                          ...newHookBounds,
                          maxLat: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hook-maxlon" className="text-xs">
                      Max Longitude (NE)
                    </Label>
                    <Input
                      id="hook-maxlon"
                      type="number"
                      step="any"
                      placeholder="-46.60"
                      value={newHookBounds.maxLon}
                      onChange={(e) =>
                        setNewHookBounds({
                          ...newHookBounds,
                          maxLon: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Define the rectangular area for the geofence (Southwest to
                  Northeast corners)
                </p>
              </div>
            )}

            {hookError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {hookError}
              </div>
            )}
            </div>

            {/* CLI Examples Section */}
            <div className="lg:col-span-2">
              <CliExample
                title="CLI Examples"
                description="Create webhooks via command line using SETHOOK."
                commands={
                  geofenceSource === "object" && geofenceCollection && geofenceObjectId
                    ? [
                        {
                          label: "Using existing object as geofence:",
                          command: `SETHOOK ${newHookName || "my-hook"} ${newHookEndpoint || "http://localhost:8080/webhook"} ${newHookType} ${newHookCollection || "collection"} FENCE DETECT ${newHookDetect} GET ${geofenceCollection} ${geofenceObjectId}`,
                          description: "GET references an existing object's geometry as the fence area."
                        },
                        {
                          label: "Delete webhook:",
                          command: `DELHOOK ${newHookName || "my-hook"}`,
                        },
                        {
                          label: "List all webhooks:",
                          command: "HOOKS *",
                        },
                      ]
                    : [
                        {
                          label: "Using BOUNDS (rectangle):",
                          command: `SETHOOK ${newHookName || "my-hook"} ${newHookEndpoint || "http://localhost:8080/webhook"} ${newHookType} ${newHookCollection || "collection"} FENCE DETECT ${newHookDetect} BOUNDS ${newHookBounds.minLat || "-23.60"} ${newHookBounds.minLon || "-46.70"} ${newHookBounds.maxLat || "-23.50"} ${newHookBounds.maxLon || "-46.60"}`,
                          description: "BOUNDS creates a rectangular geofence area."
                        },
                        {
                          label: "Using CIRCLE:",
                          command: `SETHOOK ${newHookName || "my-hook"} ${newHookEndpoint || "http://localhost:8080/webhook"} ${newHookType} ${newHookCollection || "collection"} FENCE DETECT ${newHookDetect} CIRCLE -23.55 -46.63 1000`,
                          description: "CIRCLE lat lon meters - circular geofence."
                        },
                        {
                          label: "Using GET (existing object):",
                          command: `SETHOOK ${newHookName || "my-hook"} ${newHookEndpoint || "http://localhost:8080/webhook"} ${newHookType} ${newHookCollection || "collection"} FENCE DETECT ${newHookDetect} GET geofence-collection polygon-id`,
                          description: "GET references an existing object's geometry."
                        },
                        {
                          label: "Delete webhook:",
                          command: `DELHOOK ${newHookName || "my-hook"}`,
                        },
                      ]
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateHook(false);
                resetHookForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={createHook} disabled={creatingHook}>
              {creatingHook ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Webhook Alert Dialog */}
      <AlertDialog
        open={showDeleteHook}
        onOpenChange={(open) => {
          setShowDeleteHook(open);
          if (!open) setHookToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the webhook "{hookToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteHook(false);
                setHookToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteHook}
              disabled={deletingHook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingHook ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
