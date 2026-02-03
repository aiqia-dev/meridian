package admin

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

//go:embed all:static
var files embed.FS

// Config holds admin panel configuration
type Config struct {
	Username  string
	Password  string
	JWTSecret []byte
}

// HandleHTTP processes HTTP requests for /admin/
func HandleHTTP(wr io.Writer, url string, config Config, devMode bool) error {
	// Validate URL
	if (!strings.HasPrefix(url, "/admin/") && url != "/admin") ||
		strings.Contains(url, "..") {
		return writeHTTPResponse(wr, "404 Not Found", "text/html",
			nil, []byte("<h1>404 Not Found</h1>\n"))
	}

	// Serve index.html for SPA routes (no file extension)
	if url == "/admin" || url == "/admin/" {
		return writeHTTPFile(wr, "/admin/index.html", devMode)
	}

	// Check if it's a SPA route (no extension) - serve the route's index.html
	// This handles routes like /admin/login, /admin/dashboard, etc.
	// Next.js static export creates /login/index.html, /dashboard/index.html, etc.
	path := strings.TrimPrefix(url, "/admin")
	// Remove trailing slash for checking
	pathNoSlash := strings.TrimSuffix(path, "/")
	if pathNoSlash != "" && !strings.Contains(filepath.Base(pathNoSlash), ".") {
		// Try to serve the route-specific index.html first
		routeIndexPath := "/admin" + pathNoSlash + "/index.html"
		return writeHTTPFile(wr, routeIndexPath, devMode)
	}

	// Redirect trailing slashes for static files only
	if strings.HasSuffix(url, "/") && url != "/admin/" {
		return writeHTTPResponse(wr, "307 Redirect", "text/html",
			[]string{"Location", url[:len(url)-1]},
			[]byte("<h1>307 Redirect</h1>\n"))
	}

	return writeHTTPFile(wr, url, devMode)
}

// HandleAPILogin processes login requests
func HandleAPILogin(wr io.Writer, body []byte, config Config) error {
	// Check if admin is configured
	if config.Username == "" || config.Password == "" {
		return writeJSONResponse(wr, "403 Forbidden", map[string]interface{}{
			"ok":    false,
			"error": "Admin panel not configured",
		})
	}

	// Parse request body
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		return writeJSONResponse(wr, "400 Bad Request", map[string]interface{}{
			"ok":    false,
			"error": "Invalid request body",
		})
	}

	// Validate credentials
	if !ValidateCredentials(req.Username, req.Password, config) {
		return writeJSONResponse(wr, "401 Unauthorized", map[string]interface{}{
			"ok":    false,
			"error": "Invalid credentials",
		})
	}

	// Generate JWT token
	token, expiresAt, err := GenerateJWT(req.Username, config.JWTSecret)
	if err != nil {
		return writeJSONResponse(wr, "500 Internal Server Error", map[string]interface{}{
			"ok":    false,
			"error": "Failed to generate token",
		})
	}

	return writeJSONResponse(wr, "200 OK", map[string]interface{}{
		"ok":        true,
		"token":     token,
		"expiresAt": expiresAt.Unix(),
		"username":  req.Username,
	})
}

// HandleAPIVerify verifies JWT token
func HandleAPIVerify(wr io.Writer, authHeader string, config Config) error {
	// Extract token from header
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		return writeJSONResponse(wr, "401 Unauthorized", map[string]interface{}{
			"ok":    false,
			"error": "Missing or invalid authorization header",
		})
	}

	// Validate token
	claims, err := ValidateJWT(token, config.JWTSecret)
	if err != nil {
		return writeJSONResponse(wr, "401 Unauthorized", map[string]interface{}{
			"ok":    false,
			"error": "Invalid or expired token",
		})
	}

	return writeJSONResponse(wr, "200 OK", map[string]interface{}{
		"ok":       true,
		"username": claims.Username,
	})
}

func writeHTTPFile(wr io.Writer, path string, devMode bool) error {
	var data []byte
	err := os.ErrNotExist

	// Build embed path: /admin/foo -> static/foo
	embedPath := "static" + strings.TrimPrefix(path, "/admin")
	if embedPath == "static" || embedPath == "static/" {
		embedPath = "static/index.html"
	}

	// In dev mode, try to read from filesystem first
	if devMode {
		data, err = os.ReadFile("internal/admin/" + embedPath)
	}

	if os.IsNotExist(err) {
		data, err = files.ReadFile(embedPath)
	}

	if os.IsNotExist(err) {
		return writeHTTPResponse(wr, "404 Not Found", "text/html",
			nil, []byte("<h1>404 Not Found</h1>\n"))
	}
	if err != nil {
		return writeHTTPResponse(wr, "500 Internal Server Error", "text/html",
			nil, []byte("<h1>500 Internal Server Error</h1>\n"))
	}

	contentType := mime.TypeByExtension(filepath.Ext(path))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return writeHTTPResponse(wr, "200 OK", contentType, nil, data)
}

func writeHTTPResponse(wr io.Writer, status, contentType string,
	headers []string, body []byte,
) error {
	var sheaders string
	if len(headers) > 0 {
		hdrs := http.Header{}
		for i := 0; i < len(headers)-1; i += 2 {
			hdrs.Set(headers[i], headers[i+1])
		}
		var buf bytes.Buffer
		hdrs.Write(&buf)
		sheaders = buf.String()
	}
	payload := append([]byte(nil), fmt.Sprintf(""+
		"HTTP/1.1 %s\r\n"+
		"Connection: close\r\n"+
		"Content-Type: %s\r\n"+
		"Content-Length: %d\r\n"+
		"Access-Control-Allow-Origin: *\r\n"+
		"Access-Control-Allow-Headers: Content-Type, Authorization\r\n"+
		"Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"+
		sheaders+
		"\r\n", status, contentType, len(body))...)
	payload = append(payload, body...)
	_, err := wr.Write(payload)
	return err
}

func writeJSONResponse(wr io.Writer, status string, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		body = []byte(`{"ok":false,"error":"Internal error"}`)
	}
	return writeHTTPResponse(wr, status, "application/json", nil, body)
}
