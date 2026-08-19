import hashlib
import time
import threading
from collections import OrderedDict


class TTLCache:
    """Small in-memory LRU cache with TTL."""

    def __init__(self, maxsize: int = 50, ttl_seconds: int = 3600):
        self._data: OrderedDict[str, tuple[float, object]] = OrderedDict()
        self._maxsize = maxsize
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get(self, key: str):
        with self._lock:
            if key not in self._data:
                return None
            expires, value = self._data[key]
            if time.time() > expires:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value) -> None:
        with self._lock:
            self._data[key] = (time.time() + self._ttl, value)
            self._data.move_to_end(key)
            while len(self._data) > self._maxsize:
                self._data.popitem(last=False)


class SlidingWindowLimiter:
    """Per-client sliding-window rate limiter (in-memory)."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self._hits: dict[str, list[float]] = {}
        self._max = max_requests
        self._window = window_seconds
        self._lock = threading.Lock()
        self._last_sweep = 0.0

    def _sweep(self, now: float) -> None:
        """Drop clients with no hits left in the window.

        Without this the dict keeps one entry per IP ever seen — an unbounded
        leak on a public endpoint. Runs at most once per window.
        """
        if now - self._last_sweep < self._window:
            return
        self._last_sweep = now
        stale = [
            cid for cid, stamps in self._hits.items()
            if not stamps or now - stamps[-1] >= self._window
        ]
        for cid in stale:
            del self._hits[cid]

    def allow(self, client_id: str) -> bool:
        now = time.time()
        with self._lock:
            self._sweep(now)
            stamps = [
                t for t in self._hits.get(client_id, [])
                if now - t < self._window
            ]
            if len(stamps) >= self._max:
                self._hits[client_id] = stamps
                return False
            stamps.append(now)
            self._hits[client_id] = stamps
            return True


def make_cache_key(jd_text: str, file_bytes: bytes) -> str:
    digest = hashlib.sha256()
    digest.update(jd_text.encode("utf-8"))
    digest.update(file_bytes)
    return digest.hexdigest()