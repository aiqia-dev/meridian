"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CliExample } from "@/components/ui/cli-example";
import { Button } from "@/components/ui/button";
import {
  Database,
  MapPin,
  Webhook,
  Building2,
  GitBranch,
  Layers,
  Search,
  Code,
  Languages,
} from "lucide-react";

type Language = "en" | "pt";

const content = {
  en: {
    title: "About AIQIA Meridian",
    subtitle: "Meridian is a high-performance geospatial database designed for real-time location tracking, geofencing, and spatial queries. This guide explains the core concepts and best practices for multi-tenant architectures.",

    collections: {
      title: "Collections",
      description: "Containers for grouping geospatial objects",
      content: "Collections are the primary way to organize your data. Think of them as tables in a traditional database, but optimized for geospatial operations. Each collection can contain thousands of objects that can be queried spatially in real-time.",
      whenToUse: "When to use collections:",
      uses: [
        "Group objects by type (vehicles, warehouses, zones)",
        "Separate data by tenant or organization",
        "Organize by geographical region",
        "Isolate different environments (dev, staging, prod)"
      ],
      cliTitle: "Create Collection",
      cliDescription: "Collections are created automatically when adding the first object"
    },

    objects: {
      title: "Objects",
      description: "Geospatial entities with location and metadata",
      content: "Objects are the core data units in Meridian. Each object has a unique ID within its collection, a geometry (point, line, polygon), and optional custom fields for metadata.",
      geometryTypes: "Geometry Types",
      geometries: [
        { code: "POINT", desc: "Single location" },
        { code: "BOUNDS", desc: "Rectangle" },
        { code: "OBJECT", desc: "GeoJSON" },
        { code: "CIRCLE", desc: "Radius" }
      ],
      customFields: "Custom Fields",
      fieldsList: [
        "Add metadata to objects",
        "Filter queries with WHERE",
        "Numeric values only",
        "Use for IDs, status, speed"
      ],
      options: "Options",
      optionsList: [
        { code: "EX", desc: "Expiration (TTL)" },
        { code: "NX", desc: "Only if not exists" },
        { code: "XX", desc: "Only if exists" }
      ],
      cliTitle: "Object Examples",
      cliCommands: [
        { label: "Point with fields:", command: "SET vehicles truck-001 FIELD tenant_uuid 12345 FIELD speed 60 POINT -23.55 -46.63" },
        { label: "Polygon (delivery zone):", command: 'SET zones zone-sp-01 FIELD tenant_uuid 12345 OBJECT {"type":"Polygon","coordinates":[[[-46.7,-23.6],[-46.6,-23.6],[-46.6,-23.5],[-46.7,-23.5],[-46.7,-23.6]]]}' },
        { label: "Point with 60s expiration:", command: "SET vehicles truck-001 EX 60 POINT -23.55 -46.63" }
      ]
    },

    webhooks: {
      title: "Webhooks (Geofences)",
      description: "Real-time notifications for spatial events",
      content: "Webhooks allow you to receive HTTP notifications when objects enter or exit defined areas. Perfect for geofencing, delivery tracking, fleet management, and location-based alerts.",
      eventTypes: "Event Types",
      events: [
        { code: "enter", desc: "Object enters area" },
        { code: "exit", desc: "Object leaves area" },
        { code: "inside", desc: "Object is inside" },
        { code: "outside", desc: "Object is outside" },
        { code: "cross", desc: "Line crossing" }
      ],
      fenceTypes: "Fence Types",
      fences: [
        { code: "WITHIN", desc: "Completely inside" },
        { code: "INTERSECTS", desc: "Touches area" },
        { code: "NEARBY", desc: "Within distance" }
      ],
      cliTitle: "Webhook Examples",
      cliCommands: [
        { label: "Geofence with bounds:", command: "SETHOOK delivery-alert http://api.example.com/webhook WITHIN vehicles FENCE DETECT enter,exit BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Using existing polygon:", command: "SETHOOK zone-alert http://api.example.com/webhook WITHIN vehicles FENCE DETECT enter,exit GET zones zone-sp-01" },
        { label: "Circular geofence (1km radius):", command: "SETHOOK nearby-alert http://api.example.com/webhook NEARBY vehicles FENCE DETECT enter POINT -23.55 -46.63 1000" }
      ]
    },

    multiTenant: {
      title: "Multi-Tenant Architecture",
      description: "Best practices for multiple organizations",
      content: "When multiple companies or tenants use the same Meridian instance, you have two main strategies for data isolation: collection-based separation or field-based filtering.",
      strategy1: {
        title: "Strategy 1: Collection per Tenant",
        content: "Create separate collections for each tenant. Provides complete data isolation and simpler queries.",
        examples: ["tenant_abc_vehicles", "tenant_abc_zones", "tenant_xyz_vehicles", "tenant_xyz_zones"],
        pros: "Complete isolation, simpler queries",
        cons: "More collections to manage"
      },
      strategy2: {
        title: "Strategy 2: Field-Based Filtering",
        content: "Use custom fields to tag objects with tenant information. Filter queries using WHERE clauses.",
        examples: ["SET vehicles truck-001 FIELD tenant 123 ...", "SCAN vehicles WHERE tenant 123", "WITHIN vehicles WHERE tenant 123 ..."],
        pros: "Fewer collections, flexible",
        cons: "Requires WHERE in all queries"
      },
      cliTitle: "Multi-Tenant Examples",
      cliCommands: [
        { label: "Add object with tenant and branch:", command: "SET vehicles truck-001 FIELD tenant_uuid 12345 FIELD branch_id 67 FIELD driver_uuid 89 POINT -23.55 -46.63" },
        { label: "Query by tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345" },
        { label: "Spatial query with tenant filter:", command: "WITHIN vehicles WHERE tenant_uuid 12345 BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Query by tenant and branch:", command: "SCAN vehicles WHERE tenant_uuid 12345 WHERE branch_id 67" }
      ]
    },

    branch: {
      title: "Branch & Hierarchy Organization",
      description: "Organizing data by business units",
      content: "For organizations with multiple branches, regions, or business units, you can use fields to create a hierarchy. This allows flexible querying at any level.",
      fieldStructure: "Recommended Field Structure",
      fields: [
        { code: "tenant_uuid", desc: "Organization/company identifier" },
        { code: "branch_id", desc: "Branch/unit identifier" },
        { code: "driver_uuid", desc: "Driver/operator identifier" },
        { code: "trip_id", desc: "Trip/route identifier" },
        { code: "vehicle_type", desc: "Type classification (1=truck, 2=bike)" },
        { code: "status", desc: "Status code (1=active, 0=inactive)" }
      ],
      cliTitle: "Hierarchy Query Examples",
      cliCommands: [
        { label: "All vehicles from branch 67:", command: "SCAN vehicles WHERE branch_id 67" },
        { label: "Active vehicles from tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345 WHERE status 1" },
        { label: "Vehicles in area from specific driver:", command: "WITHIN vehicles WHERE driver_uuid 89 BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Count objects by tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345 COUNT" }
      ]
    },

    quickRef: {
      title: "Quick Reference",
      description: "Common commands cheat sheet",
      objectCommands: "Object Commands",
      objectCli: [
        { label: "Create/Update:", command: "SET key id [FIELD name value] ... geometry" },
        { label: "Get object:", command: "GET key id" },
        { label: "Delete:", command: "DEL key id" },
        { label: "List all:", command: "SCAN key [WHERE field value] LIMIT n" }
      ],
      spatialQueries: "Spatial Queries",
      spatialCli: [
        { label: "Within bounds:", command: "WITHIN key BOUNDS minlat minlon maxlat maxlon" },
        { label: "Within circle:", command: "NEARBY key POINT lat lon meters" },
        { label: "Intersects:", command: "INTERSECTS key OBJECT {geojson}" }
      ],
      collectionCommands: "Collection Commands",
      collectionCli: [
        { label: "List collections:", command: "KEYS *" },
        { label: "Collection stats:", command: "STATS key" },
        { label: "Drop collection:", command: "DROP key" }
      ],
      webhookCommands: "Webhook Commands",
      webhookCli: [
        { label: "Create webhook:", command: "SETHOOK name url WITHIN key FENCE DETECT events ..." },
        { label: "List webhooks:", command: "HOOKS *" },
        { label: "Delete webhook:", command: "DELHOOK name" }
      ]
    }
  },

  pt: {
    title: "Sobre o AIQIA Meridian",
    subtitle: "Meridian é um banco de dados geoespacial de alta performance projetado para rastreamento de localização em tempo real, geofencing e consultas espaciais. Este guia explica os conceitos principais e melhores práticas para arquiteturas multi-tenant.",

    collections: {
      title: "Collections",
      description: "Containers para agrupar objetos geoespaciais",
      content: "Collections são a forma principal de organizar seus dados. Pense nelas como tabelas em um banco de dados tradicional, mas otimizadas para operações geoespaciais. Cada collection pode conter milhares de objetos que podem ser consultados espacialmente em tempo real.",
      whenToUse: "Quando usar collections:",
      uses: [
        "Agrupar objetos por tipo (veículos, armazéns, zonas)",
        "Separar dados por tenant ou organização",
        "Organizar por região geográfica",
        "Isolar diferentes ambientes (dev, staging, prod)"
      ],
      cliTitle: "Criar Collection",
      cliDescription: "Collections são criadas automaticamente ao adicionar o primeiro objeto"
    },

    objects: {
      title: "Objects",
      description: "Entidades geoespaciais com localização e metadados",
      content: "Objects são as unidades de dados principais no Meridian. Cada objeto tem um ID único dentro da sua collection, uma geometria (ponto, linha, polígono) e campos personalizados opcionais para metadados.",
      geometryTypes: "Tipos de Geometria",
      geometries: [
        { code: "POINT", desc: "Localização única" },
        { code: "BOUNDS", desc: "Retângulo" },
        { code: "OBJECT", desc: "GeoJSON" },
        { code: "CIRCLE", desc: "Raio" }
      ],
      customFields: "Campos Personalizados",
      fieldsList: [
        "Adicionar metadados aos objetos",
        "Filtrar consultas com WHERE",
        "Apenas valores numéricos",
        "Use para IDs, status, velocidade"
      ],
      options: "Opções",
      optionsList: [
        { code: "EX", desc: "Expiração (TTL)" },
        { code: "NX", desc: "Apenas se não existir" },
        { code: "XX", desc: "Apenas se existir" }
      ],
      cliTitle: "Exemplos de Objects",
      cliCommands: [
        { label: "Ponto com campos:", command: "SET vehicles truck-001 FIELD tenant_uuid 12345 FIELD speed 60 POINT -23.55 -46.63" },
        { label: "Polígono (zona de entrega):", command: 'SET zones zone-sp-01 FIELD tenant_uuid 12345 OBJECT {"type":"Polygon","coordinates":[[[-46.7,-23.6],[-46.6,-23.6],[-46.6,-23.5],[-46.7,-23.5],[-46.7,-23.6]]]}' },
        { label: "Ponto com expiração de 60s:", command: "SET vehicles truck-001 EX 60 POINT -23.55 -46.63" }
      ]
    },

    webhooks: {
      title: "Webhooks (Geofences)",
      description: "Notificações em tempo real para eventos espaciais",
      content: "Webhooks permitem receber notificações HTTP quando objetos entram ou saem de áreas definidas. Perfeito para geofencing, rastreamento de entregas, gestão de frotas e alertas baseados em localização.",
      eventTypes: "Tipos de Evento",
      events: [
        { code: "enter", desc: "Objeto entra na área" },
        { code: "exit", desc: "Objeto sai da área" },
        { code: "inside", desc: "Objeto está dentro" },
        { code: "outside", desc: "Objeto está fora" },
        { code: "cross", desc: "Cruzamento de linha" }
      ],
      fenceTypes: "Tipos de Fence",
      fences: [
        { code: "WITHIN", desc: "Completamente dentro" },
        { code: "INTERSECTS", desc: "Toca a área" },
        { code: "NEARBY", desc: "Dentro da distância" }
      ],
      cliTitle: "Exemplos de Webhook",
      cliCommands: [
        { label: "Geofence com bounds:", command: "SETHOOK delivery-alert http://api.example.com/webhook WITHIN vehicles FENCE DETECT enter,exit BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Usando polígono existente:", command: "SETHOOK zone-alert http://api.example.com/webhook WITHIN vehicles FENCE DETECT enter,exit GET zones zone-sp-01" },
        { label: "Geofence circular (raio 1km):", command: "SETHOOK nearby-alert http://api.example.com/webhook NEARBY vehicles FENCE DETECT enter POINT -23.55 -46.63 1000" }
      ]
    },

    multiTenant: {
      title: "Arquitetura Multi-Tenant",
      description: "Melhores práticas para múltiplas organizações",
      content: "Quando múltiplas empresas ou tenants usam a mesma instância do Meridian, você tem duas estratégias principais para isolamento de dados: separação por collection ou filtragem por campo.",
      strategy1: {
        title: "Estratégia 1: Collection por Tenant",
        content: "Crie collections separadas para cada tenant. Fornece isolamento completo de dados e consultas mais simples.",
        examples: ["tenant_abc_vehicles", "tenant_abc_zones", "tenant_xyz_vehicles", "tenant_xyz_zones"],
        pros: "Isolamento completo, consultas simples",
        cons: "Mais collections para gerenciar"
      },
      strategy2: {
        title: "Estratégia 2: Filtragem por Campo",
        content: "Use campos personalizados para marcar objetos com informações do tenant. Filtre consultas usando cláusulas WHERE.",
        examples: ["SET vehicles truck-001 FIELD tenant 123 ...", "SCAN vehicles WHERE tenant 123", "WITHIN vehicles WHERE tenant 123 ..."],
        pros: "Menos collections, flexível",
        cons: "Requer WHERE em todas as consultas"
      },
      cliTitle: "Exemplos Multi-Tenant",
      cliCommands: [
        { label: "Adicionar objeto com tenant e filial:", command: "SET vehicles truck-001 FIELD tenant_uuid 12345 FIELD branch_id 67 FIELD driver_uuid 89 POINT -23.55 -46.63" },
        { label: "Consultar por tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345" },
        { label: "Consulta espacial com filtro de tenant:", command: "WITHIN vehicles WHERE tenant_uuid 12345 BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Consultar por tenant e filial:", command: "SCAN vehicles WHERE tenant_uuid 12345 WHERE branch_id 67" }
      ]
    },

    branch: {
      title: "Organização por Filial e Hierarquia",
      description: "Organizando dados por unidades de negócio",
      content: "Para organizações com múltiplas filiais, regiões ou unidades de negócio, você pode usar campos para criar uma hierarquia. Isso permite consultas flexíveis em qualquer nível.",
      fieldStructure: "Estrutura de Campos Recomendada",
      fields: [
        { code: "tenant_uuid", desc: "Identificador da organização/empresa" },
        { code: "branch_id", desc: "Identificador da filial/unidade" },
        { code: "driver_uuid", desc: "Identificador do motorista/operador" },
        { code: "trip_id", desc: "Identificador da viagem/rota" },
        { code: "vehicle_type", desc: "Classificação do tipo (1=caminhão, 2=moto)" },
        { code: "status", desc: "Código de status (1=ativo, 0=inativo)" }
      ],
      cliTitle: "Exemplos de Consulta Hierárquica",
      cliCommands: [
        { label: "Todos veículos da filial 67:", command: "SCAN vehicles WHERE branch_id 67" },
        { label: "Veículos ativos do tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345 WHERE status 1" },
        { label: "Veículos na área de motorista específico:", command: "WITHIN vehicles WHERE driver_uuid 89 BOUNDS -23.6 -46.7 -23.5 -46.6" },
        { label: "Contar objetos por tenant:", command: "SCAN vehicles WHERE tenant_uuid 12345 COUNT" }
      ]
    },

    quickRef: {
      title: "Referência Rápida",
      description: "Cheat sheet de comandos comuns",
      objectCommands: "Comandos de Object",
      objectCli: [
        { label: "Criar/Atualizar:", command: "SET key id [FIELD name value] ... geometry" },
        { label: "Obter objeto:", command: "GET key id" },
        { label: "Deletar:", command: "DEL key id" },
        { label: "Listar todos:", command: "SCAN key [WHERE field value] LIMIT n" }
      ],
      spatialQueries: "Consultas Espaciais",
      spatialCli: [
        { label: "Dentro de bounds:", command: "WITHIN key BOUNDS minlat minlon maxlat maxlon" },
        { label: "Dentro de círculo:", command: "NEARBY key POINT lat lon meters" },
        { label: "Intersecta:", command: "INTERSECTS key OBJECT {geojson}" }
      ],
      collectionCommands: "Comandos de Collection",
      collectionCli: [
        { label: "Listar collections:", command: "KEYS *" },
        { label: "Estatísticas:", command: "STATS key" },
        { label: "Remover collection:", command: "DROP key" }
      ],
      webhookCommands: "Comandos de Webhook",
      webhookCli: [
        { label: "Criar webhook:", command: "SETHOOK name url WITHIN key FENCE DETECT events ..." },
        { label: "Listar webhooks:", command: "HOOKS *" },
        { label: "Deletar webhook:", command: "DELHOOK name" }
      ]
    }
  }
};

export default function AboutPage() {
  const [lang, setLang] = useState<Language>("en");
  const t = content[lang];

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground mt-2">{t.subtitle}</p>
            </div>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={lang === "en" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLang("en")}
                className="gap-1"
              >
                <Languages className="w-4 h-4" />
                EN
              </Button>
              <Button
                variant={lang === "pt" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLang("pt")}
                className="gap-1"
              >
                <Languages className="w-4 h-4" />
                PT
              </Button>
            </div>
          </div>

          {/* Collections */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t.collections.title}</CardTitle>
                  <CardDescription>{t.collections.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.collections.content}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.collections.whenToUse}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.collections.uses.map((use, i) => (
                      <li key={i}>- {use}</li>
                    ))}
                  </ul>
                </div>
                <CliExample
                  title={t.collections.cliTitle}
                  commands={[
                    {
                      command: "SET vehicles truck-001 POINT -23.55 -46.63",
                      description: t.collections.cliDescription
                    }
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Objects */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MapPin className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>{t.objects.title}</CardTitle>
                  <CardDescription>{t.objects.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.objects.content}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.objects.geometryTypes}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.objects.geometries.map((g, i) => (
                      <li key={i}>
                        <code className="text-xs bg-background px-1 rounded">{g.code}</code> - {g.desc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.objects.customFields}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.objects.fieldsList.map((f, i) => (
                      <li key={i}>- {f}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.objects.options}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.objects.optionsList.map((o, i) => (
                      <li key={i}>
                        <code className="text-xs bg-background px-1 rounded">{o.code}</code> - {o.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <CliExample
                title={t.objects.cliTitle}
                commands={t.objects.cliCommands}
              />
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Webhook className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle>{t.webhooks.title}</CardTitle>
                  <CardDescription>{t.webhooks.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.webhooks.content}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.webhooks.eventTypes}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.webhooks.events.map((e, i) => (
                      <li key={i}>
                        <code className="text-xs bg-background px-1 rounded">{e.code}</code> - {e.desc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t.webhooks.fenceTypes}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {t.webhooks.fences.map((f, i) => (
                      <li key={i}>
                        <code className="text-xs bg-background px-1 rounded">{f.code}</code> - {f.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <CliExample
                title={t.webhooks.cliTitle}
                commands={t.webhooks.cliCommands}
              />
            </CardContent>
          </Card>

          {/* Multi-tenant Architecture */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Building2 className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle>{t.multiTenant.title}</CardTitle>
                  <CardDescription>{t.multiTenant.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.multiTenant.content}</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategy 1: Collection per tenant */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-blue-500" />
                    <h4 className="font-medium">{t.multiTenant.strategy1.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t.multiTenant.strategy1.content}</p>
                  <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1">
                    {t.multiTenant.strategy1.examples.map((ex, i) => (
                      <div key={i}>{ex}</div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <strong>Pros:</strong> {t.multiTenant.strategy1.pros}<br />
                    <strong>Cons:</strong> {t.multiTenant.strategy1.cons}
                  </div>
                </div>

                {/* Strategy 2: Field-based */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-5 h-5 text-green-500" />
                    <h4 className="font-medium">{t.multiTenant.strategy2.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t.multiTenant.strategy2.content}</p>
                  <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1">
                    {t.multiTenant.strategy2.examples.map((ex, i) => (
                      <div key={i}>{ex}</div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <strong>Pros:</strong> {t.multiTenant.strategy2.pros}<br />
                    <strong>Cons:</strong> {t.multiTenant.strategy2.cons}
                  </div>
                </div>
              </div>

              <CliExample
                title={t.multiTenant.cliTitle}
                commands={t.multiTenant.cliCommands}
              />
            </CardContent>
          </Card>

          {/* Branch Organization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <GitBranch className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <CardTitle>{t.branch.title}</CardTitle>
                  <CardDescription>{t.branch.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.branch.content}</p>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">{t.branch.fieldStructure}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {t.branch.fields.map((f, i) => (
                    <div key={i}>
                      <code className="text-xs bg-background px-1 rounded">{f.code}</code>
                      <p className="text-muted-foreground text-xs mt-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <CliExample
                title={t.branch.cliTitle}
                commands={t.branch.cliCommands}
              />
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <Code className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <CardTitle>{t.quickRef.title}</CardTitle>
                  <CardDescription>{t.quickRef.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CliExample
                  title={t.quickRef.objectCommands}
                  commands={t.quickRef.objectCli}
                />
                <CliExample
                  title={t.quickRef.spatialQueries}
                  commands={t.quickRef.spatialCli}
                />
                <CliExample
                  title={t.quickRef.collectionCommands}
                  commands={t.quickRef.collectionCli}
                />
                <CliExample
                  title={t.quickRef.webhookCommands}
                  commands={t.quickRef.webhookCli}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
