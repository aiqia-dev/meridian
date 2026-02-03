// Package backup provides backup functionality for Meridian AOF files
package backup

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/aiqia-dev/meridian/internal/log"
)

// Provider represents a backup storage provider
type Provider interface {
	// Upload uploads a file to the backup storage
	Upload(ctx context.Context, localPath, remoteName string) error
	// Download downloads a file from the backup storage
	Download(ctx context.Context, remoteName, localPath string) error
	// List lists available backups
	List(ctx context.Context) ([]BackupInfo, error)
	// Delete deletes a backup
	Delete(ctx context.Context, remoteName string) error
	// Name returns the provider name
	Name() string
}

// BackupInfo contains information about a backup
type BackupInfo struct {
	Name      string
	Size      int64
	Created   time.Time
	Checksum  string
}

// Config holds backup configuration
type Config struct {
	Enabled       bool
	Provider      string // "gcs", "s3", "local"
	Bucket        string
	Prefix        string // prefix/folder for backups
	Interval      time.Duration
	RetentionDays int
	Compress      bool
	AOFPath       string
}

// Manager manages backup operations
type Manager struct {
	config   Config
	provider Provider
	mu       sync.Mutex
	running  bool
	stopCh   chan struct{}
	doneCh   chan struct{}
}

// NewManager creates a new backup manager
func NewManager(config Config) (*Manager, error) {
	if !config.Enabled {
		return &Manager{config: config}, nil
	}

	var provider Provider
	var err error

	switch config.Provider {
	case "gcs":
		provider, err = NewGCSProvider(config.Bucket, config.Prefix)
	case "local":
		provider, err = NewLocalProvider(config.Bucket) // Bucket is used as local path
	default:
		return nil, fmt.Errorf("unsupported backup provider: %s", config.Provider)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create backup provider: %w", err)
	}

	return &Manager{
		config:   config,
		provider: provider,
		stopCh:   make(chan struct{}),
		doneCh:   make(chan struct{}),
	}, nil
}

// Start starts the scheduled backup routine
func (m *Manager) Start() {
	if !m.config.Enabled || m.config.Interval <= 0 {
		log.Infof("Backup: disabled or no interval configured")
		return
	}

	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.mu.Unlock()

	log.Infof("Backup: starting scheduled backups every %v to %s", m.config.Interval, m.provider.Name())

	go func() {
		defer close(m.doneCh)

		// Initial backup after a short delay
		timer := time.NewTimer(30 * time.Second)
		select {
		case <-timer.C:
			m.doBackup()
		case <-m.stopCh:
			timer.Stop()
			return
		}

		ticker := time.NewTicker(m.config.Interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				m.doBackup()
			case <-m.stopCh:
				return
			}
		}
	}()
}

// Stop stops the scheduled backup routine
func (m *Manager) Stop() {
	m.mu.Lock()
	if !m.running {
		m.mu.Unlock()
		return
	}
	m.running = false
	m.mu.Unlock()

	close(m.stopCh)
	<-m.doneCh
	log.Infof("Backup: stopped")
}

// Backup performs an immediate backup
func (m *Manager) Backup() error {
	if !m.config.Enabled {
		return fmt.Errorf("backup is not enabled")
	}
	return m.doBackup()
}

func (m *Manager) doBackup() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	start := time.Now()
	log.Infof("Backup: starting backup of %s", m.config.AOFPath)

	// Check if AOF file exists
	info, err := os.Stat(m.config.AOFPath)
	if err != nil {
		log.Warnf("Backup: AOF file not found: %v", err)
		return fmt.Errorf("AOF file not found: %w", err)
	}

	// Generate backup filename
	timestamp := time.Now().Format("20060102_150405")
	hostname, _ := os.Hostname()
	backupName := fmt.Sprintf("meridian_%s_%s.aof", hostname, timestamp)
	if m.config.Compress {
		backupName += ".gz"
	}

	// Create temp file for backup
	tempFile, err := os.CreateTemp("", "meridian-backup-*")
	if err != nil {
		log.Warnf("Backup: failed to create temp file: %v", err)
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)

	// Copy AOF to temp file (with optional compression)
	srcFile, err := os.Open(m.config.AOFPath)
	if err != nil {
		tempFile.Close()
		log.Warnf("Backup: failed to open AOF file: %v", err)
		return fmt.Errorf("failed to open AOF file: %w", err)
	}

	var writer io.WriteCloser = tempFile
	if m.config.Compress {
		writer = gzip.NewWriter(tempFile)
	}

	copied, err := io.Copy(writer, srcFile)
	srcFile.Close()

	if m.config.Compress {
		writer.Close()
	}
	tempFile.Close()

	if err != nil {
		log.Warnf("Backup: failed to copy AOF file: %v", err)
		return fmt.Errorf("failed to copy AOF file: %w", err)
	}

	// Upload to provider
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := m.provider.Upload(ctx, tempPath, backupName); err != nil {
		log.Warnf("Backup: failed to upload: %v", err)
		return fmt.Errorf("failed to upload backup: %w", err)
	}

	duration := time.Since(start)
	log.Infof("Backup: completed successfully - %s (%d bytes, original %d bytes) in %v",
		backupName, copied, info.Size(), duration)

	// Cleanup old backups
	if m.config.RetentionDays > 0 {
		go m.cleanupOldBackups()
	}

	return nil
}

func (m *Manager) cleanupOldBackups() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	backups, err := m.provider.List(ctx)
	if err != nil {
		log.Warnf("Backup: failed to list backups for cleanup: %v", err)
		return
	}

	cutoff := time.Now().AddDate(0, 0, -m.config.RetentionDays)
	for _, backup := range backups {
		if backup.Created.Before(cutoff) {
			if err := m.provider.Delete(ctx, backup.Name); err != nil {
				log.Warnf("Backup: failed to delete old backup %s: %v", backup.Name, err)
			} else {
				log.Infof("Backup: deleted old backup %s (created %v)", backup.Name, backup.Created)
			}
		}
	}
}

// List returns a list of available backups
func (m *Manager) List() ([]BackupInfo, error) {
	if !m.config.Enabled {
		return nil, fmt.Errorf("backup is not enabled")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	return m.provider.List(ctx)
}

// Restore restores from a backup
func (m *Manager) Restore(backupName, destPath string) error {
	if !m.config.Enabled {
		return fmt.Errorf("backup is not enabled")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Download to temp file
	tempFile, err := os.CreateTemp("", "meridian-restore-*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	if err := m.provider.Download(ctx, backupName, tempPath); err != nil {
		return fmt.Errorf("failed to download backup: %w", err)
	}

	// Decompress if needed
	if filepath.Ext(backupName) == ".gz" {
		srcFile, err := os.Open(tempPath)
		if err != nil {
			return fmt.Errorf("failed to open downloaded file: %w", err)
		}
		defer srcFile.Close()

		gzReader, err := gzip.NewReader(srcFile)
		if err != nil {
			return fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzReader.Close()

		destFile, err := os.Create(destPath)
		if err != nil {
			return fmt.Errorf("failed to create destination file: %w", err)
		}
		defer destFile.Close()

		if _, err := io.Copy(destFile, gzReader); err != nil {
			return fmt.Errorf("failed to decompress backup: %w", err)
		}
	} else {
		// Just copy
		if err := os.Rename(tempPath, destPath); err != nil {
			return fmt.Errorf("failed to move backup to destination: %w", err)
		}
	}

	log.Infof("Backup: restored %s to %s", backupName, destPath)
	return nil
}

// Status returns the current backup status
func (m *Manager) Status() map[string]interface{} {
	m.mu.Lock()
	defer m.mu.Unlock()

	status := map[string]interface{}{
		"enabled":        m.config.Enabled,
		"provider":       m.config.Provider,
		"interval":       m.config.Interval.String(),
		"retention_days": m.config.RetentionDays,
		"compress":       m.config.Compress,
		"running":        m.running,
	}

	if m.config.Enabled {
		status["bucket"] = m.config.Bucket
		status["prefix"] = m.config.Prefix
	}

	return status
}
