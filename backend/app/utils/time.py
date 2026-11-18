from datetime import datetime, timezone


def utc_now() -> datetime:
    """Naive datetime representing the current UTC time (what we store)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_iso(value: str) -> datetime:
    """Parse an ISO-8601 string into a naive UTC datetime."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def to_iso(dt):
    return dt.isoformat() + "Z" if dt else None
