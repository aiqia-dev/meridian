"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CliExample } from "@/components/ui/cli-example";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  Route,
  Bell,
  Building2,
  Workflow,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Languages,
  Layers,
  Webhook,
  Code,
  Server,
  GitBranch,
  Check,
  X,
  Star,
} from "lucide-react";

type Language = "en" | "pt";

const content = {
  en: {
    title: "TMS Integration Guide",
    subtitle: "Learn how to integrate Meridian with your Transportation Management System for real-time tracking, geofencing, and route monitoring.",

    architecture: {
      title: "Architecture Overview",
      description: "Recommended integration flow",
      flow: [
        { icon: Truck, label: "Trackers", desc: "GPS devices send positions" },
        { icon: Server, label: "Collector", desc: "AirFlow/ETL processes data" },
        { icon: Workflow, label: "Pub/Sub", desc: "Message queue distributes" },
        { icon: MapPin, label: "Meridian", desc: "Geospatial processing" },
        { icon: Bell, label: "Webhooks", desc: "Events to your TMS" },
      ]
    },

    dataModel: {
      title: "Data Model",
      description: "How to structure your geospatial data",
      vehicles: {
        title: "Vehicles (Real-time positions)",
        description: "Store vehicle positions with metadata for filtering",
        fields: [
          { name: "tenant_uuid", desc: "Organization identifier", help: "Numeric ID representing the organization/tenant in a multi-tenant system. Used for data isolation between different companies." },
          { name: "branch_uuid", desc: "Branch/unit identifier", help: "Numeric ID for the specific branch, depot, or business unit within an organization." },
          { name: "driver_uuid", desc: "Driver identifier", help: "Numeric ID assigned to the driver currently operating the vehicle." },
          { name: "trip_id", desc: "Current trip identifier", help: "Numeric ID linking the vehicle's position to an active trip in your TMS." },
          { name: "speed", desc: "Current speed (km/h)", help: "Vehicle's current speed in kilometers per hour, typically provided by the GPS tracker." },
          { name: "heading", desc: "Direction (0-360)", help: "Compass direction in degrees: 0°=North, 90°=East, 180°=South, 270°=West. Used to show vehicle orientation on maps." },
        ]
      },
      locations: {
        title: "Locations (Pickup/Delivery points)",
        description: "Geofences for stops along the route",
        fields: [
          { name: "tenant_uuid", desc: "Organization identifier", help: "Numeric ID representing the organization/tenant in a multi-tenant system." },
          { name: "location_type", desc: "1=pickup, 2=delivery", help: "Numeric code indicating the stop type: 1 for pickup/collection points, 2 for delivery/drop-off points." },
          { name: "trip_id", desc: "Associated trip", help: "Links this location to a specific trip. Allows filtering events by trip." },
          { name: "radius", desc: "Geofence radius in meters", help: "Defines the circular area around a point. Vehicle is considered 'arrived' when within this radius." },
        ]
      },
      corridors: {
        title: "Route Corridors",
        description: "Buffered route for deviation detection",
        fields: [
          { name: "tenant_uuid", desc: "Organization identifier", help: "Numeric ID representing the organization/tenant in a multi-tenant system." },
          { name: "trip_id", desc: "Trip identifier", help: "Links this corridor to a specific trip for event filtering." },
          { name: "buffer_meters", desc: "Corridor width (e.g., 500m)", help: "Width of the route corridor in meters. Vehicles outside this buffer trigger deviation alerts. Recommended: 300-500m to account for GPS inaccuracy." },
        ]
      },
      glossary: {
        title: "Glossary",
        terms: {
          field: { term: "FIELD", help: "Numeric metadata attached to objects. Used for filtering in queries (WHERE clause). Only supports numeric values." },
          ex: { term: "EX", help: "Expiration time in seconds (TTL). Object is automatically deleted after this period. Useful for auto-cleanup of stale positions." },
          fence: { term: "FENCE", help: "Virtual geofence that monitors objects entering/exiting an area. Triggers webhook events when boundaries are crossed." },
          detect: { term: "DETECT", help: "Specifies which events to monitor: 'enter' (object enters area), 'exit' (object leaves area), 'inside', 'outside', 'crosses'." },
          within: { term: "WITHIN", help: "Search command that finds objects completely contained inside a specified area (polygon, circle, etc)." },
          nearby: { term: "NEARBY", help: "Search command that finds objects within a specified radius from a point, ordered by distance." },
          get: { term: "GET", help: "References an existing geometry from another collection. Allows reusing stored shapes in queries and webhooks." },
          sethook: { term: "SETHOOK", help: "Creates a webhook that monitors a geofence and sends HTTP requests when specified events occur." },
          delhook: { term: "DELHOOK", help: "Removes a previously created webhook by its name." },
        }
      }
    },

    events: {
      title: "Event Detection",
      description: "Types of events Meridian can detect",
      types: [
        {
          icon: CheckCircle,
          title: "Arrival/Departure",
          description: "Vehicle enters or exits a pickup/delivery location",
          detect: "enter, exit",
          color: "text-green-500"
        },
        {
          icon: AlertTriangle,
          title: "Route Deviation",
          description: "Vehicle leaves the planned route corridor",
          detect: "exit",
          color: "text-orange-500"
        },
        {
          icon: Clock,
          title: "Unplanned Stop",
          description: "Vehicle stops outside designated locations",
          detect: "Application logic",
          color: "text-red-500"
        },
      ]
    },

    webhooks: {
      title: "Webhook Configuration",
      description: "Setting up real-time event notifications",
      arrival: {
        title: "Arrival at Location",
        description: "Triggered when vehicle enters geofence"
      },
      departure: {
        title: "Departure from Location",
        description: "Triggered when vehicle exits geofence"
      },
      deviation: {
        title: "Route Deviation",
        description: "Triggered when vehicle exits route corridor"
      }
    },

    webhookStrategy: {
      title: "Webhook Architecture Strategy",
      description: "Choosing the right approach for your TMS integration",
      intro: "When integrating with a TMS, you need to decide whether to create webhooks per-trip or use global webhooks. Here are the three main approaches:",
      resourceTable: {
        title: "Resource Creation Summary",
        headers: ["Resource", "Per Trip?", "Reason"],
        rows: [
          { resource: "Vehicle position (SET)", perTrip: "No", reason: "One object per vehicle, always updated" },
          { resource: "Route corridor", perTrip: "Yes", reason: "Unique per trip, deleted at end" },
          { resource: "Stop locations", perTrip: "Depends", reason: "Can be shared if locations are reused" },
          { resource: "Deviation webhook", perTrip: "Depends", reason: "Uses GET to reference corridor" },
          { resource: "Arrival/departure webhooks", perTrip: "Depends", reason: "Can be global with FIELD filtering" },
        ]
      },
      options: [
        {
          title: "Option A: Webhooks per Trip",
          description: "Create and delete webhooks for each trip",
          pros: ["Precise filtering - only relevant events", "Simple event handling - no extra logic needed", "Easy to clean up - delete when trip ends"],
          cons: ["More Meridian commands per trip", "More webhooks to manage", "Slightly higher overhead at scale"],
          recommended: false
        },
        {
          title: "Option B: Global Webhooks",
          description: "Create permanent webhooks that monitor all vehicles",
          pros: ["Fewer webhooks to manage", "Set up once, works forever", "Simpler trip start/end logic"],
          cons: ["Receives events for ALL vehicles", "Application must filter relevant events", "Harder to debug specific trips"],
          recommended: false
        },
        {
          title: "Option C: Hybrid Approach",
          description: "Global webhooks for arrivals, per-trip for route deviation",
          pros: ["Best of both worlds", "Route deviation needs per-trip corridor anyway", "Arrivals work well with global + FIELD filter"],
          cons: ["Slightly more complex setup", "Two patterns to maintain"],
          recommended: true
        }
      ],
      recommendedSummary: "We recommend the Hybrid Approach (Option C) for most TMS integrations. Use global webhooks for arrival/departure detection with FIELD filtering, and create per-trip webhooks only for route deviation monitoring."
    },

    lifecycle: {
      title: "Trip Lifecycle",
      description: "Managing webhooks during a trip",
      steps: [
        { step: "1", title: "Trip Start", desc: "Create route corridor and location geofences" },
        { step: "2", title: "Setup Webhooks", desc: "Register webhooks for all events" },
        { step: "3", title: "Monitor", desc: "Receive events as vehicle moves" },
        { step: "4", title: "Trip End", desc: "Clean up webhooks and corridors" },
      ]
    },

    bestPractices: {
      title: "Best Practices",
      description: "Recommendations for production use",
      items: [
        {
          title: "Use TTL for positions",
          description: "Set EX (expiration) on vehicle positions to auto-cleanup stale data"
        },
        {
          title: "Buffer your routes",
          description: "Use 300-500m buffer for route corridors to account for GPS accuracy"
        },
        {
          title: "Cleanup on trip end",
          description: "Always delete webhooks and corridors when trip completes"
        },
        {
          title: "Use numeric fields",
          description: "Convert UUIDs to numeric IDs for FIELD values (Meridian only supports numbers)"
        },
      ]
    }
  },

  pt: {
    title: "Guia de Integração TMS",
    subtitle: "Aprenda como integrar o Meridian com seu Sistema de Gerenciamento de Transporte para rastreamento em tempo real, geofencing e monitoramento de rotas.",

    architecture: {
      title: "Visão Geral da Arquitetura",
      description: "Fluxo de integração recomendado",
      flow: [
        { icon: Truck, label: "Rastreadores", desc: "Dispositivos GPS enviam posições" },
        { icon: Server, label: "Coletor", desc: "AirFlow/ETL processa dados" },
        { icon: Workflow, label: "Pub/Sub", desc: "Fila de mensagens distribui" },
        { icon: MapPin, label: "Meridian", desc: "Processamento geoespacial" },
        { icon: Bell, label: "Webhooks", desc: "Eventos para seu TMS" },
      ]
    },

    dataModel: {
      title: "Modelo de Dados",
      description: "Como estruturar seus dados geoespaciais",
      vehicles: {
        title: "Veículos (Posições em tempo real)",
        description: "Armazene posições de veículos com metadados para filtragem",
        fields: [
          { name: "tenant_uuid", desc: "Identificador da organização", help: "ID numérico representando a organização/tenant em um sistema multi-tenant. Usado para isolamento de dados entre empresas." },
          { name: "branch_uuid", desc: "Identificador da filial/unidade", help: "ID numérico para a filial, depósito ou unidade de negócio específica dentro de uma organização." },
          { name: "driver_uuid", desc: "Identificador do motorista", help: "ID numérico atribuído ao motorista que está operando o veículo no momento." },
          { name: "trip_id", desc: "Identificador da viagem atual", help: "ID numérico vinculando a posição do veículo a uma viagem ativa no seu TMS." },
          { name: "speed", desc: "Velocidade atual (km/h)", help: "Velocidade atual do veículo em quilômetros por hora, tipicamente fornecida pelo rastreador GPS." },
          { name: "heading", desc: "Direção (0-360)", help: "Direção da bússola em graus: 0°=Norte, 90°=Leste, 180°=Sul, 270°=Oeste. Usado para mostrar a orientação do veículo no mapa." },
        ]
      },
      locations: {
        title: "Locais (Pontos de Coleta/Entrega)",
        description: "Geofences para paradas ao longo da rota",
        fields: [
          { name: "tenant_uuid", desc: "Identificador da organização", help: "ID numérico representando a organização/tenant em um sistema multi-tenant." },
          { name: "location_type", desc: "1=coleta, 2=entrega", help: "Código numérico indicando o tipo de parada: 1 para pontos de coleta, 2 para pontos de entrega." },
          { name: "trip_id", desc: "Viagem associada", help: "Vincula este local a uma viagem específica. Permite filtrar eventos por viagem." },
          { name: "radius", desc: "Raio do geofence em metros", help: "Define a área circular ao redor de um ponto. O veículo é considerado 'chegou' quando estiver dentro deste raio." },
        ]
      },
      corridors: {
        title: "Corredores de Rota",
        description: "Rota com buffer para detecção de desvio",
        fields: [
          { name: "tenant_uuid", desc: "Identificador da organização", help: "ID numérico representando a organização/tenant em um sistema multi-tenant." },
          { name: "trip_id", desc: "Identificador da viagem", help: "Vincula este corredor a uma viagem específica para filtragem de eventos." },
          { name: "buffer_meters", desc: "Largura do corredor (ex: 500m)", help: "Largura do corredor de rota em metros. Veículos fora deste buffer disparam alertas de desvio. Recomendado: 300-500m para compensar imprecisão do GPS." },
        ]
      },
      glossary: {
        title: "Glossário",
        terms: {
          field: { term: "FIELD", help: "Metadado numérico associado a objetos. Usado para filtragem em consultas (cláusula WHERE). Suporta apenas valores numéricos." },
          ex: { term: "EX", help: "Tempo de expiração em segundos (TTL). O objeto é automaticamente deletado após este período. Útil para limpeza automática de posições antigas." },
          fence: { term: "FENCE", help: "Geofence virtual que monitora objetos entrando/saindo de uma área. Dispara eventos de webhook quando limites são cruzados." },
          detect: { term: "DETECT", help: "Especifica quais eventos monitorar: 'enter' (objeto entra na área), 'exit' (objeto sai da área), 'inside', 'outside', 'crosses'." },
          within: { term: "WITHIN", help: "Comando de busca que encontra objetos completamente contidos dentro de uma área especificada (polígono, círculo, etc)." },
          nearby: { term: "NEARBY", help: "Comando de busca que encontra objetos dentro de um raio especificado a partir de um ponto, ordenados por distância." },
          get: { term: "GET", help: "Referencia uma geometria existente de outra coleção. Permite reutilizar formas armazenadas em consultas e webhooks." },
          sethook: { term: "SETHOOK", help: "Cria um webhook que monitora um geofence e envia requisições HTTP quando eventos especificados ocorrem." },
          delhook: { term: "DELHOOK", help: "Remove um webhook previamente criado pelo seu nome." },
        }
      }
    },

    events: {
      title: "Detecção de Eventos",
      description: "Tipos de eventos que o Meridian pode detectar",
      types: [
        {
          icon: CheckCircle,
          title: "Chegada/Saída",
          description: "Veículo entra ou sai de um local de coleta/entrega",
          detect: "enter, exit",
          color: "text-green-500"
        },
        {
          icon: AlertTriangle,
          title: "Desvio de Rota",
          description: "Veículo sai do corredor da rota planejada",
          detect: "exit",
          color: "text-orange-500"
        },
        {
          icon: Clock,
          title: "Parada Não Programada",
          description: "Veículo para fora dos locais designados",
          detect: "Lógica na aplicação",
          color: "text-red-500"
        },
      ]
    },

    webhooks: {
      title: "Configuração de Webhooks",
      description: "Configurando notificações de eventos em tempo real",
      arrival: {
        title: "Chegada no Local",
        description: "Disparado quando veículo entra no geofence"
      },
      departure: {
        title: "Saída do Local",
        description: "Disparado quando veículo sai do geofence"
      },
      deviation: {
        title: "Desvio de Rota",
        description: "Disparado quando veículo sai do corredor da rota"
      }
    },

    webhookStrategy: {
      title: "Estratégia de Arquitetura de Webhooks",
      description: "Escolhendo a abordagem correta para integração com seu TMS",
      intro: "Ao integrar com um TMS, você precisa decidir se cria webhooks por viagem ou usa webhooks globais. Aqui estão as três principais abordagens:",
      resourceTable: {
        title: "Resumo de Criação de Recursos",
        headers: ["Recurso", "Por Viagem?", "Motivo"],
        rows: [
          { resource: "Posição do veículo (SET)", perTrip: "Não", reason: "Um objeto por veículo, sempre atualizado" },
          { resource: "Corredor da rota", perTrip: "Sim", reason: "Único por viagem, deletado no fim" },
          { resource: "Locais de parada", perTrip: "Depende", reason: "Pode ser compartilhado se locais são reusados" },
          { resource: "Webhook de desvio", perTrip: "Depende", reason: "Usa GET para referenciar corredor" },
          { resource: "Webhooks de chegada/saída", perTrip: "Depende", reason: "Pode ser global com filtro por FIELD" },
        ]
      },
      options: [
        {
          title: "Opção A: Webhooks por Viagem",
          description: "Criar e deletar webhooks para cada viagem",
          pros: ["Filtragem precisa - apenas eventos relevantes", "Tratamento simples - sem lógica extra", "Fácil limpeza - delete quando viagem termina"],
          cons: ["Mais comandos Meridian por viagem", "Mais webhooks para gerenciar", "Overhead ligeiramente maior em escala"],
          recommended: false
        },
        {
          title: "Opção B: Webhooks Globais",
          description: "Criar webhooks permanentes que monitoram todos os veículos",
          pros: ["Menos webhooks para gerenciar", "Configure uma vez, funciona sempre", "Lógica de início/fim mais simples"],
          cons: ["Recebe eventos de TODOS os veículos", "Aplicação deve filtrar eventos relevantes", "Mais difícil debugar viagens específicas"],
          recommended: false
        },
        {
          title: "Opção C: Abordagem Híbrida",
          description: "Webhooks globais para chegadas, por viagem para desvio de rota",
          pros: ["Melhor dos dois mundos", "Desvio de rota precisa do corredor por viagem de qualquer forma", "Chegadas funcionam bem com global + filtro FIELD"],
          cons: ["Setup ligeiramente mais complexo", "Dois padrões para manter"],
          recommended: true
        }
      ],
      recommendedSummary: "Recomendamos a Abordagem Híbrida (Opção C) para a maioria das integrações TMS. Use webhooks globais para detecção de chegada/saída com filtro por FIELD, e crie webhooks por viagem apenas para monitoramento de desvio de rota."
    },

    lifecycle: {
      title: "Ciclo de Vida da Viagem",
      description: "Gerenciando webhooks durante uma viagem",
      steps: [
        { step: "1", title: "Início da Viagem", desc: "Criar corredor de rota e geofences dos locais" },
        { step: "2", title: "Configurar Webhooks", desc: "Registrar webhooks para todos os eventos" },
        { step: "3", title: "Monitorar", desc: "Receber eventos conforme veículo se move" },
        { step: "4", title: "Fim da Viagem", desc: "Limpar webhooks e corredores" },
      ]
    },

    bestPractices: {
      title: "Melhores Práticas",
      description: "Recomendações para uso em produção",
      items: [
        {
          title: "Use TTL para posições",
          description: "Configure EX (expiração) nas posições para limpeza automática de dados antigos"
        },
        {
          title: "Use buffer nas rotas",
          description: "Use 300-500m de buffer nos corredores para compensar precisão do GPS"
        },
        {
          title: "Limpe ao fim da viagem",
          description: "Sempre delete webhooks e corredores quando a viagem terminar"
        },
        {
          title: "Use campos numéricos",
          description: "Converta UUIDs para IDs numéricos nos FIELDs (Meridian só suporta números)"
        },
      ]
    }
  }
};

export default function GuidePage() {
  const [lang, setLang] = useState<Language>("pt");
  const t = content[lang];

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-8">
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

          {/* Architecture */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Workflow className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t.architecture.title}</CardTitle>
                  <CardDescription>{t.architecture.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                {t.architecture.flow.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 md:gap-4">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 min-w-[100px]">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground text-center">{item.desc}</span>
                    </div>
                    {index < t.architecture.flow.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Model */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Layers className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>{t.dataModel.title}</CardTitle>
                  <CardDescription>{t.dataModel.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vehicles */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">{t.dataModel.vehicles.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.dataModel.vehicles.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {t.dataModel.vehicles.fields.map((field, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-primary">{field.name}</code>
                        {field.help && <HelpTooltip content={field.help} iconClassName="w-3 h-3" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{field.desc}</p>
                    </div>
                  ))}
                </div>

                <CliExample
                  commands={[
                    {
                      command: "SET vehicles truck-001 FIELD tenant_uuid 12345 FIELD branch_uuid 67 FIELD driver_uuid 89 FIELD trip_id 1001 FIELD speed 65 EX 300 POINT -23.5505 -46.6333"
                    }
                  ]}
                />
              </div>

              {/* Locations */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold">{t.dataModel.locations.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.dataModel.locations.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {t.dataModel.locations.fields.map((field, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-primary">{field.name}</code>
                        {field.help && <HelpTooltip content={field.help} iconClassName="w-3 h-3" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{field.desc}</p>
                    </div>
                  ))}
                </div>

                <CliExample
                  commands={[
                    {
                      label: lang === "pt" ? "Ponto de coleta (círculo 100m):" : "Pickup point (100m circle):",
                      command: "SET locations pickup_001 FIELD tenant_uuid 12345 FIELD location_type 1 FIELD trip_id 1001 OBJECT {\"type\":\"Point\",\"coordinates\":[-46.63,-23.55]}"
                    },
                    {
                      label: lang === "pt" ? "Local de entrega (polígono):" : "Delivery location (polygon):",
                      command: "SET locations delivery_001 FIELD tenant_uuid 12345 FIELD location_type 2 FIELD trip_id 1001 OBJECT {\"type\":\"Polygon\",\"coordinates\":[...]}"
                    }
                  ]}
                />
              </div>

              {/* Route Corridors */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Route className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">{t.dataModel.corridors.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.dataModel.corridors.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {t.dataModel.corridors.fields.map((field, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-primary">{field.name}</code>
                        {field.help && <HelpTooltip content={field.help} iconClassName="w-3 h-3" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{field.desc}</p>
                    </div>
                  ))}
                </div>

                <CliExample
                  commands={[
                    {
                      label: lang === "pt" ? "Corredor da rota (polígono buffer):" : "Route corridor (buffered polygon):",
                      command: "SET route_corridors trip_1001 FIELD tenant_uuid 12345 FIELD trip_id 1001 OBJECT {\"type\":\"Polygon\",\"coordinates\":[[[-46.7,-23.6],[-46.6,-23.6],[-46.6,-23.5],[-46.7,-23.5],[-46.7,-23.6]]]}"
                    }
                  ]}
                />
              </div>

              {/* Glossary */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-5 h-5 text-violet-500" />
                  <h4 className="font-semibold">{t.dataModel.glossary.title}</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.values(t.dataModel.glossary.terms).map((item, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-primary">{item.term}</code>
                        <HelpTooltip content={item.help} iconClassName="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Detection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Bell className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle>{t.events.title}</CardTitle>
                  <CardDescription>{t.events.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {t.events.types.map((event, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <event.icon className={`w-5 h-5 ${event.color}`} />
                      <h4 className="font-semibold">{event.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">DETECT:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.detect}</code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Webhook className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>{t.webhooks.title}</CardTitle>
                  <CardDescription>{t.webhooks.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Arrival */}
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <h4 className="font-medium text-sm">{t.webhooks.arrival.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t.webhooks.arrival.description}</p>
                </div>

                {/* Departure */}
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium text-sm">{t.webhooks.departure.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t.webhooks.departure.description}</p>
                </div>

                {/* Deviation */}
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <h4 className="font-medium text-sm">{t.webhooks.deviation.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t.webhooks.deviation.description}</p>
                </div>
              </div>

              <CliExample
                title={lang === "pt" ? "Exemplos de Webhooks" : "Webhook Examples"}
                commands={[
                  {
                    label: lang === "pt" ? "Chegada em local (raio 100m):" : "Arrival at location (100m radius):",
                    command: "SETHOOK arrival_pickup_001 http://your-api/webhooks NEARBY vehicles WHERE trip_id 1001 FENCE DETECT enter,exit POINT -23.55 -46.63 100"
                  },
                  {
                    label: lang === "pt" ? "Desvio de rota:" : "Route deviation:",
                    command: "SETHOOK deviation_trip_1001 http://your-api/webhooks WITHIN vehicles WHERE trip_id 1001 FENCE DETECT exit GET route_corridors trip_1001"
                  },
                  {
                    label: lang === "pt" ? "Usando geofence existente:" : "Using existing geofence:",
                    command: "SETHOOK arrival_delivery_001 http://your-api/webhooks WITHIN vehicles WHERE trip_id 1001 FENCE DETECT enter,exit GET locations delivery_001"
                  }
                ]}
              />
            </CardContent>
          </Card>

          {/* Webhook Architecture Strategy */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <GitBranch className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <CardTitle>{t.webhookStrategy.title}</CardTitle>
                  <CardDescription>{t.webhookStrategy.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">{t.webhookStrategy.intro}</p>

              {/* Resource Table */}
              <div className="p-4 rounded-xl border bg-card">
                <h4 className="font-semibold mb-3">{t.webhookStrategy.resourceTable.title}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {t.webhookStrategy.resourceTable.headers.map((header, i) => (
                          <th key={i} className="text-left py-2 px-3 font-medium">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.webhookStrategy.resourceTable.rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-3 font-mono text-xs">{row.resource}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              row.perTrip === "Sim" || row.perTrip === "Yes"
                                ? "bg-green-500/10 text-green-500"
                                : row.perTrip === "Não" || row.perTrip === "No"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {row.perTrip}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Architecture Options */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {t.webhookStrategy.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border bg-card relative ${
                      option.recommended ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    {option.recommended && (
                      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {lang === "pt" ? "Recomendado" : "Recommended"}
                      </div>
                    )}
                    <h4 className="font-semibold mb-2 mt-1">{option.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{option.description}</p>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-green-500 flex items-center gap-1 mb-1">
                          <Check className="w-3 h-3" /> {lang === "pt" ? "Prós" : "Pros"}
                        </span>
                        <ul className="space-y-1">
                          {option.pros.map((pro, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-green-500 mt-0.5">•</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
                          <X className="w-3 h-3" /> {lang === "pt" ? "Contras" : "Cons"}
                        </span>
                        <ul className="space-y-1">
                          {option.cons.map((con, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-red-500 mt-0.5">•</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">{lang === "pt" ? "Recomendação" : "Recommendation"}</h4>
                    <p className="text-sm text-muted-foreground">{t.webhookStrategy.recommendedSummary}</p>
                  </div>
                </div>
              </div>

              {/* Hybrid Approach Example */}
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-semibold mb-3">
                  {lang === "pt" ? "Exemplo: Abordagem Híbrida" : "Example: Hybrid Approach"}
                </h4>
                <CliExample
                  title={lang === "pt" ? "Setup Inicial (uma vez)" : "Initial Setup (once)"}
                  commands={[
                    {
                      label: lang === "pt" ? "Webhook global para chegadas/saídas:" : "Global webhook for arrivals/departures:",
                      command: "SETHOOK global_arrivals http://api/webhooks WITHIN vehicles FENCE DETECT enter,exit GET locations *"
                    }
                  ]}
                />
                <div className="mt-4">
                  <CliExample
                    title={lang === "pt" ? "Por Viagem (início)" : "Per Trip (start)"}
                    commands={[
                      {
                        label: lang === "pt" ? "Criar corredor da rota:" : "Create route corridor:",
                        command: "SET route_corridors trip_1001 FIELD trip_id 1001 OBJECT {\"type\":\"Polygon\",...}"
                      },
                      {
                        label: lang === "pt" ? "Webhook de desvio por viagem:" : "Per-trip deviation webhook:",
                        command: "SETHOOK deviation_1001 http://api/webhooks WITHIN vehicles WHERE trip_id 1001 FENCE DETECT exit GET route_corridors trip_1001"
                      }
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <CliExample
                    title={lang === "pt" ? "Por Viagem (fim)" : "Per Trip (end)"}
                    commands={[
                      {
                        label: lang === "pt" ? "Limpar recursos da viagem:" : "Clean up trip resources:",
                        command: "DELHOOK deviation_1001 && DEL route_corridors trip_1001"
                      }
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Lifecycle */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Clock className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <CardTitle>{t.lifecycle.title}</CardTitle>
                  <CardDescription>{t.lifecycle.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {t.lifecycle.steps.map((item, index) => (
                  <div key={index} className="relative">
                    <div className="flex flex-col items-center text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-3">
                        {item.step}
                      </div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {index < t.lifecycle.steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <CliExample
                title={lang === "pt" ? "Limpeza ao Fim da Viagem" : "Cleanup at Trip End"}
                commands={[
                  {
                    label: lang === "pt" ? "Remover webhooks:" : "Remove webhooks:",
                    command: "DELHOOK arrival_pickup_001"
                  },
                  {
                    label: lang === "pt" ? "Remover corredor:" : "Remove corridor:",
                    command: "DEL route_corridors trip_1001"
                  },
                  {
                    label: lang === "pt" ? "Listar webhooks ativos:" : "List active webhooks:",
                    command: "HOOKS *"
                  }
                ]}
              />
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Code className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle>{t.bestPractices.title}</CardTitle>
                  <CardDescription>{t.bestPractices.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t.bestPractices.items.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-muted/50">
                <h4 className="font-semibold mb-3">
                  {lang === "pt" ? "Exemplo Completo: Iniciar Viagem" : "Complete Example: Start Trip"}
                </h4>
                <CliExample
                  commands={[
                    {
                      label: "1. " + (lang === "pt" ? "Criar corredor da rota:" : "Create route corridor:"),
                      command: "SET route_corridors trip_1001 FIELD tenant_uuid 12345 FIELD trip_id 1001 OBJECT {\"type\":\"Polygon\",\"coordinates\":[...]}"
                    },
                    {
                      label: "2. " + (lang === "pt" ? "Criar webhook de desvio:" : "Create deviation webhook:"),
                      command: "SETHOOK deviation_1001 http://api/webhooks WITHIN vehicles WHERE trip_id 1001 FENCE DETECT exit GET route_corridors trip_1001"
                    },
                    {
                      label: "3. " + (lang === "pt" ? "Criar webhooks de paradas:" : "Create stop webhooks:"),
                      command: "SETHOOK stop_pickup_1 http://api/webhooks NEARBY vehicles WHERE trip_id 1001 FENCE DETECT enter,exit POINT -23.55 -46.63 100"
                    },
                    {
                      label: "4. " + (lang === "pt" ? "Atualizar posição do veículo:" : "Update vehicle position:"),
                      command: "SET vehicles truck_001 FIELD tenant_uuid 12345 FIELD trip_id 1001 FIELD speed 65 EX 300 POINT -23.5505 -46.6333"
                    }
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Webhook Response Format */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Server className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <CardTitle>{lang === "pt" ? "Formato do Webhook" : "Webhook Response Format"}</CardTitle>
                  <CardDescription>
                    {lang === "pt"
                      ? "Estrutura JSON recebida quando um evento é disparado"
                      : "JSON structure received when an event is triggered"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-xl bg-muted/50 overflow-x-auto text-sm">
{`{
  "command": "set",
  "group": "...",
  "detect": "enter",  // or "exit", "inside", "outside"
  "hook": "arrival_pickup_001",
  "key": "vehicles",
  "time": "2024-01-15T10:30:00Z",
  "id": "truck_001",
  "object": {
    "type": "Point",
    "coordinates": [-46.6333, -23.5505]
  },
  "fields": {
    "tenant_uuid": 12345,
    "trip_id": 1001,
    "speed": 0,
    "driver_uuid": 89
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
