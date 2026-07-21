//go:build !windows

package storage

import (
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
	"syscall"
)

// MappedFile implements memory-mapped file I/O for macOS/Linux using mmap(2).
// Equivalent interface to the Windows implementation in mmap_windows.go.
// Go automatically selects this file on non-Windows platforms due to the build tag.
type MappedFile struct {
	mu     sync.Mutex
	file   *os.File
	data   []byte
	offset int64
	size   int64
}

// OpenMappedFile opens a file and maps it into memory using mmap (macOS/Linux).
func OpenMappedFile(path string) (*MappedFile, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, err
	}

	size := info.Size()
	if size == 0 {
		file.Close()
		return nil, errors.New("cannot map an empty file")
	}

	// mmap the file with read-only protection
	data, err := syscall.Mmap(
		int(file.Fd()),
		0,
		int(size),
		syscall.PROT_READ,
		syscall.MAP_SHARED,
	)
	if err != nil {
		file.Close()
		return nil, fmt.Errorf("mmap failed: %w", err)
	}

	return &MappedFile{
		file:   file,
		data:   data,
		size:   size,
		offset: 0,
	}, nil
}

func (m *MappedFile) Read(p []byte) (n int, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.offset >= m.size {
		return 0, io.EOF
	}

	n = copy(p, m.data[m.offset:])
	m.offset += int64(n)
	return n, nil
}

func (m *MappedFile) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 || off >= m.size {
		return 0, io.EOF
	}

	n = copy(p, m.data[off:])
	if int64(n) < int64(len(p)) {
		return n, io.EOF
	}
	return n, nil
}

func (m *MappedFile) Seek(offset int64, whence int) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var newOffset int64
	switch whence {
	case io.SeekStart:
		newOffset = offset
	case io.SeekCurrent:
		newOffset = m.offset + offset
	case io.SeekEnd:
		newOffset = m.size + offset
	default:
		return 0, errors.New("invalid whence value")
	}

	if newOffset < 0 || newOffset > m.size {
		return 0, errors.New("seek offset out of bounds")
	}

	m.offset = newOffset
	return m.offset, nil
}

func (m *MappedFile) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var firstErr error

	if m.data != nil {
		if err := syscall.Munmap(m.data); err != nil {
			firstErr = fmt.Errorf("munmap failed: %w", err)
		}
		m.data = nil
	}

	if m.file != nil {
		if err := m.file.Close(); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("close file failed: %w", err)
		}
		m.file = nil
	}

	return firstErr
}
