package capture

import (
	"fmt"
	"regexp"
	"strings"
)

// =============================================================
// Canonical Camera Registry
//
// Normalizes camera names to a single canonical key so that
// multiple WebRTC clients requesting the same physical camera
// (via main, audience, preview channels) all share ONE FFmpeg
// capture process.
//
// Rejects UUID-like device_id strings that browsers generate —
// these cannot be used as DirectShow/AVFoundation device names
// and would cause duplicate FFmpeg processes or capture failures.
// =============================================================

// uuidPattern matches common UUID formats:
//   - 8-4-4-4-12 hex digits, optionally wrapped in {} or ()
//   - Also matches Windows device instance paths like \\?\usb#...
var uuidPattern = regexp.MustCompile(
	`(?i)^[{(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[)}]?$`,
)

// devicePathPattern matches Windows device instance paths
// e.g. \\?\usb#vid_... or @device_pnp_...
var devicePathPattern = regexp.MustCompile(
	`(?i)^(@device_pnp_|\\\\[?\\\\])`,
)

// ResolveCanonicalName normalizes a raw camera identifier to a
// canonical key suitable for use as a StreamManager map key.
//
// Rules:
//  1. Trim whitespace
//  2. Reject empty strings
//  3. Reject UUID-like strings (browser device_id)
//  4. Reject Windows device instance paths
//  5. Lowercase for case-insensitive matching
//  6. Return "camera:<normalized>" key
func ResolveCanonicalName(raw string) (string, error) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", fmt.Errorf("camera name is empty")
	}

	if IsUUIDLike(name) {
		return "", fmt.Errorf("rejected UUID-like device_id %q — use device_name instead", name)
	}

	if devicePathPattern.MatchString(name) {
		return "", fmt.Errorf("rejected device path %q — use device_name instead", name)
	}

	canonical := strings.ToLower(name)
	return "camera:" + canonical, nil
}

// IsUUIDLike returns true if the string looks like a UUID or GUID.
// Browser navigator.mediaDevices.enumerateDevices() returns UUIDs
// as deviceId — these CANNOT be used as FFmpeg device names.
func IsUUIDLike(s string) bool {
	return uuidPattern.MatchString(strings.TrimSpace(s))
}

// CanonicalToDisplayName extracts the human-readable camera name
// from a canonical key (strips the "camera:" prefix).
func CanonicalToDisplayName(key string) string {
	return strings.TrimPrefix(key, "camera:")
}
