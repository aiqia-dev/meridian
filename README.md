# AIQIA Meridian

Meridian is an in-memory geolocation data store, spatial index, and realtime geofencing server.
It supports a variety of object types including lat/lon points, bounding boxes, XYZ tiles, Geohashes, and GeoJSON.

## Features

- Spatial index with search methods such as Nearby, Within, and Intersects.
- Realtime geofencing through webhooks or pub/sub channels.
- Object types of lat/lon, bbox, Geohash, GeoJSON, QuadKey, and XYZ tile.
- Variety of protocols, including HTTP (curl), websockets, telnet, and the Redis RESP.
- Server responses are RESP or JSON.
- Full command line interface.
- Leader / follower replication.
- In-memory database that persists on disk.

## Components

- `meridian-server`: The server
- `meridian-cli`: Command line interface tool
- `meridian-benchmark`: Server benchmark tool

## Getting Started

### Building Meridian

Meridian can be compiled and used on Linux, OSX, Windows, FreeBSD, and probably others since the codebase is 100% Go. We support both 32 bit and 64 bit systems. [Go](https://golang.org/dl/) must be installed on the build machine.

To build everything simply:
```
$ make
```

To test:
```
$ make test
```

### Running

For command line options invoke:
```
$ ./meridian-server -h
```

To run a single server:

```
$ ./meridian-server

# The meridian shell connects to localhost:9851
$ ./meridian-cli
> help
```

#### Prometheus Metrics

Meridian can natively export Prometheus metrics by setting the `--metrics-addr` command line flag (disabled by default). This example exposes the HTTP metrics server on port 4321:
```
# start server and enable Prometheus metrics, listen on local interface only
./meridian-server --metrics-addr=127.0.0.1:4321

# access metrics
curl http://127.0.0.1:4321/metrics
```

## Playing with Meridian

Basic operations:
```
$ ./meridian-cli

# add a couple of points named 'truck1' and 'truck2' to a collection named 'fleet'.
> set fleet truck1 point 33.5123 -112.2693   # on the Loop 101 in Phoenix
> set fleet truck2 point 33.4626 -112.1695   # on the I-10 in Phoenix

# search the 'fleet' collection.
> scan fleet                                 # returns both trucks in 'fleet'
> nearby fleet point 33.462 -112.268 6000    # search 6 kilometers around a point. returns one truck.

# key value operations
> get fleet truck1                           # returns 'truck1'
> del fleet truck2                           # deletes 'truck2'
> drop fleet                                 # removes all
```

## Fields

Fields are extra data that belongs to an object. A field is always a double precision floating point. There is no limit to the number of fields that an object can have.

To set a field when setting an object:
```
> set fleet truck1 field speed 90 point 33.5123 -112.2693
> set fleet truck1 field speed 90 field age 21 point 33.5123 -112.2693
```

To set a field when an object already exists:
```
> fset fleet truck1 speed 90
```

To get a field when an object already exists:
```
> fget fleet truck1 speed
```

## Searching

Meridian has support to search for objects and points that are within or intersects other objects. All object types can be searched including Polygons, MultiPolygons, GeometryCollections, etc.

#### Within
WITHIN searches a collection for objects that are fully contained inside a specified bounding area.

#### Intersects
INTERSECTS searches a collection for objects that intersect a specified bounding area.

#### Nearby
NEARBY searches a collection for objects that intersect a specified radius.

### Search options

**WHERE** - This option allows for filtering out results based on field values.

**MATCH** - MATCH is similar to WHERE except that it works on the object id instead of fields.

**CURSOR** - CURSOR is used to iterate though many objects from the search results.

**NOFIELDS** - NOFIELDS tells the server that you do not want field values returned with the search results.

**LIMIT** - LIMIT can be used to limit the number of objects returned for a single search request.


## Geofencing

A geofence is a virtual boundary that can detect when an object enters or exits the area. This boundary can be a radius, bounding box, or a polygon. Meridian can turn any standard search into a geofence monitor by adding the FENCE keyword to the search.

A simple example:
```
> nearby fleet fence point 33.462 -112.268 6000
```
This command opens a geofence that monitors the 'fleet' collection. The server will respond with:
```
{"ok":true,"live":true}
```
And the connection will be kept open. If any object enters or exits the 6 km radius around `33.462,-112.268` the server will respond in realtime with a message such as:

```
{"command":"set","detect":"enter","id":"truck02","object":{"type":"Point","coordinates":[-112.2695,33.4626]}}
```

### Pub/sub channels

Meridian supports delivering geofence notifications over pub/sub channels.

To create a static geofence that sends notifications when a bus is within 200 meters of a point and sends to the `busstop` channel:

```
> setchan busstop nearby buses fence point 33.5123 -112.2693 200
```

Subscribe on the `busstop` channel:

```
> subscribe busstop
```

## Object types

All object types except for XYZ Tiles and QuadKeys can be stored in a collection. XYZ Tiles and QuadKeys are reserved for the SEARCH keyword only.

#### Lat/lon point
The most basic object type is a point that is composed of a latitude and a longitude. There is an optional `z` member that may be used for auxiliary data such as elevation or a timestamp.
```
set fleet truck1 point 33.5123 -112.2693     # plain lat/lon
set fleet truck1 point 33.5123 -112.2693 225 # lat/lon with z member
```

#### Bounding box
A bounding box consists of two points. The first being the southwestern most point and the second is the northeastern most point.
```
set fleet truck1 bounds 30 -110 40 -100
```

#### Geohash
A geohash is a string representation of a point. With the length of the string indicating the precision of the point.
```
set fleet truck1 hash 9tbnthxzr # this would be equivalent to 'point 33.5123 -112.2693'
```

#### GeoJSON
GeoJSON is an industry standard format for representing a variety of object types including a point, multipoint, linestring, multilinestring, polygon, multipolygon, geometrycollection, feature, and featurecollection.

**Important to note that all coordinates are in Longitude, Latitude order.**

```
set city tempe object {"type":"Polygon","coordinates":[[[0,0],[10,10],[10,0],[0,0]]]}
```

#### XYZ Tile
An XYZ tile is rectangle bounding area on earth that is represented by an X, Y coordinate and a Z (zoom) level.

#### QuadKey
A QuadKey used the same coordinate system as an XYZ tile except that the string representation is a string characters composed of 0, 1, 2, or 3.

## Network protocols

#### HTTP
One of the simplest ways to call a meridian command is to use HTTP. From the command line you can use curl. For example:

```
# call with request in the body
curl --data "set fleet truck3 point 33.4762 -112.10923" localhost:9851

# call with request in the url path
curl localhost:9851/set+fleet+truck3+point+33.4762+-112.10923
```

#### Websockets
Websockets can be used when you need to Geofence and keep the connection alive.

#### Telnet
There is the option to use a plain telnet connection. The default output through telnet is RESP.

```
telnet localhost 9851
set fleet truck3 point 33.4762 -112.10923
+OK

```

The server will respond in JSON or RESP depending on which protocol is used when initiating the first command.

- HTTP and Websockets use JSON.
- Telnet and RESP clients use RESP.

## Environment Variables

The following environment variables can be used to configure the CLI:

- `MERIDIAN_HOSTNAME` - Server hostname (default: 127.0.0.1)
- `MERIDIAN_PORT` - Server port (default: 9851)
- `MERIDIAN_OUTPUT` - Output format: json or resp (default: json)
- `MERIDIAN_PASSWORD` - Password for authentication

## License

Meridian source code is available under the MIT License.
