from __future__ import annotations

import ipaddress
import socket
from threading import Lock
from collections.abc import Callable
from urllib.parse import urljoin, urlparse


class DestinationPolicyError(PermissionError):
    """Raised for URLs or destinations outside the approved public host policy."""


_pinned_addresses: dict[str, str] = {}
_pinned_addresses_lock = Lock()


def validate_public_url(
    url: str,
    allowed_hosts: list[str],
    resolver: Callable[[str], list[str]] | None = None,
) -> str:
    url = validate_allowed_url(url, allowed_hosts)
    parsed = urlparse(url)
    host = parsed.hostname or ""
    addresses = (resolver or _resolve_public_addresses)(host)
    if not addresses or any(not _is_public_address(address) for address in addresses):
        raise DestinationPolicyError("URL resolves to a private, reserved, or unsupported destination.")
    with _pinned_addresses_lock:
        _pinned_addresses[host.lower().rstrip(".")] = addresses[0]
    return url


def pinned_public_address(host: str) -> str | None:
    with _pinned_addresses_lock:
        return _pinned_addresses.get(host.lower().rstrip("."))


def clear_pinned_addresses() -> None:
    with _pinned_addresses_lock:
        _pinned_addresses.clear()


def validate_allowed_url(url: str, allowed_hosts: list[str]) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    approved_hosts = {value.lower().rstrip(".") for value in allowed_hosts}
    if (
        parsed.scheme != "https"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.port not in (None, 443)
        or not host
        or _is_local_name(host)
        or not any(host == approved or host.endswith(f".{approved}") for approved in approved_hosts)
    ):
        raise DestinationPolicyError("URL is outside the approved public HTTPS host policy.")

    return url


def resolve_reference(base_url: str, reference: str, allowed_hosts: list[str]) -> str:
    return validate_allowed_url(urljoin(base_url, reference), allowed_hosts)


def _resolve_public_addresses(host: str) -> list[str]:
    try:
        return list({
            result[4][0]
            for result in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        })
    except OSError as error:
        raise DestinationPolicyError("Approved hostname could not be resolved.") from error


def _is_public_address(address: str) -> bool:
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return False
    return parsed.version == 4 and parsed.is_global


def _is_local_name(host: str) -> bool:
    return (
        host == "localhost"
        or host.endswith((".localhost", ".local", ".internal", ".test", ".invalid"))
        or "." not in host
    )
