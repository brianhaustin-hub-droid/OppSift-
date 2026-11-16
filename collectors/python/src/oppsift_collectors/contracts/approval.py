from __future__ import annotations

from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse


class ApprovalError(PermissionError):
    """Raised when the central source registry does not permit collection."""


def verify_approved_request(
    request: dict[str, Any],
    approved_source: dict[str, Any] | None,
    enforce_conditions: Callable[[dict[str, Any], dict[str, Any]], bool] | None = None,
) -> dict[str, Any]:
    constraints = request["constraints"]
    if (
        approved_source is None
        or approved_source.get("sourceId") != request["sourceId"]
        or approved_source.get("connectorId") != request["connectorId"]
        or approved_source.get("active") is not True
        or approved_source.get("approvalStatus") != constraints["approvalStatus"]
        or approved_source.get("reusePermission") != constraints["reusePermission"]
    ):
        raise ApprovalError("Central source registry did not authorize this collection.")

    approved_hosts = {
        _hostname(host)
        for host in approved_source.get("allowedHosts", [])
    }
    request_hosts = {_hostname(host) for host in request["allowedHosts"]}
    source_host = _hostname(urlparse(request["sourceBaseUrl"]).hostname or "")
    if (
        not request_hosts
        or not request_hosts.issubset(approved_hosts)
        or source_host not in request_hosts
    ):
        raise ApprovalError("Collector host allowlist exceeds the approved source registry.")

    if (
        not set(constraints["allowedMethods"]).issubset(set(approved_source.get("methods", [])))
        or request["limits"]["maxRequests"] > approved_source.get("maxRequests", 0)
        or request["limits"]["minimumRequestIntervalMs"]
        < approved_source.get("minimumRequestIntervalMs", 0)
    ):
        raise ApprovalError("Collector request limits exceed the approved source constraints.")

    if constraints["approvalStatus"] == "approved_with_constraints":
        if (
            approved_source.get("conditionalConstraintsEnforced") is not True
            or constraints["conditionalConstraintsEnforced"] is not True
            or enforce_conditions is None
            or not enforce_conditions(approved_source, request)
        ):
            raise ApprovalError("Conditional source terms are not verifiably enforceable.")
    return approved_source


def _hostname(value: str) -> str:
    return value.lower().rstrip(".")
