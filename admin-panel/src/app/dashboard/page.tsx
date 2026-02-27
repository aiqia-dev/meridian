"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatsChart } from "@/components/dashboard/stats-chart";
import { executeCommand } from "@/lib/api";
import {
  Database,
  HardDrive,
  Network,
  Clock,
  Layers,
  MapPin,
  Server,
} from "lucide-react";

interface ServerStats {
  num_collections: number;
  num_objects: number;
  heap_size: number;
  num_points: number;
  mem_alloc: number;
  pid: number;
  aof_size: number;
  num_hooks: number;
  in_memory_size: number;
  num_strings: number;
  version: string;
  cpus: number;
  max_heap_size: number;
  heap_released: number;
  sys_mem_total: number;
  sys_mem_free: number;
  sys_mem_available: number;
  sys_mem_used: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<
    { time: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await executeCommand("SERVER");
        if (data.ok && data.stats) {
          setStats(data.stats);
          // Add to memory history
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
          setMemoryHistory((prev) => {
            const newHistory = [
              ...prev,
              { time: timeStr, value: data.stats.heap_size / (1024 * 1024) },
            ];
            return newHistory.slice(-20); // Keep last 20 points
          });
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">
            Loading metrics...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time server metrics and statistics
            {stats?.version && (
              <span className="ml-2 px-2 py-0.5 bg-primary/10 rounded text-xs">
                v{stats.version}
              </span>
            )}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Collections"
            value={stats?.num_collections ?? 0}
            description="Total geospatial collections"
            icon={Layers}
          />
          <MetricCard
            title="Objects"
            value={stats?.num_objects ?? 0}
            description="Total stored objects"
            icon={MapPin}
          />
          <MetricCard
            title="Memory Usage"
            value={formatBytes(stats?.heap_size ?? 0)}
            description="Current heap size"
            icon={HardDrive}
          />
          <MetricCard
            title="System Memory"
            value={formatBytes(stats?.sys_mem_available ?? 0)}
            description={
              stats?.sys_mem_total
                ? `${formatBytes(stats.sys_mem_total)} total`
                : "Available RAM"
            }
            icon={Server}
          />
          <MetricCard
            title="Points"
            value={stats?.num_points ?? 0}
            description="Total geospatial points"
            icon={Database}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <StatsChart
            title="Memory Usage (MB)"
            data={memoryHistory}
            color="hsl(var(--primary))"
            unit="MB"
          />
          <div className="space-y-4">
            <MetricCard
              title="AOF Size"
              value={formatBytes(stats?.aof_size ?? 0)}
              description="Append-only file size"
              icon={Database}
            />
            <MetricCard
              title="In-Memory Size"
              value={formatBytes(stats?.in_memory_size ?? 0)}
              description="Total in-memory data"
              icon={HardDrive}
            />
          </div>
        </div>

        {/* Server Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Hooks"
            value={stats?.num_hooks ?? 0}
            description="Active webhooks/geofences"
            icon={Network}
          />
          <MetricCard
            title="Strings"
            value={stats?.num_strings ?? 0}
            description="Stored string values"
            icon={Database}
          />
          <MetricCard
            title="CPUs"
            value={stats?.cpus ?? 0}
            description="Available CPU cores"
            icon={Clock}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
