# AIQIA Meridian - Documentacao Completa

## Indice

1. [Visao Geral](#visao-geral)
2. [Instalacao e Configuracao](#instalacao-e-configuracao)
3. [Protocolos de Rede](#protocolos-de-rede)
4. [Tipos de Dados](#tipos-de-dados)
5. [Comandos](#comandos)
6. [Geofencing](#geofencing)
7. [Webhooks](#webhooks)
8. [Pub/Sub](#pubsub)
9. [Integracao com NestJS](#integracao-com-nestjs)
10. [Swagger/OpenAPI](#swaggeropenapi)
11. [Lua Scripting](#lua-scripting)
12. [Replicacao](#replicacao)
13. [Metricas e Monitoramento](#metricas-e-monitoramento)
14. [Admin Panel](#admin-panel)
15. [Exemplos Praticos](#exemplos-praticos)
16. [Referencia de API](#referencia-de-api)

---

## Visao Geral

**AIQIA Meridian** e um banco de dados geoespacial em memoria, indice espacial e servidor de geofencing em tempo real. Desenvolvido em Go, oferece alto desempenho para aplicacoes que necessitam de:

- **Armazenamento de dados de localizacao** - Pontos, poligonos, linhas e outras geometrias
- **Buscas espaciais** - Nearby (proximidade), Within (dentro de), Intersects (interseccao)
- **Geofencing em tempo real** - Detectar entrada/saida de areas geograficas
- **Pub/Sub** - Notificacoes em tempo real via canais ou webhooks
- **Persistencia** - Dados em memoria com persistencia em disco via AOF

### Caracteristicas Principais

| Caracteristica | Descricao |
|----------------|-----------|
| **Performance** | Banco de dados em memoria com indices R-Tree |
| **Protocolos** | HTTP, WebSocket, RESP (Redis), Telnet |
| **Geofencing** | Webhooks para 15+ protocolos (Kafka, RabbitMQ, NATS, etc.) |
| **Persistencia** | Append-Only File (AOF) para durabilidade |
| **Replicacao** | Leader/Follower para alta disponibilidade |
| **Scripting** | Lua 5.1 para logica customizada |
| **Metricas** | Exportacao nativa para Prometheus |

### Arquitetura

```
+------------------+     +------------------+     +------------------+
|   Aplicacao      |     |   Aplicacao      |     |   Aplicacao      |
|   (NestJS)       |     |   (Go/Python)    |     |   (Mobile)       |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+------------------------+------------------------+---------+
|                        AIQIA Meridian Server                       |
|  +-------------+  +-------------+  +-------------+  +------------+ |
|  |   HTTP      |  |  WebSocket  |  |    RESP     |  |   Telnet   | |
|  +-------------+  +-------------+  +-------------+  +------------+ |
|  +----------------------------------------------------------+     |
|  |                    Engine de Busca Espacial              |     |
|  |  +----------+  +-----------+  +------------+  +--------+ |     |
|  |  |  R-Tree  |  |  B-Tree   |  |  Geofence  |  |  Lua   | |     |
|  |  +----------+  +-----------+  +------------+  +--------+ |     |
|  +----------------------------------------------------------+     |
|  +----------------------------------------------------------+     |
|  |                    Persistencia (AOF)                    |     |
|  +----------------------------------------------------------+     |
+--------------------------------------------------------------------+
         |                        |                        |
         v                        v                        v
+--------+---------+     +--------+---------+     +--------+---------+
|     Webhook      |     |      Kafka       |     |    RabbitMQ      |
|     (HTTP)       |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

---

## Instalacao e Configuracao

### Requisitos

- Go 1.21+ (para compilacao)
- Linux, macOS, Windows, FreeBSD (32 ou 64 bits)

### Compilacao

```bash
# Clonar o repositorio
git clone https://github.com/aiqia-dev/meridian.git
cd meridian

# Compilar todos os componentes
make

# Executar testes
make test
```

### Componentes

| Componente | Descricao |
|------------|-----------|
| `meridian-server` | Servidor principal |
| `meridian-cli` | Interface de linha de comando |
| `meridian-benchmark` | Ferramenta de benchmark |

### Iniciando o Servidor

```bash
# Iniciar com configuracoes padrao (porta 9851)
./meridian-server

# Especificar porta e diretorio de dados
./meridian-server -p 9851 -d ./data

# Com metricas Prometheus
./meridian-server --metrics-addr=127.0.0.1:4321

# Com autenticacao
./meridian-server --requirepass=minhasenha
```

### Opcoes de Linha de Comando

| Opcao | Descricao | Padrao |
|-------|-----------|--------|
| `-h, --host` | Host de escuta | `127.0.0.1` |
| `-p, --port` | Porta de escuta | `9851` |
| `-d, --dir` | Diretorio de dados | `data` |
| `-s, --socket` | Arquivo de socket Unix | - |
| `-l, --log` | Codificacao do log (json/text) | `text` |
| `-q, --quiet` | Modo silencioso | `false` |
| `-v, --verbose` | Log verboso | `false` |
| `--appendonly` | Habilitar AOF (yes/no) | `yes` |
| `--appendfilename` | Caminho do arquivo AOF | `appendonly.aof` |
| `--http-transport` | Habilitar HTTP | `true` |
| `--metrics-addr` | Endereco para metricas Prometheus | - |
| `--pidfile` | Arquivo de PID | - |
| `--spinlock` | Usar spinlock (workloads pesados) | `false` |
| `--admin-user` | Usuario do admin panel | - |
| `--admin-password` | Senha do admin panel | - |
| `--admin-jwt-secret` | Secret JWT (auto-gerado se vazio) | - |

### Configuracao em Runtime

```bash
# Definir senha
CONFIG SET requirepass "minhasenha"

# Definir memoria maxima (bytes)
CONFIG SET maxmemory 1073741824

# Habilitar modo protegido
CONFIG SET protected-mode yes

# Definir intervalo de garbage collection
CONFIG SET autogc 300

# Salvar configuracoes em disco
CONFIG REWRITE
```

### Variaveis de Ambiente

O Meridian suporta configuracao via arquivo `.env` ou variaveis de ambiente:

```bash
# Configuracao do servidor
MERIDIAN_HOST=                      # Host (vazio = todas interfaces)
MERIDIAN_PORT=9851                  # Porta
MERIDIAN_DIR=data                   # Diretorio de dados
MERIDIAN_PROTECTED_MODE=no          # Modo protegido
MERIDIAN_APPENDONLY=yes             # Persistencia AOF
MERIDIAN_MAXMEMORY=                 # Limite de memoria (ex: 1gb, 512mb)
MERIDIAN_REQUIREPASS=               # Senha de autenticacao
MERIDIAN_METRICS_ADDR=              # Endereco Prometheus (ex: :9090)

# Logging
MERIDIAN_LOG_ENCODING=text          # text ou json
MERIDIAN_VERBOSE=false              # Log verboso

# Admin Panel
MERIDIAN_ADMIN_USER=admin           # Usuario do admin
MERIDIAN_ADMIN_PASSWORD=            # Senha do admin
MERIDIAN_ADMIN_JWT_SECRET=          # Secret JWT (auto-gerado se vazio)

# Para o CLI
export MERIDIAN_HOSTNAME=127.0.0.1
export MERIDIAN_PORT=9851
export MERIDIAN_OUTPUT=json
export MERIDIAN_PASSWORD=minhasenha
```

---

## Protocolos de Rede

O Meridian suporta multiplos protocolos de comunicacao:

### HTTP/HTTPS

O protocolo mais simples para integracao. Respostas sempre em JSON.

```bash
# Requisicao no corpo
curl --data "SET fleet truck1 POINT 33.5123 -112.2693" http://localhost:9851

# Requisicao na URL
curl "http://localhost:9851/SET+fleet+truck1+POINT+33.5123+-112.2693"

# Resposta JSON
{"ok":true,"elapsed":"45.892µs"}
```

### WebSocket

Ideal para geofencing em tempo real. Mantem conexao aberta para receber eventos.

```javascript
const ws = new WebSocket('ws://localhost:9851');

ws.onopen = () => {
  // Criar geofence
  ws.send('NEARBY fleet FENCE POINT 33.5 -112.2 5000');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Evento:', data);
};
```

### RESP (Redis Protocol)

Compativel com qualquer cliente Redis. Permite usar bibliotecas existentes.

```javascript
// Node.js com ioredis
const Redis = require('ioredis');
const client = new Redis(9851, 'localhost');

await client.call('SET', 'fleet', 'truck1', 'POINT', '33.5123', '-112.2693');
const result = await client.call('GET', 'fleet', 'truck1');
```

### Telnet

Para testes e debug rapido.

```bash
telnet localhost 9851
> SET fleet truck1 POINT 33.5123 -112.2693
+OK
> GET fleet truck1
$...
```

---

## Tipos de Dados

### Point (Ponto)

O tipo mais basico. Representa uma localizacao com latitude e longitude.

```bash
# Ponto simples (lat, lon)
SET fleet truck1 POINT 33.5123 -112.2693

# Ponto com elevacao/altitude (lat, lon, z)
SET fleet truck1 POINT 33.5123 -112.2693 225

# Ponto com campos adicionais
SET fleet truck1 FIELD speed 90 FIELD heading 45 POINT 33.5123 -112.2693
```

### Bounds (Retangulo)

Retangulo definido por dois pontos: sudoeste e nordeste.

```bash
# bounds minlat minlon maxlat maxlon
SET areas zone1 BOUNDS 30 -110 40 -100
```

### Hash (Geohash)

Representacao de ponto em string com precisao variavel.

```bash
# O tamanho da string define a precisao
SET fleet truck1 HASH 9tbnthxzr

# Equivalente aproximado a POINT 33.5123 -112.2693
```

### GeoJSON

Suporte completo a especificacao GeoJSON. **Coordenadas em ordem [longitude, latitude]**.

```bash
# Point
SET city phoenix OBJECT {"type":"Point","coordinates":[-112.0740,33.4484]}

# Polygon
SET areas downtown OBJECT {
  "type": "Polygon",
  "coordinates": [[
    [-112.1, 33.4],
    [-112.1, 33.5],
    [-112.0, 33.5],
    [-112.0, 33.4],
    [-112.1, 33.4]
  ]]
}

# LineString
SET routes route1 OBJECT {
  "type": "LineString",
  "coordinates": [
    [-112.1, 33.4],
    [-112.05, 33.45],
    [-112.0, 33.5]
  ]
}

# MultiPolygon
SET areas multizone OBJECT {
  "type": "MultiPolygon",
  "coordinates": [
    [[[-112.1, 33.4], [-112.1, 33.5], [-112.0, 33.5], [-112.0, 33.4], [-112.1, 33.4]]],
    [[[-111.9, 33.3], [-111.9, 33.4], [-111.8, 33.4], [-111.8, 33.3], [-111.9, 33.3]]]
  ]
}

# Feature com propriedades
SET places store1 OBJECT {
  "type": "Feature",
  "geometry": {"type": "Point", "coordinates": [-112.0740, 33.4484]},
  "properties": {"name": "Loja Centro", "category": "retail"}
}

# FeatureCollection
SET regions arizona OBJECT {
  "type": "FeatureCollection",
  "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [-112.0740, 33.4484]}},
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [-110.9265, 32.2217]}}
  ]
}
```

### Tiles e QuadKeys (Apenas para Busca)

```bash
# XYZ Tile (x, y, zoom) - apenas para buscas
WITHIN fleet TILE 10 15 8

# QuadKey - apenas para buscas
WITHIN fleet QUADKEY 0123210
```

### Campos (Fields)

Metadados numericos (float64) associados a objetos.

```bash
# Definir campos ao criar objeto
SET fleet truck1 FIELD speed 90 FIELD fuel 75.5 FIELD capacity 1000 POINT 33.5 -112.2

# Atualizar campo existente
FSET fleet truck1 speed 85

# Obter valor de campo
FGET fleet truck1 speed

# Verificar se campo existe
FEXISTS fleet truck1 speed
```

---

## Comandos

### Comandos de Dados

#### SET - Armazenar Objeto

```bash
SET key id [FIELD name value ...] [EX seconds] [NX|XX] type data

# Exemplos
SET fleet truck1 POINT 33.5 -112.2
SET fleet truck2 FIELD speed 90 POINT 33.4 -112.1
SET fleet truck3 EX 3600 POINT 33.3 -112.0  # Expira em 1 hora
SET fleet truck4 NX POINT 33.2 -111.9        # Apenas se nao existir
SET fleet truck5 XX POINT 33.1 -111.8        # Apenas se existir
```

#### GET - Obter Objeto

```bash
GET key id [WITHFIELDS]

# Exemplos
GET fleet truck1
GET fleet truck1 WITHFIELDS
```

#### DEL - Deletar Objeto

```bash
DEL key id

# Exemplo
DEL fleet truck1
```

#### PDEL - Deletar por Padrao

```bash
PDEL key pattern

# Exemplos
PDEL fleet truck*      # Deleta todos que comecam com "truck"
PDEL fleet *           # Deleta todos os objetos
```

#### DROP - Remover Colecao

```bash
DROP key

# Exemplo
DROP fleet  # Remove toda a colecao fleet
```

#### RENAME / RENAMENX - Renomear

```bash
RENAME key id newid
RENAMENX key id newid  # Apenas se newid nao existir

# Exemplo
RENAME fleet truck1 vehicle1
```

#### EXISTS - Verificar Existencia

```bash
EXISTS key id

# Exemplo
EXISTS fleet truck1
```

#### KEYS - Listar Colecoes

```bash
KEYS [pattern]

# Exemplos
KEYS          # Todas as colecoes
KEYS fleet*   # Colecoes que comecam com "fleet"
```

#### TYPE - Tipo de Objeto

```bash
TYPE key id

# Exemplo
TYPE fleet truck1
```

### Comandos de Busca

#### SCAN - Iterar Colecao

```bash
SCAN key [CURSOR cursor] [LIMIT count] [MATCH pattern] [WHERE ...] [NOFIELDS]
         [ASC|DESC] output

# Outputs: COUNT, IDS, OBJECTS, POINTS, BOUNDS, HASHES precision, QUADKEYS, TILES

# Exemplos
SCAN fleet                           # Todos os objetos
SCAN fleet LIMIT 100                 # Primeiros 100
SCAN fleet CURSOR 0 LIMIT 100        # Paginacao
SCAN fleet MATCH truck*              # Filtrar por padrao
SCAN fleet WHERE speed > 50          # Filtrar por campo
SCAN fleet COUNT                     # Apenas contagem
SCAN fleet IDS                       # Apenas IDs
SCAN fleet POINTS                    # Apenas coordenadas
```

#### NEARBY - Busca por Proximidade

```bash
NEARBY key [CURSOR cursor] [LIMIT count] [MATCH pattern] [WHERE ...] [NOFIELDS]
           [FENCE] [DETECT ...] [COMMANDS ...] output
           POINT lat lon [meters]

# Exemplos
NEARBY fleet POINT 33.5 -112.2 5000               # Raio de 5km
NEARBY fleet LIMIT 10 POINT 33.5 -112.2 10000     # 10 mais proximos em 10km
NEARBY fleet WHERE speed > 50 POINT 33.5 -112.2 5000
NEARBY fleet FENCE POINT 33.5 -112.2 5000         # Geofence em tempo real
```

#### WITHIN - Busca Dentro de Area

```bash
WITHIN key [CURSOR cursor] [LIMIT count] [MATCH pattern] [WHERE ...] [NOFIELDS]
           [FENCE] [DETECT ...] [COMMANDS ...] output
           area

# Areas: BOUNDS, HASH, TILE, QUADKEY, OBJECT (GeoJSON)

# Exemplos
WITHIN fleet BOUNDS 30 -115 35 -110              # Dentro do retangulo
WITHIN fleet HASH 9tbn                           # Dentro do geohash
WITHIN fleet TILE 10 15 8                        # Dentro do tile
WITHIN fleet OBJECT {"type":"Polygon","coordinates":[...]}
```

#### INTERSECTS - Busca por Interseccao

```bash
INTERSECTS key [CURSOR cursor] [LIMIT count] [MATCH pattern] [WHERE ...] [NOFIELDS]
              [FENCE] [DETECT ...] [COMMANDS ...] output
              area

# Exemplos
INTERSECTS fleet BOUNDS 30 -115 35 -110
INTERSECTS fleet OBJECT {"type":"Polygon","coordinates":[...]}
```

### Comandos de Expiracao

```bash
# Definir TTL (segundos)
EXPIRE key id seconds
EXPIRE fleet truck1 3600

# Remover expiracao
PERSIST key id
PERSIST fleet truck1

# Verificar TTL restante
TTL key id
TTL fleet truck1
```

### Comandos JSON

```bash
# Definir valor JSON
JSET key id path value [RAW]
JSET fleet truck1 properties.driver "John"
JSET fleet truck1 properties.active true RAW

# Obter valor JSON
JGET key id path
JGET fleet truck1 properties.driver

# Deletar valor JSON
JDEL key id path
JDEL fleet truck1 properties.driver
```

### Comandos de Servidor

```bash
# Informacoes do servidor
INFO
SERVER

# Estatisticas
STATS

# Verificacao de saude
HEALTHZ

# Configuracao
CONFIG GET *
CONFIG GET requirepass
CONFIG SET requirepass "senha"
CONFIG REWRITE

# Gerenciamento de clientes
CLIENT LIST
CLIENT KILL ADDR 127.0.0.1:12345
CLIENT SETNAME myapp
CLIENT GETNAME

# AOF
AOF
AOFSHRINK
AOFMD5 start size

# Modo somente leitura
READONLY yes|no

# Limpar banco de dados
FLUSHDB

# Encerrar servidor
SHUTDOWN
```

---

## Geofencing

Geofencing permite monitorar objetos em tempo real quando entram ou saem de areas geograficas.

### Tipos de Deteccao

| Tipo | Descricao |
|------|-----------|
| `enter` | Objeto entrou na area |
| `exit` | Objeto saiu da area |
| `inside` | Objeto esta dentro da area |
| `outside` | Objeto esta fora da area |
| `cross` | Objeto cruzou a borda da area |

### Geofence Simples (Conexao Persistente)

```bash
# Geofence por proximidade
NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Geofence por area
WITHIN fleet FENCE BOUNDS 30 -115 35 -110

# Geofence por poligono
WITHIN fleet FENCE OBJECT {
  "type": "Polygon",
  "coordinates": [[
    [-112.1, 33.4],
    [-112.1, 33.5],
    [-112.0, 33.5],
    [-112.0, 33.4],
    [-112.1, 33.4]
  ]]
}
```

Resposta inicial:
```json
{"ok":true,"live":true}
```

Eventos em tempo real:
```json
{
  "command": "set",
  "group": "5c5f5a...",
  "detect": "enter",
  "key": "fleet",
  "time": "2024-01-15T10:30:00.000Z",
  "id": "truck1",
  "object": {
    "type": "Point",
    "coordinates": [-112.2693, 33.5123]
  },
  "fields": {"speed": 90}
}
```

### Opcoes de Geofence

```bash
# Especificar tipos de deteccao
NEARBY fleet FENCE DETECT enter,exit POINT 33.5 -112.2 5000

# Filtrar por comando
NEARBY fleet FENCE COMMANDS set,del POINT 33.5 -112.2 5000

# Filtrar por padrao de ID
NEARBY fleet FENCE MATCH truck* POINT 33.5 -112.2 5000

# Filtrar por campo
NEARBY fleet FENCE WHERE speed > 50 POINT 33.5 -112.2 5000

# Nao enviar eventos "inside" repetidos
NEARBY fleet FENCE NODWELL POINT 33.5 -112.2 5000
```

### Roaming (Proximidade Entre Objetos)

Detecta quando objetos se aproximam uns dos outros:

```bash
# Monitorar quando qualquer objeto de "fleet" se aproxima de outro em "pois" em 1000m
NEARBY fleet FENCE ROAM pois * 1000

# Evento quando truck1 se aproxima de gas_station_1
{
  "command": "set",
  "detect": "enter",
  "key": "fleet",
  "id": "truck1",
  "nearby": {
    "key": "pois",
    "id": "gas_station_1",
    "meters": 500
  }
}
```

---

## Webhooks

Webhooks permitem enviar notificacoes de geofence para endpoints externos.

### Criar Webhook

```bash
SETHOOK name endpoint [META meta] [EX seconds] searchtype key area

# Exemplo HTTP
SETHOOK mywebhook http://myserver.com/webhook NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com metadados
SETHOOK mywebhook http://myserver.com/webhook META {"zone":"downtown"} NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com expiracao
SETHOOK mywebhook http://myserver.com/webhook EX 86400 NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

### Endpoints Suportados

#### HTTP/HTTPS

```bash
SETHOOK myhook http://myserver.com/webhook NEARBY fleet FENCE POINT 33.5 -112.2 5000
SETHOOK myhook https://myserver.com/webhook NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### Kafka

```bash
# Basico
SETHOOK myhook kafka://localhost:9092/mytopic NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com SASL
SETHOOK myhook kafka://localhost:9092/mytopic?sasl=plain&user=myuser&pass=mypass NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com SSL
SETHOOK myhook kafka://localhost:9093/mytopic?ssl=true&sslca=/path/ca.pem NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### RabbitMQ (AMQP)

```bash
# Basico
SETHOOK myhook amqp://guest:guest@localhost:5672/myqueue NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com exchange
SETHOOK myhook amqp://localhost:5672/myqueue?exchange=myexchange&routingKey=geo.events NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### NATS

```bash
# Basico
SETHOOK myhook nats://localhost:4222/mysubject NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com usuario e senha
SETHOOK myhook nats://user:pass@localhost:4222/mysubject NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### Redis Pub/Sub

```bash
SETHOOK myhook redis://localhost:6379/mychannel NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### MQTT

```bash
# Basico
SETHOOK myhook mqtt://localhost:1883/mytopic NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com TLS
SETHOOK myhook mqtt://localhost:8883/mytopic?ssl=true NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com credenciais
SETHOOK myhook mqtt://user:pass@localhost:1883/mytopic NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### AWS SQS

```bash
SETHOOK myhook sqs://us-west-2/myqueue?credpath=/path/to/credentials NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### Google Cloud Pub/Sub

```bash
SETHOOK myhook gcppubsub://myproject/mytopic?credpath=/path/to/credentials.json NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### Azure Event Hub

```bash
SETHOOK myhook eventgrid://myeventhub.servicebus.windows.net/myhub?key=mykey NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

#### gRPC

```bash
SETHOOK myhook grpc://localhost:50051 NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

### Gerenciar Webhooks

```bash
# Listar webhooks
HOOKS *
HOOKS mywebhook*

# Deletar webhook
DELHOOK mywebhook

# Deletar por padrao
PDELHOOK downtown*
```

### Formato da Mensagem

```json
{
  "command": "set",
  "group": "5c5f5a...",
  "detect": "enter",
  "hook": "mywebhook",
  "key": "fleet",
  "time": "2024-01-15T10:30:00.000000000Z",
  "id": "truck1",
  "meta": {"zone": "downtown"},
  "object": {
    "type": "Point",
    "coordinates": [-112.2693, 33.5123]
  },
  "fields": {"speed": 90, "fuel": 75.5}
}
```

---

## Pub/Sub

O Meridian oferece um sistema de pub/sub interno para notificacoes em tempo real.

### Canais de Geofence

```bash
# Criar canal de geofence
SETCHAN mychannel [META meta] [EX seconds] searchtype key area

# Exemplo
SETCHAN downtown_alerts NEARBY fleet FENCE POINT 33.5 -112.2 5000

# Com metadados
SETCHAN downtown_alerts META {"severity":"high"} NEARBY fleet FENCE POINT 33.5 -112.2 5000
```

### Inscrever-se em Canais

```bash
# Inscrever em canal especifico
SUBSCRIBE mychannel

# Inscrever em multiplos canais
SUBSCRIBE channel1 channel2 channel3

# Inscrever por padrao (glob)
PSUBSCRIBE downtown_*
PSUBSCRIBE *_alerts
```

### Publicar Mensagens

```bash
# Publicar mensagem customizada
PUBLISH mychannel "Mensagem customizada"
```

### Gerenciar Canais

```bash
# Listar canais
CHANS *
CHANS downtown*

# Deletar canal
DELCHAN downtown_alerts

# Deletar por padrao
PDELCHAN *_alerts
```

### Exemplo Completo

```bash
# Terminal 1 - Criar canal e inscrever
> SETCHAN vehicle_zone NEARBY fleet FENCE POINT 33.5 -112.2 5000
OK

> SUBSCRIBE vehicle_zone
+subscribe
vehicle_zone
1

# Terminal 2 - Atualizar localizacao
> SET fleet truck1 POINT 33.5 -112.19
OK

# Terminal 1 - Recebe notificacao
+message
vehicle_zone
{"command":"set","detect":"enter","id":"truck1",...}
```

---

## Integracao com NestJS

Esta secao demonstra como integrar o AIQIA Meridian com aplicacoes NestJS.

### Estrutura do Projeto

```
src/
├── meridian/
│   ├── meridian.module.ts
│   ├── meridian.service.ts
│   ├── meridian.config.ts
│   ├── interfaces/
│   │   ├── meridian-object.interface.ts
│   │   ├── geofence-event.interface.ts
│   │   └── search-options.interface.ts
│   ├── dto/
│   │   ├── create-object.dto.ts
│   │   ├── update-location.dto.ts
│   │   └── search.dto.ts
│   └── decorators/
│       └── geofence-listener.decorator.ts
├── fleet/
│   ├── fleet.module.ts
│   ├── fleet.service.ts
│   ├── fleet.controller.ts
│   └── fleet.gateway.ts
└── app.module.ts
```

### Instalacao de Dependencias

```bash
npm install ioredis @nestjs/websockets @nestjs/platform-socket.io
npm install -D @types/ioredis
```

### Configuracao

```typescript
// src/meridian/meridian.config.ts
export interface MeridianConfig {
  host: string;
  port: number;
  password?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export const MERIDIAN_CONFIG: MeridianConfig = {
  host: process.env.MERIDIAN_HOST || '127.0.0.1',
  port: parseInt(process.env.MERIDIAN_PORT || '9851'),
  password: process.env.MERIDIAN_PASSWORD,
  maxRetries: 3,
  retryDelay: 1000,
};
```

### Interfaces

```typescript
// src/meridian/interfaces/meridian-object.interface.ts
export interface MeridianPoint {
  lat: number;
  lon: number;
  z?: number;
}

export interface MeridianBounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface MeridianObject {
  id: string;
  type: 'Point' | 'Polygon' | 'LineString' | 'MultiPolygon' | 'Feature';
  coordinates?: number[] | number[][] | number[][][];
  properties?: Record<string, any>;
}

export interface MeridianFields {
  [key: string]: number;
}

// src/meridian/interfaces/geofence-event.interface.ts
export type DetectType = 'enter' | 'exit' | 'inside' | 'outside' | 'cross';
export type CommandType = 'set' | 'del' | 'drop';

export interface GeofenceEvent {
  command: CommandType;
  group: string;
  detect: DetectType;
  hook?: string;
  key: string;
  time: string;
  id: string;
  meta?: Record<string, any>;
  object: {
    type: string;
    coordinates: number[];
  };
  fields?: Record<string, number>;
  nearby?: {
    key: string;
    id: string;
    meters: number;
  };
}

// src/meridian/interfaces/search-options.interface.ts
export interface SearchOptions {
  cursor?: number;
  limit?: number;
  match?: string;
  where?: string[];
  nofields?: boolean;
  asc?: boolean;
  desc?: boolean;
}

export type OutputFormat =
  | 'OBJECTS'
  | 'POINTS'
  | 'IDS'
  | 'COUNT'
  | 'BOUNDS'
  | 'HASHES'
  | 'QUADKEYS'
  | 'TILES';
```

### DTOs

```typescript
// src/meridian/dto/create-object.dto.ts
import { IsString, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PointDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsOptional()
  @IsNumber()
  z?: number;
}

export class CreateObjectDto {
  @IsString()
  collection: string;

  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => PointDto)
  point: PointDto;

  @IsOptional()
  @IsObject()
  fields?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  expiresIn?: number;
}

// src/meridian/dto/update-location.dto.ts
export class UpdateLocationDto {
  @IsString()
  collection: string;

  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => PointDto)
  point: PointDto;

  @IsOptional()
  @IsObject()
  fields?: Record<string, number>;
}

// src/meridian/dto/search.dto.ts
export class NearbySearchDto {
  @IsString()
  collection: string;

  @ValidateNested()
  @Type(() => PointDto)
  point: PointDto;

  @IsNumber()
  radius: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  match?: string;
}
```

### Servico Principal

```typescript
// src/meridian/meridian.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { MeridianConfig, MERIDIAN_CONFIG } from './meridian.config';
import {
  MeridianPoint,
  MeridianBounds,
  MeridianObject,
  MeridianFields
} from './interfaces/meridian-object.interface';
import { GeofenceEvent, DetectType } from './interfaces/geofence-event.interface';
import { SearchOptions, OutputFormat } from './interfaces/search-options.interface';

@Injectable()
export class MeridianService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private subscribeClient: Redis;
  private readonly logger = new Logger(MeridianService.name);
  private readonly config: MeridianConfig;
  private geofenceConnections: Map<string, Redis> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.config = MERIDIAN_CONFIG;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // ==================== Conexao ====================

  private async connect(): Promise<void> {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      maxRetriesPerRequest: this.config.maxRetries,
      retryStrategy: (times) => {
        if (times > this.config.maxRetries) {
          return null;
        }
        return Math.min(times * this.config.retryDelay, 5000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Meridian server');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Meridian connection error: ${err.message}`);
    });

    // Cliente separado para subscriptions
    this.subscribeClient = this.client.duplicate();
  }

  private async disconnect(): Promise<void> {
    // Fechar todas as conexoes de geofence
    for (const [name, conn] of this.geofenceConnections) {
      await conn.disconnect();
      this.logger.log(`Closed geofence connection: ${name}`);
    }
    this.geofenceConnections.clear();

    await this.subscribeClient?.disconnect();
    await this.client?.disconnect();
    this.logger.log('Disconnected from Meridian server');
  }

  // ==================== Comandos Basicos ====================

  async set(
    collection: string,
    id: string,
    point: MeridianPoint,
    options?: {
      fields?: MeridianFields;
      expiresIn?: number;
      nx?: boolean;
      xx?: boolean;
    }
  ): Promise<boolean> {
    const args = [collection, id];

    // Adicionar campos
    if (options?.fields) {
      for (const [key, value] of Object.entries(options.fields)) {
        args.push('FIELD', key, String(value));
      }
    }

    // Opcoes de existencia
    if (options?.nx) args.push('NX');
    if (options?.xx) args.push('XX');

    // Expiracao
    if (options?.expiresIn) {
      args.push('EX', String(options.expiresIn));
    }

    // Ponto
    args.push('POINT', String(point.lat), String(point.lon));
    if (point.z !== undefined) {
      args.push(String(point.z));
    }

    const result = await this.client.call('SET', ...args);
    return result === 'OK';
  }

  async setObject(
    collection: string,
    id: string,
    geoJSON: object,
    options?: {
      fields?: MeridianFields;
      expiresIn?: number;
    }
  ): Promise<boolean> {
    const args = [collection, id];

    if (options?.fields) {
      for (const [key, value] of Object.entries(options.fields)) {
        args.push('FIELD', key, String(value));
      }
    }

    if (options?.expiresIn) {
      args.push('EX', String(options.expiresIn));
    }

    args.push('OBJECT', JSON.stringify(geoJSON));

    const result = await this.client.call('SET', ...args);
    return result === 'OK';
  }

  async get(collection: string, id: string, withFields = false): Promise<any> {
    const args = [collection, id];
    if (withFields) args.push('WITHFIELDS');

    const result = await this.client.call('GET', ...args);
    return this.parseResponse(result);
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const result = await this.client.call('DEL', collection, id);
    return result === 1;
  }

  async drop(collection: string): Promise<boolean> {
    const result = await this.client.call('DROP', collection);
    return result === 'OK';
  }

  async exists(collection: string, id: string): Promise<boolean> {
    const result = await this.client.call('EXISTS', collection, id);
    return result === 1;
  }

  // ==================== Campos ====================

  async setField(
    collection: string,
    id: string,
    field: string,
    value: number
  ): Promise<boolean> {
    const result = await this.client.call('FSET', collection, id, field, String(value));
    return result === 1;
  }

  async getField(collection: string, id: string, field: string): Promise<number | null> {
    const result = await this.client.call('FGET', collection, id, field);
    return result !== null ? parseFloat(result as string) : null;
  }

  async setFields(
    collection: string,
    id: string,
    fields: MeridianFields
  ): Promise<boolean> {
    const args = [collection, id];
    for (const [key, value] of Object.entries(fields)) {
      args.push(key, String(value));
    }
    const result = await this.client.call('FSET', ...args);
    return result >= 1;
  }

  // ==================== Buscas ====================

  async nearby(
    collection: string,
    point: MeridianPoint,
    radius: number,
    options?: SearchOptions,
    output: OutputFormat = 'OBJECTS'
  ): Promise<any> {
    const args = this.buildSearchArgs(collection, options, output);
    args.push('POINT', String(point.lat), String(point.lon), String(radius));

    const result = await this.client.call('NEARBY', ...args);
    return this.parseSearchResult(result, output);
  }

  async within(
    collection: string,
    bounds: MeridianBounds | object,
    options?: SearchOptions,
    output: OutputFormat = 'OBJECTS'
  ): Promise<any> {
    const args = this.buildSearchArgs(collection, options, output);

    if ('minLat' in bounds) {
      args.push(
        'BOUNDS',
        String(bounds.minLat),
        String(bounds.minLon),
        String(bounds.maxLat),
        String(bounds.maxLon)
      );
    } else {
      args.push('OBJECT', JSON.stringify(bounds));
    }

    const result = await this.client.call('WITHIN', ...args);
    return this.parseSearchResult(result, output);
  }

  async intersects(
    collection: string,
    geometry: MeridianBounds | object,
    options?: SearchOptions,
    output: OutputFormat = 'OBJECTS'
  ): Promise<any> {
    const args = this.buildSearchArgs(collection, options, output);

    if ('minLat' in geometry) {
      args.push(
        'BOUNDS',
        String(geometry.minLat),
        String(geometry.minLon),
        String(geometry.maxLat),
        String(geometry.maxLon)
      );
    } else {
      args.push('OBJECT', JSON.stringify(geometry));
    }

    const result = await this.client.call('INTERSECTS', ...args);
    return this.parseSearchResult(result, output);
  }

  async scan(
    collection: string,
    options?: SearchOptions,
    output: OutputFormat = 'OBJECTS'
  ): Promise<any> {
    const args = this.buildSearchArgs(collection, options, output);
    const result = await this.client.call('SCAN', ...args);
    return this.parseSearchResult(result, output);
  }

  private buildSearchArgs(
    collection: string,
    options?: SearchOptions,
    output: OutputFormat = 'OBJECTS'
  ): string[] {
    const args = [collection];

    if (options?.cursor !== undefined) {
      args.push('CURSOR', String(options.cursor));
    }
    if (options?.limit !== undefined) {
      args.push('LIMIT', String(options.limit));
    }
    if (options?.match) {
      args.push('MATCH', options.match);
    }
    if (options?.where) {
      for (const condition of options.where) {
        args.push('WHERE', condition);
      }
    }
    if (options?.nofields) {
      args.push('NOFIELDS');
    }
    if (options?.asc) {
      args.push('ASC');
    }
    if (options?.desc) {
      args.push('DESC');
    }

    args.push(output);
    return args;
  }

  // ==================== Geofencing ====================

  async createGeofence(
    name: string,
    collection: string,
    point: MeridianPoint,
    radius: number,
    options?: {
      detect?: DetectType[];
      commands?: string[];
      match?: string;
      where?: string[];
    },
    onEvent?: (event: GeofenceEvent) => void
  ): Promise<void> {
    // Criar conexao dedicada para o geofence
    const geofenceClient = this.client.duplicate();
    this.geofenceConnections.set(name, geofenceClient);

    const args = [collection];

    if (options?.match) {
      args.push('MATCH', options.match);
    }
    if (options?.where) {
      for (const condition of options.where) {
        args.push('WHERE', condition);
      }
    }

    args.push('FENCE');

    if (options?.detect) {
      args.push('DETECT', options.detect.join(','));
    }
    if (options?.commands) {
      args.push('COMMANDS', options.commands.join(','));
    }

    args.push('POINT', String(point.lat), String(point.lon), String(radius));

    // Executar comando e processar eventos
    const stream = geofenceClient.call('NEARBY', ...args);

    // Processar respostas do stream
    geofenceClient.on('message', (channel, message) => {
      try {
        const event: GeofenceEvent = JSON.parse(message);

        // Emitir evento global
        this.eventEmitter.emit('geofence.event', event);
        this.eventEmitter.emit(`geofence.${name}`, event);
        this.eventEmitter.emit(`geofence.${event.detect}`, event);

        // Callback especifico
        if (onEvent) {
          onEvent(event);
        }
      } catch (err) {
        this.logger.error(`Error parsing geofence event: ${err.message}`);
      }
    });

    this.logger.log(`Geofence "${name}" created for collection "${collection}"`);
  }

  async removeGeofence(name: string): Promise<void> {
    const connection = this.geofenceConnections.get(name);
    if (connection) {
      await connection.disconnect();
      this.geofenceConnections.delete(name);
      this.logger.log(`Geofence "${name}" removed`);
    }
  }

  // ==================== Webhooks ====================

  async createWebhook(
    name: string,
    endpoint: string,
    collection: string,
    searchType: 'NEARBY' | 'WITHIN' | 'INTERSECTS',
    area: {
      point?: MeridianPoint;
      radius?: number;
      bounds?: MeridianBounds;
      object?: object;
    },
    options?: {
      meta?: Record<string, any>;
      expiresIn?: number;
      detect?: DetectType[];
      commands?: string[];
      match?: string;
      where?: string[];
    }
  ): Promise<boolean> {
    const args = [name, endpoint];

    if (options?.meta) {
      args.push('META', JSON.stringify(options.meta));
    }
    if (options?.expiresIn) {
      args.push('EX', String(options.expiresIn));
    }

    args.push(searchType, collection);

    if (options?.match) {
      args.push('MATCH', options.match);
    }
    if (options?.where) {
      for (const condition of options.where) {
        args.push('WHERE', condition);
      }
    }

    args.push('FENCE');

    if (options?.detect) {
      args.push('DETECT', options.detect.join(','));
    }
    if (options?.commands) {
      args.push('COMMANDS', options.commands.join(','));
    }

    // Adicionar area
    if (area.point && area.radius !== undefined) {
      args.push('POINT', String(area.point.lat), String(area.point.lon), String(area.radius));
    } else if (area.bounds) {
      args.push(
        'BOUNDS',
        String(area.bounds.minLat),
        String(area.bounds.minLon),
        String(area.bounds.maxLat),
        String(area.bounds.maxLon)
      );
    } else if (area.object) {
      args.push('OBJECT', JSON.stringify(area.object));
    }

    const result = await this.client.call('SETHOOK', ...args);
    return result === 'OK';
  }

  async deleteWebhook(name: string): Promise<boolean> {
    const result = await this.client.call('DELHOOK', name);
    return result === 1;
  }

  async listWebhooks(pattern = '*'): Promise<any[]> {
    const result = await this.client.call('HOOKS', pattern);
    return this.parseResponse(result);
  }

  // ==================== Pub/Sub Channels ====================

  async createChannel(
    name: string,
    collection: string,
    searchType: 'NEARBY' | 'WITHIN' | 'INTERSECTS',
    area: {
      point?: MeridianPoint;
      radius?: number;
      bounds?: MeridianBounds;
      object?: object;
    },
    options?: {
      meta?: Record<string, any>;
      expiresIn?: number;
      detect?: DetectType[];
      match?: string;
      where?: string[];
    }
  ): Promise<boolean> {
    const args = [name];

    if (options?.meta) {
      args.push('META', JSON.stringify(options.meta));
    }
    if (options?.expiresIn) {
      args.push('EX', String(options.expiresIn));
    }

    args.push(searchType, collection);

    if (options?.match) {
      args.push('MATCH', options.match);
    }
    if (options?.where) {
      for (const condition of options.where) {
        args.push('WHERE', condition);
      }
    }

    args.push('FENCE');

    if (options?.detect) {
      args.push('DETECT', options.detect.join(','));
    }

    // Adicionar area
    if (area.point && area.radius !== undefined) {
      args.push('POINT', String(area.point.lat), String(area.point.lon), String(area.radius));
    } else if (area.bounds) {
      args.push(
        'BOUNDS',
        String(area.bounds.minLat),
        String(area.bounds.minLon),
        String(area.bounds.maxLat),
        String(area.bounds.maxLon)
      );
    } else if (area.object) {
      args.push('OBJECT', JSON.stringify(area.object));
    }

    const result = await this.client.call('SETCHAN', ...args);
    return result === 'OK';
  }

  async subscribe(
    channels: string | string[],
    callback: (channel: string, event: GeofenceEvent) => void
  ): Promise<void> {
    const channelList = Array.isArray(channels) ? channels : [channels];

    this.subscribeClient.on('message', (channel, message) => {
      try {
        const event: GeofenceEvent = JSON.parse(message);
        callback(channel, event);

        // Emitir eventos
        this.eventEmitter.emit('channel.message', { channel, event });
        this.eventEmitter.emit(`channel.${channel}`, event);
      } catch (err) {
        this.logger.error(`Error parsing channel message: ${err.message}`);
      }
    });

    await this.subscribeClient.call('SUBSCRIBE', ...channelList);
    this.logger.log(`Subscribed to channels: ${channelList.join(', ')}`);
  }

  async psubscribe(
    patterns: string | string[],
    callback: (pattern: string, channel: string, event: GeofenceEvent) => void
  ): Promise<void> {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];

    this.subscribeClient.on('pmessage', (pattern, channel, message) => {
      try {
        const event: GeofenceEvent = JSON.parse(message);
        callback(pattern, channel, event);

        this.eventEmitter.emit('channel.pmessage', { pattern, channel, event });
      } catch (err) {
        this.logger.error(`Error parsing pattern message: ${err.message}`);
      }
    });

    await this.subscribeClient.call('PSUBSCRIBE', ...patternList);
    this.logger.log(`Pattern subscribed: ${patternList.join(', ')}`);
  }

  async deleteChannel(name: string): Promise<boolean> {
    const result = await this.client.call('DELCHAN', name);
    return result === 1;
  }

  async listChannels(pattern = '*'): Promise<any[]> {
    const result = await this.client.call('CHANS', pattern);
    return this.parseResponse(result);
  }

  // ==================== Expiracao ====================

  async expire(collection: string, id: string, seconds: number): Promise<boolean> {
    const result = await this.client.call('EXPIRE', collection, id, String(seconds));
    return result === 1;
  }

  async persist(collection: string, id: string): Promise<boolean> {
    const result = await this.client.call('PERSIST', collection, id);
    return result === 1;
  }

  async ttl(collection: string, id: string): Promise<number> {
    const result = await this.client.call('TTL', collection, id);
    return parseInt(result as string, 10);
  }

  // ==================== JSON ====================

  async jset(
    collection: string,
    id: string,
    path: string,
    value: any,
    raw = false
  ): Promise<boolean> {
    const args = [collection, id, path, typeof value === 'string' ? value : JSON.stringify(value)];
    if (raw) args.push('RAW');

    const result = await this.client.call('JSET', ...args);
    return result === 'OK';
  }

  async jget(collection: string, id: string, path?: string): Promise<any> {
    const args = [collection, id];
    if (path) args.push(path);

    const result = await this.client.call('JGET', ...args);
    try {
      return JSON.parse(result as string);
    } catch {
      return result;
    }
  }

  async jdel(collection: string, id: string, path: string): Promise<boolean> {
    const result = await this.client.call('JDEL', collection, id, path);
    return result === 'OK';
  }

  // ==================== Servidor ====================

  async info(): Promise<Record<string, any>> {
    const result = await this.client.call('INFO');
    return this.parseInfoResponse(result as string);
  }

  async stats(): Promise<any[]> {
    const result = await this.client.call('STATS');
    return this.parseResponse(result);
  }

  async healthz(): Promise<boolean> {
    const result = await this.client.call('HEALTHZ');
    return result === 'OK';
  }

  async keys(pattern = '*'): Promise<string[]> {
    const result = await this.client.call('KEYS', pattern);
    return (result as any[])?.[1] || [];
  }

  async bounds(collection: string): Promise<MeridianBounds | null> {
    const result = await this.client.call('BOUNDS', collection);
    const parsed = this.parseResponse(result);
    if (parsed?.bounds) {
      return {
        minLat: parsed.bounds.sw.lat,
        minLon: parsed.bounds.sw.lon,
        maxLat: parsed.bounds.ne.lat,
        maxLon: parsed.bounds.ne.lon,
      };
    }
    return null;
  }

  // ==================== Helpers ====================

  private parseResponse(result: any): any {
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    if (Array.isArray(result)) {
      return result.map(item => this.parseResponse(item));
    }
    return result;
  }

  private parseSearchResult(result: any, output: OutputFormat): any {
    const parsed = this.parseResponse(result);

    if (output === 'COUNT') {
      return { count: parsed?.count || 0 };
    }

    return {
      cursor: parsed?.cursor || 0,
      count: parsed?.count || 0,
      objects: parsed?.objects || [],
      points: parsed?.points || [],
      ids: parsed?.ids || [],
      fields: parsed?.fields || [],
    };
  }

  private parseInfoResponse(result: string): Record<string, any> {
    const info: Record<string, any> = {};
    const lines = result.split('\n');
    let section = 'general';

    for (const line of lines) {
      if (line.startsWith('#')) {
        section = line.slice(1).trim().toLowerCase();
        info[section] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        info[section][key.trim()] = value.trim();
      }
    }

    return info;
  }
}
```

### Modulo Meridian

```typescript
// src/meridian/meridian.module.ts
import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MeridianService } from './meridian.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [MeridianService],
  exports: [MeridianService],
})
export class MeridianModule {}
```

### Exemplo: Modulo de Frota

```typescript
// src/fleet/fleet.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MeridianService } from '../meridian/meridian.service';
import { GeofenceEvent } from '../meridian/interfaces/geofence-event.interface';

interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  fuel?: number;
  driver?: string;
}

interface Zone {
  id: string;
  name: string;
  type: 'pickup' | 'dropoff' | 'restricted' | 'warehouse';
  lat: number;
  lon: number;
  radius: number;
}

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);
  private readonly COLLECTION = 'fleet';
  private readonly ZONES_COLLECTION = 'zones';

  constructor(private readonly meridian: MeridianService) {}

  // ==================== Veiculos ====================

  async updateVehicleLocation(vehicle: Vehicle): Promise<boolean> {
    return this.meridian.set(
      this.COLLECTION,
      vehicle.id,
      { lat: vehicle.lat, lon: vehicle.lon },
      {
        fields: {
          speed: vehicle.speed || 0,
          heading: vehicle.heading || 0,
          fuel: vehicle.fuel || 100,
        },
      }
    );
  }

  async getVehicle(id: string): Promise<any> {
    return this.meridian.get(this.COLLECTION, id, true);
  }

  async getAllVehicles(): Promise<any> {
    return this.meridian.scan(this.COLLECTION, { limit: 1000 });
  }

  async getVehiclesNearby(lat: number, lon: number, radiusMeters: number): Promise<any> {
    return this.meridian.nearby(
      this.COLLECTION,
      { lat, lon },
      radiusMeters,
      { limit: 100 }
    );
  }

  async getVehiclesInZone(zone: Zone): Promise<any> {
    return this.meridian.nearby(
      this.COLLECTION,
      { lat: zone.lat, lon: zone.lon },
      zone.radius
    );
  }

  async getMovingVehicles(minSpeed: number = 5): Promise<any> {
    return this.meridian.scan(
      this.COLLECTION,
      { where: [`speed > ${minSpeed}`] }
    );
  }

  async removeVehicle(id: string): Promise<boolean> {
    return this.meridian.delete(this.COLLECTION, id);
  }

  // ==================== Zonas ====================

  async createZone(zone: Zone): Promise<boolean> {
    return this.meridian.set(
      this.ZONES_COLLECTION,
      zone.id,
      { lat: zone.lat, lon: zone.lon },
      {
        fields: { radius: zone.radius },
      }
    );
  }

  async setupZoneMonitoring(zone: Zone): Promise<void> {
    // Criar webhook para notificacoes HTTP
    await this.meridian.createWebhook(
      `zone_${zone.id}_webhook`,
      'http://localhost:3000/api/fleet/webhook',
      this.COLLECTION,
      'NEARBY',
      { point: { lat: zone.lat, lon: zone.lon }, radius: zone.radius },
      {
        meta: { zoneId: zone.id, zoneName: zone.name, zoneType: zone.type },
        detect: ['enter', 'exit'],
      }
    );

    // Criar canal pub/sub para notificacoes internas
    await this.meridian.createChannel(
      `zone_${zone.id}`,
      this.COLLECTION,
      'NEARBY',
      { point: { lat: zone.lat, lon: zone.lon }, radius: zone.radius },
      {
        meta: { zoneId: zone.id, zoneName: zone.name },
        detect: ['enter', 'exit', 'cross'],
      }
    );

    // Inscrever no canal
    await this.meridian.subscribe(`zone_${zone.id}`, (channel, event) => {
      this.handleZoneEvent(zone, event);
    });

    this.logger.log(`Zone monitoring setup complete for: ${zone.name}`);
  }

  private handleZoneEvent(zone: Zone, event: GeofenceEvent): void {
    this.logger.log(
      `Vehicle ${event.id} ${event.detect} zone ${zone.name}`
    );

    // Logica de negocios baseada no tipo de zona
    switch (zone.type) {
      case 'pickup':
        if (event.detect === 'enter') {
          this.notifyPickupArrival(event.id, zone);
        }
        break;
      case 'dropoff':
        if (event.detect === 'enter') {
          this.notifyDeliveryArrival(event.id, zone);
        }
        break;
      case 'restricted':
        if (event.detect === 'enter') {
          this.alertRestrictedZoneEntry(event.id, zone);
        }
        break;
    }
  }

  private notifyPickupArrival(vehicleId: string, zone: Zone): void {
    this.logger.log(`Notifying pickup arrival: ${vehicleId} at ${zone.name}`);
    // Implementar notificacao (push, SMS, etc.)
  }

  private notifyDeliveryArrival(vehicleId: string, zone: Zone): void {
    this.logger.log(`Notifying delivery arrival: ${vehicleId} at ${zone.name}`);
    // Implementar notificacao
  }

  private alertRestrictedZoneEntry(vehicleId: string, zone: Zone): void {
    this.logger.warn(`ALERT: ${vehicleId} entered restricted zone ${zone.name}`);
    // Implementar alerta
  }

  // ==================== Event Listeners ====================

  @OnEvent('geofence.enter')
  handleEnterEvent(event: GeofenceEvent) {
    this.logger.log(`Global enter event: ${event.id}`);
  }

  @OnEvent('geofence.exit')
  handleExitEvent(event: GeofenceEvent) {
    this.logger.log(`Global exit event: ${event.id}`);
  }
}
```

### Controller

```typescript
// src/fleet/fleet.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FleetService } from './fleet.service';

class UpdateLocationDto {
  id: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  fuel?: number;
}

class NearbyQueryDto {
  lat: number;
  lon: number;
  radius: number;
}

class CreateZoneDto {
  id: string;
  name: string;
  type: 'pickup' | 'dropoff' | 'restricted' | 'warehouse';
  lat: number;
  lon: number;
  radius: number;
}

class WebhookPayloadDto {
  command: string;
  detect: string;
  hook: string;
  key: string;
  id: string;
  object: any;
  fields?: any;
  meta?: any;
}

@Controller('api/fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  // ==================== Veiculos ====================

  @Get('vehicles')
  async getAllVehicles() {
    return this.fleetService.getAllVehicles();
  }

  @Get('vehicles/:id')
  async getVehicle(@Param('id') id: string) {
    return this.fleetService.getVehicle(id);
  }

  @Put('vehicles/location')
  async updateLocation(@Body() dto: UpdateLocationDto) {
    const success = await this.fleetService.updateVehicleLocation(dto);
    return { success };
  }

  @Delete('vehicles/:id')
  async removeVehicle(@Param('id') id: string) {
    const success = await this.fleetService.removeVehicle(id);
    return { success };
  }

  @Get('vehicles/nearby')
  async getNearbyVehicles(@Query() query: NearbyQueryDto) {
    return this.fleetService.getVehiclesNearby(
      query.lat,
      query.lon,
      query.radius
    );
  }

  @Get('vehicles/moving')
  async getMovingVehicles(@Query('minSpeed') minSpeed?: number) {
    return this.fleetService.getMovingVehicles(minSpeed);
  }

  // ==================== Zonas ====================

  @Post('zones')
  async createZone(@Body() dto: CreateZoneDto) {
    await this.fleetService.createZone(dto);
    await this.fleetService.setupZoneMonitoring(dto);
    return { success: true, message: `Zone ${dto.name} created and monitoring started` };
  }

  // ==================== Webhook ====================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: WebhookPayloadDto) {
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Processar evento do webhook
    const { detect, id, meta } = payload;

    if (meta?.zoneType === 'restricted' && detect === 'enter') {
      // Alerta de seguranca
      console.warn(`SECURITY ALERT: Vehicle ${id} entered restricted zone ${meta.zoneName}`);
    }

    return { received: true };
  }
}
```

### Gateway WebSocket

```typescript
// src/fleet/fleet.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { MeridianService } from '../meridian/meridian.service';
import { GeofenceEvent } from '../meridian/interfaces/geofence-event.interface';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/fleet',
})
export class FleetGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);
  private clientSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private readonly meridian: MeridianService) {}

  afterInit() {
    this.logger.log('Fleet WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientSubscriptions.delete(client.id);
  }

  // Cliente se inscreve para receber atualizacoes de veiculos
  @SubscribeMessage('subscribe:vehicles')
  handleSubscribeVehicles(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { collection?: string }
  ) {
    const collection = data.collection || 'fleet';
    client.join(`vehicles:${collection}`);
    this.clientSubscriptions.get(client.id)?.add(`vehicles:${collection}`);

    this.logger.log(`Client ${client.id} subscribed to vehicles:${collection}`);
    return { event: 'subscribed', data: { collection } };
  }

  // Cliente se inscreve para receber eventos de zona especifica
  @SubscribeMessage('subscribe:zone')
  handleSubscribeZone(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { zoneId: string }
  ) {
    client.join(`zone:${data.zoneId}`);
    this.clientSubscriptions.get(client.id)?.add(`zone:${data.zoneId}`);

    this.logger.log(`Client ${client.id} subscribed to zone:${data.zoneId}`);
    return { event: 'subscribed', data: { zoneId: data.zoneId } };
  }

  // Cliente envia atualizacao de localizacao
  @SubscribeMessage('update:location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      id: string;
      lat: number;
      lon: number;
      speed?: number;
      heading?: number;
    }
  ) {
    const success = await this.meridian.set(
      'fleet',
      data.id,
      { lat: data.lat, lon: data.lon },
      {
        fields: {
          speed: data.speed || 0,
          heading: data.heading || 0,
        },
      }
    );

    // Broadcast para todos os clientes inscritos
    this.server.to('vehicles:fleet').emit('vehicle:updated', {
      id: data.id,
      lat: data.lat,
      lon: data.lon,
      speed: data.speed,
      heading: data.heading,
      timestamp: new Date().toISOString(),
    });

    return { event: 'location:updated', data: { success } };
  }

  // Cliente solicita veiculos proximos
  @SubscribeMessage('query:nearby')
  async handleNearbyQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      lat: number;
      lon: number;
      radius: number;
      collection?: string;
    }
  ) {
    const result = await this.meridian.nearby(
      data.collection || 'fleet',
      { lat: data.lat, lon: data.lon },
      data.radius
    );

    return { event: 'nearby:result', data: result };
  }

  // Recebe eventos de geofence do Meridian e broadcast para clientes
  @OnEvent('geofence.event')
  handleGeofenceEvent(event: GeofenceEvent) {
    // Broadcast geral
    this.server.to('vehicles:fleet').emit('geofence:event', event);

    // Broadcast especifico da zona (se tiver meta com zoneId)
    if (event.meta?.zoneId) {
      this.server.to(`zone:${event.meta.zoneId}`).emit('zone:event', event);
    }
  }

  @OnEvent('channel.message')
  handleChannelMessage(data: { channel: string; event: GeofenceEvent }) {
    // Extrair zoneId do nome do canal (zone_xxx)
    const match = data.channel.match(/^zone_(.+)$/);
    if (match) {
      const zoneId = match[1];
      this.server.to(`zone:${zoneId}`).emit('zone:event', data.event);
    }
  }
}
```

### App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MeridianModule } from './meridian/meridian.module';
import { FleetModule } from './fleet/fleet.module';

@Module({
  imports: [
    MeridianModule,
    FleetModule,
  ],
})
export class AppModule {}
```

### Fleet Module

```typescript
// src/fleet/fleet.module.ts
import { Module } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { FleetGateway } from './fleet.gateway';

@Module({
  controllers: [FleetController],
  providers: [FleetService, FleetGateway],
  exports: [FleetService],
})
export class FleetModule {}
```

### Cliente Frontend (Exemplo React)

```typescript
// hooks/useFleetWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
}

interface GeofenceEvent {
  detect: 'enter' | 'exit' | 'inside' | 'outside' | 'cross';
  id: string;
  object: {
    type: string;
    coordinates: number[];
  };
  meta?: Record<string, any>;
}

export function useFleetWebSocket(serverUrl: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [vehicles, setVehicles] = useState<Map<string, Vehicle>>(new Map());
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(`${serverUrl}/fleet`);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Inscrever para receber atualizacoes de veiculos
      newSocket.emit('subscribe:vehicles', { collection: 'fleet' });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('vehicle:updated', (vehicle: Vehicle) => {
      setVehicles(prev => new Map(prev).set(vehicle.id, vehicle));
    });

    newSocket.on('geofence:event', (event: GeofenceEvent) => {
      setEvents(prev => [...prev.slice(-99), event]);
    });

    newSocket.on('zone:event', (event: GeofenceEvent) => {
      console.log('Zone event:', event);
      setEvents(prev => [...prev.slice(-99), event]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [serverUrl]);

  const subscribeToZone = useCallback((zoneId: string) => {
    socket?.emit('subscribe:zone', { zoneId });
  }, [socket]);

  const updateLocation = useCallback((vehicle: Vehicle) => {
    socket?.emit('update:location', vehicle);
  }, [socket]);

  const queryNearby = useCallback(async (lat: number, lon: number, radius: number) => {
    return new Promise((resolve) => {
      socket?.emit('query:nearby', { lat, lon, radius }, resolve);
    });
  }, [socket]);

  return {
    isConnected,
    vehicles: Array.from(vehicles.values()),
    events,
    subscribeToZone,
    updateLocation,
    queryNearby,
  };
}

// Exemplo de uso em componente React
function FleetMap() {
  const { isConnected, vehicles, events, subscribeToZone } = useFleetWebSocket('http://localhost:3000');

  useEffect(() => {
    // Inscrever na zona de interesse
    subscribeToZone('warehouse_1');
  }, [subscribeToZone]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>

      <div>
        <h3>Vehicles ({vehicles.length})</h3>
        {vehicles.map(v => (
          <div key={v.id}>
            {v.id}: {v.lat.toFixed(4)}, {v.lon.toFixed(4)} @ {v.speed}km/h
          </div>
        ))}
      </div>

      <div>
        <h3>Recent Events</h3>
        {events.slice(-10).map((e, i) => (
          <div key={i}>
            {e.id} {e.detect} at {new Date().toISOString()}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Swagger/OpenAPI

Esta secao demonstra como configurar Swagger/OpenAPI para documentar a API REST da integracao NestJS com Meridian.

### Instalacao

```bash
npm install @nestjs/swagger swagger-ui-express
npm install -D @types/swagger-ui-express
```

### Configuracao do Swagger

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar validacao global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Fleet Management API')
    .setDescription(`
      API para gerenciamento de frota integrada com AIQIA Meridian.

      ## Recursos

      - **Veiculos**: CRUD e rastreamento em tempo real
      - **Zonas**: Criacao e monitoramento de geofences
      - **Webhooks**: Recebimento de eventos de geofence
      - **WebSocket**: Atualizacoes em tempo real

      ## Integracao com Meridian

      Esta API utiliza o AIQIA Meridian como backend para:
      - Armazenamento de dados geoespaciais
      - Buscas por proximidade (NEARBY)
      - Geofencing em tempo real
      - Pub/Sub para notificacoes
    `)
    .setVersion('1.0')
    .addTag('vehicles', 'Operacoes de veiculos')
    .addTag('zones', 'Operacoes de zonas/geofences')
    .addTag('webhooks', 'Endpoints de webhook')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Desenvolvimento')
    .addServer('https://api.example.com', 'Producao')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Fleet API - Swagger',
  });

  await app.listen(3000);
  console.log('Application running on http://localhost:3000');
  console.log('Swagger docs available at http://localhost:3000/api/docs');
}
bootstrap();
```

### DTOs com Decorators Swagger

```typescript
// src/fleet/dto/point.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class PointDto {
  @ApiProperty({
    description: 'Latitude em graus decimais',
    example: -23.5505,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude em graus decimais',
    example: -46.6333,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;

  @ApiPropertyOptional({
    description: 'Altitude em metros (opcional)',
    example: 760,
  })
  @IsOptional()
  @IsNumber()
  z?: number;
}
```

```typescript
// src/fleet/dto/vehicle.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PointDto } from './point.dto';

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Identificador unico do veiculo',
    example: 'truck_001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Localizacao atual do veiculo',
    type: PointDto,
  })
  @ValidateNested()
  @Type(() => PointDto)
  location: PointDto;

  @ApiPropertyOptional({
    description: 'Velocidade atual em km/h',
    example: 65,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({
    description: 'Direcao em graus (0-360)',
    example: 180,
    minimum: 0,
    maximum: 360,
  })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiPropertyOptional({
    description: 'Nivel de combustivel em porcentagem',
    example: 75.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  fuel?: number;

  @ApiPropertyOptional({
    description: 'Nome do motorista',
    example: 'Joao Silva',
  })
  @IsOptional()
  @IsString()
  driver?: string;

  @ApiPropertyOptional({
    description: 'Status do veiculo',
    enum: VehicleStatus,
    example: VehicleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Identificador do veiculo',
    example: 'truck_001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Nova localizacao do veiculo',
    type: PointDto,
  })
  @ValidateNested()
  @Type(() => PointDto)
  location: PointDto;

  @ApiPropertyOptional({
    description: 'Velocidade atual em km/h',
    example: 72,
  })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({
    description: 'Direcao em graus',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  heading?: number;
}
```

```typescript
// src/fleet/dto/zone.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PointDto } from './point.dto';

export enum ZoneType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  RESTRICTED = 'restricted',
  WAREHOUSE = 'warehouse',
  PARKING = 'parking',
}

export class CreateCircleZoneDto {
  @ApiProperty({
    description: 'Identificador unico da zona',
    example: 'zone_downtown_01',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Nome descritivo da zona',
    example: 'Centro de Distribuicao Norte',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tipo da zona',
    enum: ZoneType,
    example: ZoneType.WAREHOUSE,
  })
  @IsEnum(ZoneType)
  type: ZoneType;

  @ApiProperty({
    description: 'Centro da zona circular',
    type: PointDto,
  })
  @ValidateNested()
  @Type(() => PointDto)
  center: PointDto;

  @ApiProperty({
    description: 'Raio da zona em metros',
    example: 500,
    minimum: 1,
  })
  @IsNumber()
  radius: number;

  @ApiPropertyOptional({
    description: 'Metadados adicionais da zona',
    example: { manager: 'Carlos', capacity: 50 },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreatePolygonZoneDto {
  @ApiProperty({
    description: 'Identificador unico da zona',
    example: 'zone_polygon_01',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Nome descritivo da zona',
    example: 'Area Industrial',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tipo da zona',
    enum: ZoneType,
    example: ZoneType.RESTRICTED,
  })
  @IsEnum(ZoneType)
  type: ZoneType;

  @ApiProperty({
    description: 'Vertices do poligono (primeiro e ultimo ponto devem ser iguais)',
    type: [PointDto],
    example: [
      { lat: -23.55, lon: -46.64 },
      { lat: -23.55, lon: -46.63 },
      { lat: -23.54, lon: -46.63 },
      { lat: -23.54, lon: -46.64 },
      { lat: -23.55, lon: -46.64 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  vertices: PointDto[];
}
```

```typescript
// src/fleet/dto/search.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbySearchDto {
  @ApiProperty({
    description: 'Latitude do ponto central',
    example: -23.5505,
  })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({
    description: 'Longitude do ponto central',
    example: -46.6333,
  })
  @IsNumber()
  @Type(() => Number)
  lon: number;

  @ApiProperty({
    description: 'Raio de busca em metros',
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  radius: number;

  @ApiPropertyOptional({
    description: 'Limite de resultados',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtro por padrao de ID (glob)',
    example: 'truck_*',
  })
  @IsOptional()
  @IsString()
  match?: string;
}

export class WithinBoundsDto {
  @ApiProperty({ description: 'Latitude minima (sul)', example: -23.56 })
  @IsNumber()
  @Type(() => Number)
  minLat: number;

  @ApiProperty({ description: 'Longitude minima (oeste)', example: -46.65 })
  @IsNumber()
  @Type(() => Number)
  minLon: number;

  @ApiProperty({ description: 'Latitude maxima (norte)', example: -23.54 })
  @IsNumber()
  @Type(() => Number)
  maxLat: number;

  @ApiProperty({ description: 'Longitude maxima (leste)', example: -46.62 })
  @IsNumber()
  @Type(() => Number)
  maxLon: number;

  @ApiPropertyOptional({ description: 'Limite de resultados', example: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
```

```typescript
// src/fleet/dto/webhook.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeofenceEventDto {
  @ApiProperty({
    description: 'Comando que disparou o evento',
    enum: ['set', 'del', 'drop'],
    example: 'set',
  })
  command: 'set' | 'del' | 'drop';

  @ApiProperty({
    description: 'Tipo de deteccao',
    enum: ['enter', 'exit', 'inside', 'outside', 'cross'],
    example: 'enter',
  })
  detect: 'enter' | 'exit' | 'inside' | 'outside' | 'cross';

  @ApiProperty({
    description: 'Nome do webhook',
    example: 'zone_warehouse_webhook',
  })
  hook: string;

  @ApiProperty({
    description: 'Colecao do objeto',
    example: 'fleet',
  })
  key: string;

  @ApiProperty({
    description: 'ID do objeto',
    example: 'truck_001',
  })
  id: string;

  @ApiProperty({
    description: 'Timestamp do evento (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  time: string;

  @ApiProperty({
    description: 'Geometria do objeto',
    example: { type: 'Point', coordinates: [-46.6333, -23.5505] },
  })
  object: {
    type: string;
    coordinates: number[];
  };

  @ApiPropertyOptional({
    description: 'Campos do objeto',
    example: { speed: 65, fuel: 80 },
  })
  fields?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Metadados do webhook',
    example: { zoneId: 'zone_01', zoneName: 'Warehouse' },
  })
  meta?: Record<string, any>;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Indica se o webhook foi recebido com sucesso',
    example: true,
  })
  received: boolean;

  @ApiPropertyOptional({
    description: 'Mensagem adicional',
    example: 'Event processed successfully',
  })
  message?: string;
}
```

```typescript
// src/fleet/dto/response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty({ example: 'truck_001' })
  id: string;

  @ApiProperty({
    example: { type: 'Point', coordinates: [-46.6333, -23.5505] },
  })
  object: {
    type: string;
    coordinates: number[];
  };

  @ApiPropertyOptional({
    example: { speed: 65, fuel: 80, heading: 180 },
  })
  fields?: Record<string, number>;
}

export class SearchResultDto {
  @ApiProperty({
    description: 'Cursor para paginacao',
    example: 0,
  })
  cursor: number;

  @ApiProperty({
    description: 'Total de resultados',
    example: 25,
  })
  count: number;

  @ApiProperty({
    description: 'Lista de objetos encontrados',
    type: [VehicleResponseDto],
  })
  objects: VehicleResponseDto[];
}

export class SuccessResponseDto {
  @ApiProperty({
    description: 'Indica sucesso da operacao',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Mensagem adicional',
    example: 'Operation completed successfully',
  })
  message?: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Codigo de status HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detalhes do erro',
    example: ['lat must be between -90 and 90'],
  })
  error?: string | string[];
}
```

### Controller com Decorators Swagger

```typescript
// src/fleet/fleet.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  UpdateLocationDto,
} from './dto/vehicle.dto';
import { CreateCircleZoneDto, CreatePolygonZoneDto } from './dto/zone.dto';
import { NearbySearchDto, WithinBoundsDto } from './dto/search.dto';
import { GeofenceEventDto, WebhookResponseDto } from './dto/webhook.dto';
import {
  VehicleResponseDto,
  SearchResultDto,
  SuccessResponseDto,
  ErrorResponseDto,
} from './dto/response.dto';

@ApiTags('vehicles')
@Controller('api/fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  // ==================== Veiculos ====================

  @Get('vehicles')
  @ApiOperation({
    summary: 'Listar todos os veiculos',
    description: 'Retorna lista paginada de todos os veiculos cadastrados na frota.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de resultados (default: 100)',
    example: 100,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: Number,
    description: 'Cursor para paginacao',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de veiculos retornada com sucesso',
    type: SearchResultDto,
  })
  async getAllVehicles(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: number,
  ): Promise<SearchResultDto> {
    return this.fleetService.getAllVehicles({ limit, cursor });
  }

  @Get('vehicles/nearby')
  @ApiOperation({
    summary: 'Buscar veiculos proximos',
    description: 'Busca veiculos dentro de um raio especificado a partir de um ponto.',
  })
  @ApiResponse({
    status: 200,
    description: 'Veiculos proximos encontrados',
    type: SearchResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parametros invalidos',
    type: ErrorResponseDto,
  })
  async getNearbyVehicles(@Query() query: NearbySearchDto): Promise<SearchResultDto> {
    return this.fleetService.getVehiclesNearby(
      query.lat,
      query.lon,
      query.radius,
      { limit: query.limit, match: query.match },
    );
  }

  @Get('vehicles/within')
  @ApiOperation({
    summary: 'Buscar veiculos dentro de area',
    description: 'Busca veiculos dentro de um retangulo definido por coordenadas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Veiculos dentro da area encontrados',
    type: SearchResultDto,
  })
  async getVehiclesWithinBounds(@Query() query: WithinBoundsDto): Promise<SearchResultDto> {
    return this.fleetService.getVehiclesInBounds(
      { minLat: query.minLat, minLon: query.minLon, maxLat: query.maxLat, maxLon: query.maxLon },
      { limit: query.limit },
    );
  }

  @Get('vehicles/moving')
  @ApiOperation({
    summary: 'Listar veiculos em movimento',
    description: 'Retorna veiculos com velocidade acima do minimo especificado.',
  })
  @ApiQuery({
    name: 'minSpeed',
    required: false,
    type: Number,
    description: 'Velocidade minima em km/h (default: 5)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Veiculos em movimento',
    type: SearchResultDto,
  })
  async getMovingVehicles(@Query('minSpeed') minSpeed?: number): Promise<SearchResultDto> {
    return this.fleetService.getMovingVehicles(minSpeed || 5);
  }

  @Get('vehicles/:id')
  @ApiOperation({
    summary: 'Obter veiculo por ID',
    description: 'Retorna dados completos de um veiculo especifico.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador unico do veiculo',
    example: 'truck_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Veiculo encontrado',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Veiculo nao encontrado',
    type: ErrorResponseDto,
  })
  async getVehicle(@Param('id') id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.fleetService.getVehicle(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  @Post('vehicles')
  @ApiOperation({
    summary: 'Criar novo veiculo',
    description: 'Cadastra um novo veiculo na frota com localizacao inicial.',
  })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({
    status: 201,
    description: 'Veiculo criado com sucesso',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados invalidos',
    type: ErrorResponseDto,
  })
  async createVehicle(@Body() dto: CreateVehicleDto): Promise<SuccessResponseDto> {
    const success = await this.fleetService.createVehicle(dto);
    return { success, message: `Vehicle ${dto.id} created successfully` };
  }

  @Put('vehicles/:id/location')
  @ApiOperation({
    summary: 'Atualizar localizacao do veiculo',
    description: 'Atualiza a posicao geografica e dados de telemetria do veiculo.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador do veiculo',
    example: 'truck_001',
  })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({
    status: 200,
    description: 'Localizacao atualizada com sucesso',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Veiculo nao encontrado',
    type: ErrorResponseDto,
  })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<SuccessResponseDto> {
    const success = await this.fleetService.updateVehicleLocation({
      id,
      lat: dto.location.lat,
      lon: dto.location.lon,
      speed: dto.speed,
      heading: dto.heading,
    });
    return { success };
  }

  @Delete('vehicles/:id')
  @ApiOperation({
    summary: 'Remover veiculo',
    description: 'Remove um veiculo da frota.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador do veiculo',
    example: 'truck_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Veiculo removido com sucesso',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Veiculo nao encontrado',
    type: ErrorResponseDto,
  })
  async removeVehicle(@Param('id') id: string): Promise<SuccessResponseDto> {
    const success = await this.fleetService.removeVehicle(id);
    if (!success) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return { success, message: `Vehicle ${id} removed successfully` };
  }

  // ==================== Zonas ====================

  @ApiTags('zones')
  @Post('zones/circle')
  @ApiOperation({
    summary: 'Criar zona circular',
    description: 'Cria uma nova zona de geofence circular e inicia monitoramento.',
  })
  @ApiBody({ type: CreateCircleZoneDto })
  @ApiResponse({
    status: 201,
    description: 'Zona criada e monitoramento iniciado',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados invalidos',
    type: ErrorResponseDto,
  })
  async createCircleZone(@Body() dto: CreateCircleZoneDto): Promise<SuccessResponseDto> {
    await this.fleetService.createZone({
      id: dto.id,
      name: dto.name,
      type: dto.type,
      lat: dto.center.lat,
      lon: dto.center.lon,
      radius: dto.radius,
    });
    await this.fleetService.setupZoneMonitoring({
      id: dto.id,
      name: dto.name,
      type: dto.type,
      lat: dto.center.lat,
      lon: dto.center.lon,
      radius: dto.radius,
    });
    return {
      success: true,
      message: `Zone ${dto.name} created and monitoring started`,
    };
  }

  @ApiTags('zones')
  @Post('zones/polygon')
  @ApiOperation({
    summary: 'Criar zona poligonal',
    description: 'Cria uma nova zona de geofence com formato poligonal.',
  })
  @ApiBody({ type: CreatePolygonZoneDto })
  @ApiResponse({
    status: 201,
    description: 'Zona poligonal criada',
    type: SuccessResponseDto,
  })
  async createPolygonZone(@Body() dto: CreatePolygonZoneDto): Promise<SuccessResponseDto> {
    const geoJSON = {
      type: 'Polygon',
      coordinates: [dto.vertices.map(v => [v.lon, v.lat])],
    };
    await this.fleetService.createPolygonZone(dto.id, dto.name, dto.type, geoJSON);
    return {
      success: true,
      message: `Polygon zone ${dto.name} created`,
    };
  }

  @ApiTags('zones')
  @Get('zones')
  @ApiOperation({
    summary: 'Listar todas as zonas',
    description: 'Retorna lista de todas as zonas de geofence cadastradas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de zonas',
    type: SearchResultDto,
  })
  async getAllZones(): Promise<SearchResultDto> {
    return this.fleetService.getAllZones();
  }

  @ApiTags('zones')
  @Delete('zones/:id')
  @ApiOperation({
    summary: 'Remover zona',
    description: 'Remove uma zona de geofence e para o monitoramento.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador da zona',
    example: 'zone_downtown_01',
  })
  @ApiResponse({
    status: 200,
    description: 'Zona removida com sucesso',
    type: SuccessResponseDto,
  })
  async removeZone(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.fleetService.removeZone(id);
    return { success: true, message: `Zone ${id} removed` };
  }

  // ==================== Webhooks ====================

  @ApiTags('webhooks')
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receber evento de geofence',
    description: `
      Endpoint para receber notificacoes de eventos de geofence do Meridian.

      ## Tipos de Eventos

      - **enter**: Veiculo entrou na zona
      - **exit**: Veiculo saiu da zona
      - **inside**: Veiculo esta dentro da zona
      - **outside**: Veiculo esta fora da zona
      - **cross**: Veiculo cruzou a borda da zona

      ## Configuracao no Meridian

      \`\`\`bash
      SETHOOK zone_webhook http://localhost:3000/api/fleet/webhook \\
        META {"zoneId":"zone_01","zoneName":"Warehouse"} \\
        NEARBY fleet FENCE DETECT enter,exit \\
        POINT -23.5505 -46.6333 500
      \`\`\`
    `,
  })
  @ApiBody({ type: GeofenceEventDto })
  @ApiResponse({
    status: 200,
    description: 'Evento recebido e processado',
    type: WebhookResponseDto,
  })
  async handleWebhook(@Body() payload: GeofenceEventDto): Promise<WebhookResponseDto> {
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Processar evento
    const { detect, id, meta } = payload;

    if (meta?.zoneType === 'restricted' && detect === 'enter') {
      console.warn(`SECURITY ALERT: Vehicle ${id} entered restricted zone ${meta.zoneName}`);
      // Implementar logica de alerta
    }

    return { received: true, message: 'Event processed successfully' };
  }

  // ==================== Estatisticas ====================

  @Get('stats')
  @ApiOperation({
    summary: 'Obter estatisticas da frota',
    description: 'Retorna estatisticas agregadas da frota.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatisticas da frota',
    schema: {
      type: 'object',
      properties: {
        totalVehicles: { type: 'number', example: 150 },
        activeVehicles: { type: 'number', example: 120 },
        movingVehicles: { type: 'number', example: 85 },
        totalZones: { type: 'number', example: 25 },
        averageSpeed: { type: 'number', example: 45.5 },
        averageFuel: { type: 'number', example: 68.2 },
      },
    },
  })
  async getStats() {
    return this.fleetService.getFleetStats();
  }
}
```

### Schemas Customizados para Respostas Complexas

```typescript
// src/fleet/schemas/geojson.schema.ts
import { ApiProperty } from '@nestjs/swagger';

export class GeoJSONPointSchema {
  @ApiProperty({ example: 'Point' })
  type: string;

  @ApiProperty({
    description: 'Coordenadas [longitude, latitude]',
    example: [-46.6333, -23.5505],
    type: [Number],
  })
  coordinates: number[];
}

export class GeoJSONPolygonSchema {
  @ApiProperty({ example: 'Polygon' })
  type: string;

  @ApiProperty({
    description: 'Array de aneis de coordenadas',
    example: [[[-46.65, -23.55], [-46.65, -23.54], [-46.64, -23.54], [-46.64, -23.55], [-46.65, -23.55]]],
  })
  coordinates: number[][][];
}
```

### Documentacao de WebSocket no Swagger

```typescript
// src/fleet/dto/websocket.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Documentacao dos eventos WebSocket
 *
 * Conexao: ws://localhost:3000/fleet
 *
 * Eventos Cliente -> Servidor:
 * - subscribe:vehicles - Inscrever para atualizacoes de veiculos
 * - subscribe:zone - Inscrever para eventos de zona especifica
 * - update:location - Enviar atualizacao de localizacao
 * - query:nearby - Consultar veiculos proximos
 *
 * Eventos Servidor -> Cliente:
 * - vehicle:updated - Veiculo teve posicao atualizada
 * - geofence:event - Evento de geofence ocorreu
 * - zone:event - Evento especifico de zona
 */

export class WsSubscribeVehiclesDto {
  @ApiProperty({
    description: 'Nome do evento',
    example: 'subscribe:vehicles',
  })
  event: string;

  @ApiProperty({
    description: 'Colecao para monitorar',
    example: { collection: 'fleet' },
  })
  data: {
    collection?: string;
  };
}

export class WsSubscribeZoneDto {
  @ApiProperty({
    description: 'Nome do evento',
    example: 'subscribe:zone',
  })
  event: string;

  @ApiProperty({
    description: 'ID da zona',
    example: { zoneId: 'zone_01' },
  })
  data: {
    zoneId: string;
  };
}

export class WsUpdateLocationDto {
  @ApiProperty({
    description: 'Nome do evento',
    example: 'update:location',
  })
  event: string;

  @ApiProperty({
    example: {
      id: 'truck_001',
      lat: -23.5505,
      lon: -46.6333,
      speed: 65,
      heading: 180,
    },
  })
  data: {
    id: string;
    lat: number;
    lon: number;
    speed?: number;
    heading?: number;
  };
}

export class WsVehicleUpdatedDto {
  @ApiProperty({
    description: 'Nome do evento',
    example: 'vehicle:updated',
  })
  event: string;

  @ApiProperty({
    example: {
      id: 'truck_001',
      lat: -23.5505,
      lon: -46.6333,
      speed: 65,
      heading: 180,
      timestamp: '2024-01-15T10:30:00.000Z',
    },
  })
  data: {
    id: string;
    lat: number;
    lon: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  };
}
```

### Adicionar Pagina de WebSocket no Swagger

```typescript
// src/main.ts (adicionar ao SwaggerModule.setup)
const document = SwaggerModule.createDocument(app, config);

// Adicionar documentacao customizada para WebSocket
document.paths['/ws/fleet'] = {
  get: {
    tags: ['websocket'],
    summary: 'WebSocket Connection',
    description: `
## Conexao WebSocket

**URL**: \`ws://localhost:3000/fleet\`

### Eventos Cliente -> Servidor

| Evento | Descricao | Payload |
|--------|-----------|---------|
| \`subscribe:vehicles\` | Inscrever para atualizacoes | \`{ collection: "fleet" }\` |
| \`subscribe:zone\` | Inscrever em zona especifica | \`{ zoneId: "zone_01" }\` |
| \`update:location\` | Enviar nova localizacao | \`{ id, lat, lon, speed?, heading? }\` |
| \`query:nearby\` | Consultar veiculos proximos | \`{ lat, lon, radius }\` |

### Eventos Servidor -> Cliente

| Evento | Descricao | Payload |
|--------|-----------|---------|
| \`vehicle:updated\` | Veiculo atualizado | \`{ id, lat, lon, speed, heading, timestamp }\` |
| \`geofence:event\` | Evento de geofence | \`{ detect, id, object, fields, meta }\` |
| \`zone:event\` | Evento de zona especifica | \`{ detect, id, object, meta }\` |

### Exemplo JavaScript

\`\`\`javascript
const socket = io('http://localhost:3000/fleet');

// Inscrever para atualizacoes
socket.emit('subscribe:vehicles', { collection: 'fleet' });

// Receber atualizacoes
socket.on('vehicle:updated', (data) => {
  console.log('Vehicle updated:', data);
});

// Receber eventos de geofence
socket.on('geofence:event', (event) => {
  console.log('Geofence event:', event);
});
\`\`\`
    `,
    responses: {
      '101': {
        description: 'Switching Protocols - WebSocket connection established',
      },
    },
  },
};

SwaggerModule.setup('api/docs', app, document);
```

### Exportar Especificacao OpenAPI

```typescript
// scripts/generate-openapi.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Fleet Management API')
    .setDescription('API para gerenciamento de frota integrada com AIQIA Meridian')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Salvar como JSON
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  // Salvar como YAML
  const yaml = require('yaml');
  fs.writeFileSync('./openapi.yaml', yaml.stringify(document));

  console.log('OpenAPI specification generated: openapi.json, openapi.yaml');

  await app.close();
}

generateOpenApiSpec();
```

### Executar Geracao

```bash
# Adicionar ao package.json
{
  "scripts": {
    "generate:openapi": "ts-node scripts/generate-openapi.ts"
  }
}

# Executar
npm run generate:openapi
```

### Resultado

Apos configurar, acesse:
- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json
- **OpenAPI YAML**: http://localhost:3000/api/docs-yaml

A interface Swagger permitira:
- Visualizar todos os endpoints documentados
- Testar requisicoes diretamente no navegador
- Ver schemas de request/response
- Exportar especificacao para geracao de clientes

---

## Lua Scripting

O Meridian suporta scripts Lua 5.1 para logica customizada no servidor.

### Comandos de Script

```bash
# Executar script inline
EVAL script numkeys key [key ...] arg [arg ...]

# Executar script por SHA1
EVALSHA sha1 numkeys key [key ...] arg [arg ...]

# Carregar script (retorna SHA1)
SCRIPT LOAD script

# Verificar se script existe
SCRIPT EXISTS sha1 [sha1 ...]

# Limpar cache de scripts
SCRIPT FLUSH
```

### Exemplos de Scripts

```bash
# Script para verificar se veiculo esta em movimento
EVAL "local obj = meridian.call('GET', KEYS[1], ARGV[1], 'WITHFIELDS'); if obj and obj.fields and obj.fields.speed > 5 then return 1 else return 0 end" 1 fleet truck1

# Script para mover veiculo e verificar zona
SCRIPT LOAD "meridian.call('SET', KEYS[1], ARGV[1], 'FIELD', 'speed', ARGV[4], 'POINT', ARGV[2], ARGV[3]); local nearby = meridian.call('NEARBY', 'zones', 'POINT', ARGV[2], ARGV[3], '100', 'IDS'); return nearby"

# Usar script carregado
EVALSHA abc123... 1 fleet truck1 33.5 -112.2 90
```

### API Lua Disponivel

```lua
-- Executar comandos Meridian
meridian.call('SET', 'fleet', 'truck1', 'POINT', '33.5', '-112.2')
meridian.call('GET', 'fleet', 'truck1')
meridian.call('NEARBY', 'fleet', 'POINT', '33.5', '-112.2', '5000')

-- Funcoes de JSON
local json = require('json')
local obj = json.decode('{"name":"test"}')
local str = json.encode({name = "test"})

-- Acesso a campos
local value = obj.fields.speed
```

---

## Replicacao

O Meridian suporta replicacao Leader/Follower para alta disponibilidade.

### Configurar Follower

```bash
# No servidor follower
FOLLOW leader_host leader_port

# Ou via linha de comando
./meridian-server --follow leader_host:leader_port

# Verificar papel do servidor
ROLE

# Resposta do leader
master
# Resposta do follower
slave
leader_host
leader_port
```

### Autenticacao de Replicacao

```bash
# No leader - definir senha para followers
CONFIG SET leaderauth "replica_password"

# No follower - definir senha do leader
CONFIG SET requirepass "replica_password"
FOLLOW leader_host leader_port
```

### Modo Somente Leitura

```bash
# No follower - forcar modo somente leitura
READONLY yes

# Verificar status
READONLY
```

### Monitorar Replicacao

```bash
# Verificar status de replicacao
INFO replication

# Verificar checksum do AOF
AOFMD5 0 -1
```

---

## Metricas e Monitoramento

### Prometheus

```bash
# Iniciar com metricas habilitadas
./meridian-server --metrics-addr=0.0.0.0:4321

# Acessar metricas
curl http://localhost:4321/metrics
```

### Metricas Disponiveis

| Metrica | Tipo | Descricao |
|---------|------|-----------|
| `meridian_collections_total` | Gauge | Numero de colecoes |
| `meridian_objects_total` | Gauge | Numero total de objetos |
| `meridian_points_total` | Gauge | Numero total de pontos |
| `meridian_memory_heap_bytes` | Gauge | Memoria heap usada |
| `meridian_memory_used_bytes` | Gauge | Memoria total usada |
| `meridian_aof_size_bytes` | Gauge | Tamanho do arquivo AOF |
| `meridian_hooks_total` | Gauge | Numero de webhooks ativos |
| `meridian_connected_clients` | Gauge | Clientes conectados |
| `meridian_connections_total` | Counter | Total de conexoes recebidas |
| `meridian_messages_sent_total` | Counter | Total de mensagens enviadas |
| `meridian_expired_keys_total` | Counter | Chaves expiradas |

### Comandos de Monitoramento

```bash
# Informacoes completas do servidor
INFO

# Estatisticas por colecao
STATS

# Verificacao de saude
HEALTHZ

# Monitorar comandos em tempo real
MONITOR

# Listar clientes conectados
CLIENT LIST
```

### Exemplo Prometheus + Grafana

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'meridian'
    static_configs:
      - targets: ['localhost:4321']
    scrape_interval: 15s
```

---

## Admin Panel

O Meridian inclui um painel administrativo web integrado para gerenciamento visual do banco de dados geoespacial. O admin panel e servido diretamente pelo servidor Meridian em `/admin/`.

### Configuracao

Configure o admin panel usando variaveis de ambiente ou flags de linha de comando:

```bash
# Variaveis de ambiente (.env)
MERIDIAN_ADMIN_USER=admin
MERIDIAN_ADMIN_PASSWORD=sua_senha_segura
MERIDIAN_ADMIN_JWT_SECRET=  # Opcional: gerado automaticamente se vazio

# Ou via linha de comando
./meridian-server --admin-user=admin --admin-password=sua_senha_segura
```

### Funcionalidades

| Funcionalidade | Descricao |
|----------------|-----------|
| **Dashboard** | Metricas em tempo real (colecoes, objetos, memoria, pontos) |
| **Mapa Interativo** | Visualizacao de objetos geoespaciais com OpenLayers |
| **Colecoes** | Listagem e gerenciamento de colecoes |
| **CRUD de Objetos** | Criar, visualizar e deletar objetos |
| **Autenticacao** | Login seguro com JWT |

### Acessando o Admin Panel

```bash
# Iniciar servidor com admin habilitado
MERIDIAN_ADMIN_USER=admin MERIDIAN_ADMIN_PASSWORD=minhasenha ./meridian-server

# Acessar no navegador
http://localhost:9851/admin/
```

### API de Autenticacao

O admin panel utiliza JWT para autenticacao:

```bash
# Login - retorna token JWT
curl -X POST http://localhost:9851/admin/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"minhasenha"}'

# Resposta
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": 1234567890,
  "username": "admin"
}

# Verificar token
curl http://localhost:9851/admin/api/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Resposta
{
  "ok": true,
  "username": "admin"
}
```

### Arquitetura do Admin Panel

```
+------------------+     +------------------+
|   Navegador      |     |   Meridian       |
|   (React/Next.js)|---->|   Server         |
+------------------+     +------------------+
        |                        |
        | GET /admin/            | Serve arquivos estaticos
        | POST /admin/api/login  | Autenticacao JWT
        | GET /admin/api/verify  | Validacao de token
        |                        |
        | GET /SERVER            | Metricas do servidor
        | GET /KEYS *            | Lista colecoes
        | GET /SCAN key          | Lista objetos
        +------------------------+
```

### Build do Admin Panel (Desenvolvimento)

Para modificar o admin panel:

```bash
# Entrar no diretorio do admin panel
cd admin-panel

# Instalar dependencias
npm install

# Desenvolvimento local
npm run dev

# Build para producao
npm run build

# Copiar para o servidor (script automatico)
../scripts/build-admin.sh
```

### Tecnologias Utilizadas

- **Frontend**: Next.js 14 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Mapas**: OpenLayers
- **Graficos**: Recharts
- **Autenticacao**: JWT (HS256)

---

## Exemplos Praticos

### 1. Sistema de Rastreamento de Frota

```bash
# Criar colecao de veiculos
SET fleet truck1 FIELD speed 65 FIELD fuel 80 POINT 33.5123 -112.2693
SET fleet truck2 FIELD speed 72 FIELD fuel 45 POINT 33.4626 -112.1695

# Buscar veiculos proximos a um ponto
NEARBY fleet POINT 33.5 -112.2 5000

# Buscar veiculos em movimento (speed > 0)
SCAN fleet WHERE speed > 0

# Veiculos com combustivel baixo
SCAN fleet WHERE fuel < 25

# Criar zona de entrega
SET zones delivery_zone1 OBJECT {
  "type": "Polygon",
  "coordinates": [[
    [-112.1, 33.4],
    [-112.1, 33.5],
    [-112.0, 33.5],
    [-112.0, 33.4],
    [-112.1, 33.4]
  ]]
}

# Monitorar veiculos entrando na zona
SETHOOK delivery_alert http://myserver/webhook WITHIN fleet FENCE OBJECT {"type":"Polygon","coordinates":[[[-112.1,33.4],[-112.1,33.5],[-112.0,33.5],[-112.0,33.4],[-112.1,33.4]]]}
```

### 2. Sistema de Delivery

```bash
# Entregadores ativos
SET couriers courier_1 FIELD status 1 FIELD orders 3 POINT -23.5505 -46.6333
SET couriers courier_2 FIELD status 1 FIELD orders 1 POINT -23.5489 -46.6388

# Restaurantes
SET restaurants rest_1 OBJECT {"type":"Point","coordinates":[-46.6350,-23.5510]}
SET restaurants rest_2 OBJECT {"type":"Point","coordinates":[-46.6400,-23.5480]}

# Encontrar entregadores disponiveis proximos a restaurante
NEARBY couriers WHERE status = 1 POINT -23.5510 -46.6350 2000

# Monitorar quando entregador chega no restaurante
SETCHAN pickup_rest_1 NEARBY couriers FENCE DETECT enter POINT -23.5510 -46.6350 50

# Monitorar quando entregador chega no cliente
SETCHAN delivery_customer NEARBY couriers FENCE DETECT enter POINT -23.5600 -46.6280 30
```

### 3. Sistema de Alertas de Proximidade

```bash
# Usuarios do app
SET users user_1 POINT -23.5505 -46.6333
SET users user_2 POINT -23.5520 -46.6340

# Pontos de interesse
SET pois coffee_shop_1 FIELD category 1 POINT -23.5510 -46.6330
SET pois restaurant_1 FIELD category 2 POINT -23.5515 -46.6345

# Alertar quando usuario se aproximar de POI (roaming)
SETCHAN nearby_pois NEARBY users FENCE ROAM pois * 100

# Webhook para notificacao push
SETHOOK poi_notification http://push-server/notify NEARBY users FENCE ROAM pois * 50
```

### 4. Controle de Acesso por Zona

```bash
# Definir zonas restritas
SET restricted_zones zone_a OBJECT {
  "type": "Polygon",
  "coordinates": [[
    [-46.65, -23.55],
    [-46.65, -23.54],
    [-46.64, -23.54],
    [-46.64, -23.55],
    [-46.65, -23.55]
  ]]
}

# Funcionarios
SET employees emp_001 FIELD clearance 1 POINT -23.5480 -46.6420
SET employees emp_002 FIELD clearance 2 POINT -23.5490 -46.6430

# Alertar quando funcionario sem permissao entrar em zona restrita
SETHOOK security_alert http://security/alert WITHIN employees FENCE WHERE clearance < 2 OBJECT {"type":"Polygon","coordinates":[[[-46.65,-23.55],[-46.65,-23.54],[-46.64,-23.54],[-46.64,-23.55],[-46.65,-23.55]]]}
```

### 5. Monitoramento de Ativos

```bash
# Ativos com metadados JSON
SET assets laptop_001 POINT -23.5505 -46.6333
JSET assets laptop_001 info.model "MacBook Pro"
JSET assets laptop_001 info.serial "ABC123"
JSET assets laptop_001 info.assigned_to "John"

# Consultar informacoes
JGET assets laptop_001 info.assigned_to

# Definir perimetro do escritorio
SET perimeters office OBJECT {
  "type": "Polygon",
  "coordinates": [[
    [-46.634, -23.550],
    [-46.634, -23.549],
    [-46.632, -23.549],
    [-46.632, -23.550],
    [-46.634, -23.550]
  ]]
}

# Alertar quando ativo sair do perimetro
SETHOOK asset_left http://alerts/asset-left WITHIN assets FENCE DETECT exit OBJECT {"type":"Polygon","coordinates":[[[-46.634,-23.550],[-46.634,-23.549],[-46.632,-23.549],[-46.632,-23.550],[-46.634,-23.550]]]}
```

---

## Referencia de API

### Resumo de Comandos

| Categoria | Comandos |
|-----------|----------|
| **Dados** | SET, GET, DEL, PDEL, DROP, RENAME, RENAMENX, EXISTS, KEYS, TYPE |
| **Campos** | FSET, FGET, FEXISTS |
| **JSON** | JSET, JGET, JDEL |
| **Busca** | SCAN, NEARBY, WITHIN, INTERSECTS, BOUNDS |
| **Expiracao** | EXPIRE, PERSIST, TTL |
| **Geofence** | SETHOOK, DELHOOK, PDELHOOK, HOOKS |
| **Pub/Sub** | SETCHAN, DELCHAN, PDELCHAN, CHANS, SUBSCRIBE, PSUBSCRIBE, PUBLISH |
| **Servidor** | INFO, STATS, HEALTHZ, CONFIG, CLIENT, AOF, AOFSHRINK |
| **Scripting** | EVAL, EVALSHA, SCRIPT LOAD/EXISTS/FLUSH |
| **Replicacao** | FOLLOW, ROLE, READONLY |
| **Outros** | PING, ECHO, QUIT, OUTPUT, MONITOR, FLUSHDB, SHUTDOWN |

### Formatos de Saida

| Formato | Comando | Descricao |
|---------|---------|-----------|
| OBJECTS | `SCAN key OBJECTS` | Objetos GeoJSON completos |
| POINTS | `SCAN key POINTS` | Apenas coordenadas |
| IDS | `SCAN key IDS` | Apenas IDs |
| COUNT | `SCAN key COUNT` | Apenas contagem |
| BOUNDS | `SCAN key BOUNDS` | Retangulo envolvente |
| HASHES precision | `SCAN key HASHES 7` | Geohashes |
| QUADKEYS | `SCAN key QUADKEYS` | QuadKeys |
| TILES | `SCAN key TILES` | XYZ Tiles |

### Opcoes de Filtragem

| Opcao | Exemplo | Descricao |
|-------|---------|-----------|
| WHERE | `WHERE speed > 50` | Filtrar por campo |
| MATCH | `MATCH truck*` | Filtrar por padrao de ID |
| CURSOR | `CURSOR 100` | Paginacao |
| LIMIT | `LIMIT 50` | Limite de resultados |
| NOFIELDS | `NOFIELDS` | Excluir campos |
| ASC/DESC | `ASC` ou `DESC` | Ordenacao |

### Tipos de Deteccao

| Tipo | Evento |
|------|--------|
| enter | Objeto entrou na area |
| exit | Objeto saiu da area |
| inside | Objeto esta dentro da area |
| outside | Objeto esta fora da area |
| cross | Objeto cruzou a borda |

### Protocolos de Webhook

| Protocolo | URL Format |
|-----------|------------|
| HTTP | `http://host:port/path` |
| HTTPS | `https://host:port/path` |
| Kafka | `kafka://host:port/topic` |
| RabbitMQ | `amqp://user:pass@host:port/queue` |
| NATS | `nats://host:port/subject` |
| Redis | `redis://host:port/channel` |
| MQTT | `mqtt://host:port/topic` |
| SQS | `sqs://region/queue` |
| GCP Pub/Sub | `gcppubsub://project/topic` |
| Azure | `eventgrid://namespace/hub` |
| gRPC | `grpc://host:port` |

---

## Apendice

### Codigos de Erro Comuns

| Erro | Descricao |
|------|-----------|
| ERR key not found | Colecao ou objeto nao existe |
| ERR invalid argument | Argumento invalido |
| ERR authentication required | Autenticacao necessaria |
| ERR command not allowed in readonly mode | Comando nao permitido em modo somente leitura |

### Limites

- Campos por objeto: ilimitado
- Tamanho maximo de GeoJSON: depende da memoria
- Conexoes simultaneas: ilimitado (depende do SO)
- Estados Lua simultaneos: 5-1000 (configuravel)

### Performance Tips

1. Use `NOFIELDS` quando nao precisar dos campos
2. Use `LIMIT` para paginar resultados grandes
3. Use `IDS` ou `COUNT` quando nao precisar da geometria
4. Prefira `WITHIN` sobre `INTERSECTS` quando possivel
5. Use indices de campos (`WHERE`) com moderacao
6. Considere `--spinlock` para workloads de escrita pesada

---

*Documentacao gerada para AIQIA Meridian v1.37.0*
