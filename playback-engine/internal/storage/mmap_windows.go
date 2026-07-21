//go:build windows

package storage


import (
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
	"syscall"
	"unsafe"
)

// mmapToSlice mengonversi uintptr dari MapViewOfFile syscall menjadi []byte.
// Menggunakan //go:nocheckptr untuk menekan go vet "possible misuse of unsafe.Pointer":
// Pointer ini berasal dari OS (bukan Go heap), jadi aturan GC tidak berlaku.
//
//go:nocheckptr
func mmapToSlice(ptr uintptr, size int64) []byte {
	return (*[1 << 40]byte)(unsafe.Pointer(ptr))[:size:size]
}

type MappedFile struct {
	mu       sync.Mutex
	file     *os.File
	hMapping syscall.Handle
	ptr      uintptr
	data     []byte
	offset   int64
	size     int64
}

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

	// 1. Get Windows File Handle
	fHandle := syscall.Handle(file.Fd())

	// 2. Create File Mapping
	// PAGE_READONLY = 0x02
	hMapping, err := syscall.CreateFileMapping(
		fHandle,
		nil,
		syscall.PAGE_READONLY,
		0,
		0,
		nil,
	)
	if err != nil && err != syscall.Errno(0) {
		file.Close()
		return nil, fmt.Errorf("CreateFileMapping failed: %w", err)
	}

	// 3. Map View of File
	// FILE_MAP_READ = 0x04
	ptr, err := syscall.MapViewOfFile(
		hMapping,
		syscall.FILE_MAP_READ,
		0,
		0,
		0,
	)
	if err != nil && err != syscall.Errno(0) {
		syscall.CloseHandle(hMapping)
		file.Close()
		return nil, fmt.Errorf("MapViewOfFile failed: %w", err)
	}

	// 4. Convert pointer to slice via helper (suppresses go vet unsafe.Pointer warning)
	data := mmapToSlice(ptr, size)

	return &MappedFile{
		file:     file,
		hMapping: hMapping,
		ptr:      ptr,
		data:     data,
		size:     size,
		offset:   0,
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

	var errs []error

	if m.ptr != 0 {
		err := syscall.UnmapViewOfFile(m.ptr)
		if err != nil {
			errs = append(errs, fmt.Errorf("UnmapViewOfFile failed: %w", err))
		}
		m.ptr = 0
	}

	if m.hMapping != 0 {
		err := syscall.CloseHandle(m.hMapping)
		if err != nil {
			errs = append(errs, fmt.Errorf("CloseHandle mapping failed: %w", err))
		}
		m.hMapping = 0
	}

	if m.file != nil {
		err := m.file.Close()
		if err != nil {
			errs = append(errs, fmt.Errorf("Close file failed: %w", err))
		}
		m.file = nil
	}

	if len(errs) > 0 {
		return errs[0] // Return first error
	}
	return nil
}
