package server

import (
	"fmt"
	"net/http"

	"github.com/aiqia-dev/meridian/core"
	"github.com/aiqia-dev/meridian/internal/collection"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	metricDescriptions = map[string]*prometheus.Desc{
		/*
			these metrics are taken from basicStats() / extStats()
			by accessing the map and directly exporting the value found
		*/
		"num_collections":          prometheus.NewDesc("meridian_collections", "Total number of collections", nil, nil),
		"pid":                      prometheus.NewDesc("meridian_pid", "", nil, nil),
		"aof_size":                 prometheus.NewDesc("meridian_aof_size_bytes", "", nil, nil),
		"num_hooks":                prometheus.NewDesc("meridian_hooks", "", nil, nil),
		"in_memory_size":           prometheus.NewDesc("meridian_in_memory_size_bytes", "", nil, nil),
		"heap_size":                prometheus.NewDesc("meridian_heap_size_bytes", "", nil, nil),
		"heap_released":            prometheus.NewDesc("meridian_memory_reap_released_bytes", "", nil, nil),
		"max_heap_size":            prometheus.NewDesc("meridian_memory_max_heap_size_bytes", "", nil, nil),
		"avg_item_size":            prometheus.NewDesc("meridian_avg_item_size_bytes", "", nil, nil),
		"pointer_size":             prometheus.NewDesc("meridian_pointer_size_bytes", "", nil, nil),
		"cpus":                     prometheus.NewDesc("meridian_num_cpus", "", nil, nil),
		"meridian_connected_clients": prometheus.NewDesc("meridian_connected_clients", "", nil, nil),

		"meridian_total_connections_received": prometheus.NewDesc("meridian_connections_received_total", "", nil, nil),
		"meridian_total_messages_sent":        prometheus.NewDesc("meridian_messages_sent_total", "", nil, nil),
		"meridian_expired_keys":               prometheus.NewDesc("meridian_expired_keys_total", "", nil, nil),

		/*
			these metrics are NOT taken from basicStats() / extStats()
			but are calculated independently
		*/
		"collection_objects": prometheus.NewDesc("meridian_collection_objects", "Total number of objects per collection", []string{"col"}, nil),
		"collection_points":  prometheus.NewDesc("meridian_collection_points", "Total number of points per collection", []string{"col"}, nil),
		"collection_strings": prometheus.NewDesc("meridian_collection_strings", "Total number of strings per collection", []string{"col"}, nil),
		"collection_weight":  prometheus.NewDesc("meridian_collection_weight_bytes", "Total weight of collection in bytes", []string{"col"}, nil),
		"server_info":        prometheus.NewDesc("meridian_server_info", "Server info", []string{"id", "version"}, nil),
		"replication":        prometheus.NewDesc("meridian_replication_info", "Replication info", []string{"role", "following", "caught_up", "caught_up_once"}, nil),
		"start_time":         prometheus.NewDesc("meridian_start_time_seconds", "", nil, nil),
	}

	cmdDurations = prometheus.NewSummaryVec(prometheus.SummaryOpts{
		Name:       "meridian_cmd_duration_seconds",
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.95: 0.005, 0.99: 0.001},
	}, []string{"cmd"},
	)
)

func (s *Server) MetricsIndexHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(`<html><head>
<title>Meridian ` + core.Version + `</title></head>
<body><h1>Meridian ` + core.Version + `</h1>
<p><a href='/metrics'>Metrics</a></p>
</body></html>`))
}

func (s *Server) MetricsHandler(w http.ResponseWriter, r *http.Request) {
	reg := prometheus.NewRegistry()

	reg.MustRegister(
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		collectors.NewGoCollector(),
		collectors.NewBuildInfoCollector(),
		cmdDurations,
		s,
	)

	promhttp.HandlerFor(reg, promhttp.HandlerOpts{}).ServeHTTP(w, r)
}

func (s *Server) Describe(ch chan<- *prometheus.Desc) {
	for _, desc := range metricDescriptions {
		ch <- desc
	}
}

func (s *Server) Collect(ch chan<- prometheus.Metric) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	m := make(map[string]interface{})
	s.basicStats(m)
	s.extStats(m)

	for metric, descr := range metricDescriptions {
		val, ok := toFloat(m[metric])
		if ok {
			ch <- prometheus.MustNewConstMetric(descr, prometheus.GaugeValue, val)
		}
	}

	ch <- prometheus.MustNewConstMetric(
		metricDescriptions["server_info"],
		prometheus.GaugeValue, 1.0,
		s.config.serverID(), core.Version)

	ch <- prometheus.MustNewConstMetric(
		metricDescriptions["start_time"],
		prometheus.GaugeValue, float64(s.started.Unix()))

	replLbls := []string{"leader", "", "", ""}
	if s.config.followHost() != "" {
		replLbls = []string{"follower",
			fmt.Sprintf("%s:%d", s.config.followHost(), s.config.followPort()),
			fmt.Sprintf("%t", s.caughtUp()), fmt.Sprintf("%t", s.caughtUpOnce())}
	}
	ch <- prometheus.MustNewConstMetric(
		metricDescriptions["replication"],
		prometheus.GaugeValue, 1.0,
		replLbls...)

	/*
		add objects/points/strings stats for each collection
	*/
	s.cols.Scan(func(key string, col *collection.Collection) bool {
		ch <- prometheus.MustNewConstMetric(
			metricDescriptions["collection_objects"],
			prometheus.GaugeValue,
			float64(col.Count()),
			key,
		)
		ch <- prometheus.MustNewConstMetric(
			metricDescriptions["collection_points"],
			prometheus.GaugeValue,
			float64(col.PointCount()),
			key,
		)
		ch <- prometheus.MustNewConstMetric(
			metricDescriptions["collection_strings"],
			prometheus.GaugeValue,
			float64(col.StringCount()),
			key,
		)
		ch <- prometheus.MustNewConstMetric(
			metricDescriptions["collection_weight"],
			prometheus.GaugeValue,
			float64(col.TotalWeight()),
			key,
		)
		return true
	})
}

func toFloat(val interface{}) (float64, bool) {
	switch v := val.(type) {
	case float64:
		return v, true
	case int64:
		return float64(v), true
	case uint64:
		return float64(v), true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int32:
		return float64(v), true
	case uint32:
		return float64(v), true
	case int16:
		return float64(v), true
	case uint16:
		return float64(v), true
	case int8:
		return float64(v), true
	case uint8:
		return float64(v), true
	}
	return 0, false
}
