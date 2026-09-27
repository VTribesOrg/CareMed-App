import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

# Page usernames are letters, digits and a few punctuation marks. Kept strict
# so a stray paste ("https://facebook.com/...") never ends up inside m.me/.
PAGE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._\-]{1,89}$")

# Hosts whose path (or query) carries the page identifier we want.
PAGE_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com",
              "web.facebook.com", "business.facebook.com"}
MESSENGER_HOSTS = {"m.me", "www.m.me", "messenger.com", "www.messenger.com",
                   "messenger.facebook.com"}

MESSENGER_PREFIX = "https://m.me/"


def _page_name_from_host(host, path, query):
    """Pull the page identifier out of a URL's path (or ?to= query)."""
    host = (host or "").lower()

    segments = [seg for seg in (path or "").strip("/").split("/") if seg]

    if host in MESSENGER_HOSTS:
        # m.me/<page> or messenger.com/<page>
        if segments and segments[0].lower() not in ("share", "t"):
            return segments[0]
        # messenger.com/?to=<page>
        for key, value in parse_qsl(query or "", keep_blank_values=False):
            if key.lower() == "to" and value:
                return value.strip("/")
        return None

    if host in PAGE_HOSTS:
        # facebook.com/<page> (skip /pages/<name>/<id>-style deep links, where
        # the numeric id is the more reliable handle for m.me)
        if segments and segments[0].lower() not in ("p", "pages", "profile.php"):
            return segments[0]
        for key, value in parse_qsl(query or "", keep_blank_values=False):
            if key.lower() in ("id", "page_id") and value:
                return value
        if len(segments) >= 3 and segments[2].isdigit():
            return segments[2]
    return None


def normalize_messenger_url(value):
    """Return ``https://m.me/<page>`` for any reasonable Messenger input.

    Accepts a bare page username, an ``m.me`` link, or a Facebook page URL.
    Returns ``None`` when nothing usable is in there, so callers can store
    ``None`` rather than a broken link.
    """
    if value is None:
        return None

    candidate = str(value).strip().strip('"').strip("'")
    if not candidate:
        return None

    # Already a canonical link: keep the page part only.
    if candidate.lower().startswith(MESSENGER_PREFIX):
        candidate = candidate[len(MESSENGER_PREFIX):]

    if "://" in candidate or re.match(r"^[a-z]+:", candidate):
        parsed = urlparse(candidate)
        candidate = _page_name_from_host(parsed.netloc, parsed.path, parsed.query) or ""
    elif "." in candidate and not candidate.startswith("@"):
        # Looks like "facebook.com/CareMed" typed without a scheme.
        parsed = urlparse("https://" + candidate)
        candidate = _page_name_from_host(parsed.netloc, parsed.path, parsed.query) or ""

    candidate = str(candidate).strip("/").split("/")[0]
    candidate = candidate.lstrip("@")

    if not PAGE_NAME_RE.match(candidate):
        return None
    return MESSENGER_PREFIX + candidate


def build_messenger_link(value, message=None):
    """Canonical chat link, optionally pre-filled with a message."""
    link = normalize_messenger_url(value)
    if not link:
        return None
    if message:
        return f"{link}?{urlencode({'text': str(message).strip()})}"
    return link
