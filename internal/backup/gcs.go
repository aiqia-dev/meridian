package backup

import (
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"strings"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
)

// GCSProvider implements backup to Google Cloud Storage
type GCSProvider struct {
	client     *storage.Client
	bucketName string
	prefix     string
}

// NewGCSProvider creates a new GCS backup provider
func NewGCSProvider(bucketName, prefix string) (*GCSProvider, error) {
	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}

	// Ensure prefix ends with /
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	return &GCSProvider{
		client:     client,
		bucketName: bucketName,
		prefix:     prefix,
	}, nil
}

// Name returns the provider name
func (p *GCSProvider) Name() string {
	return fmt.Sprintf("gcs://%s/%s", p.bucketName, p.prefix)
}

// Upload uploads a file to GCS
func (p *GCSProvider) Upload(ctx context.Context, localPath, remoteName string) error {
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer file.Close()

	objectPath := path.Join(p.prefix, remoteName)
	bucket := p.client.Bucket(p.bucketName)
	obj := bucket.Object(objectPath)

	writer := obj.NewWriter(ctx)
	writer.ContentType = "application/octet-stream"

	if _, err := io.Copy(writer, file); err != nil {
		writer.Close()
		return fmt.Errorf("failed to upload to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close GCS writer: %w", err)
	}

	return nil
}

// Download downloads a file from GCS
func (p *GCSProvider) Download(ctx context.Context, remoteName, localPath string) error {
	objectPath := path.Join(p.prefix, remoteName)
	bucket := p.client.Bucket(p.bucketName)
	obj := bucket.Object(objectPath)

	reader, err := obj.NewReader(ctx)
	if err != nil {
		return fmt.Errorf("failed to read from GCS: %w", err)
	}
	defer reader.Close()

	file, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return fmt.Errorf("failed to download from GCS: %w", err)
	}

	return nil
}

// List lists available backups in GCS
func (p *GCSProvider) List(ctx context.Context) ([]BackupInfo, error) {
	bucket := p.client.Bucket(p.bucketName)
	query := &storage.Query{Prefix: p.prefix}

	var backups []BackupInfo
	it := bucket.Objects(ctx, query)

	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to list GCS objects: %w", err)
		}

		// Skip directories
		if strings.HasSuffix(attrs.Name, "/") {
			continue
		}

		// Only include .aof files
		name := strings.TrimPrefix(attrs.Name, p.prefix)
		if !strings.Contains(name, ".aof") {
			continue
		}

		backups = append(backups, BackupInfo{
			Name:     name,
			Size:     attrs.Size,
			Created:  attrs.Created,
			Checksum: fmt.Sprintf("%x", attrs.MD5),
		})
	}

	return backups, nil
}

// Delete deletes a backup from GCS
func (p *GCSProvider) Delete(ctx context.Context, remoteName string) error {
	objectPath := path.Join(p.prefix, remoteName)
	bucket := p.client.Bucket(p.bucketName)
	obj := bucket.Object(objectPath)

	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete from GCS: %w", err)
	}

	return nil
}

// Close closes the GCS client
func (p *GCSProvider) Close() error {
	return p.client.Close()
}

// LocalProvider implements backup to local filesystem
type LocalProvider struct {
	basePath string
}

// NewLocalProvider creates a new local backup provider
func NewLocalProvider(basePath string) (*LocalProvider, error) {
	// Create directory if it doesn't exist
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup directory: %w", err)
	}

	return &LocalProvider{basePath: basePath}, nil
}

// Name returns the provider name
func (p *LocalProvider) Name() string {
	return fmt.Sprintf("local://%s", p.basePath)
}

// Upload copies a file to the local backup directory
func (p *LocalProvider) Upload(ctx context.Context, localPath, remoteName string) error {
	destPath := path.Join(p.basePath, remoteName)

	src, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

// Download copies a file from the local backup directory
func (p *LocalProvider) Download(ctx context.Context, remoteName, localPath string) error {
	srcPath := path.Join(p.basePath, remoteName)

	src, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

// List lists available backups in the local directory
func (p *LocalProvider) List(ctx context.Context) ([]BackupInfo, error) {
	entries, err := os.ReadDir(p.basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read backup directory: %w", err)
	}

	var backups []BackupInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.Contains(name, ".aof") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		backups = append(backups, BackupInfo{
			Name:    name,
			Size:    info.Size(),
			Created: info.ModTime(),
		})
	}

	return backups, nil
}

// Delete deletes a backup from the local directory
func (p *LocalProvider) Delete(ctx context.Context, remoteName string) error {
	filePath := path.Join(p.basePath, remoteName)
	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete local backup: %w", err)
	}
	return nil
}
