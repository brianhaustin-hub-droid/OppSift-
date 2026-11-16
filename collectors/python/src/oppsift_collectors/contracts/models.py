from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal, TypedDict
from urllib.parse import urlparse

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import ValidationError


CollectorFramework = Literal["crawlee", "cheerio", "scrapy", "scrapling"]


class CollectorRequest(TypedDict):
    contractVersion: Literal["1.0"]
    jobId: str
    ingestionRunId: str
    sourceId: str
    connectorId: str
    collectorFramework: CollectorFramework
    sourceBaseUrl: str
    allowedHosts: list[str]
    currentCursor: str | None
    limits: dict[str, int]
    constraints: dict[str, object]
    adapter: dict[str, object]


class CollectorResult(TypedDict):
    contractVersion: Literal["1.0"]
    sourceId: str
    jobId: str
    ingestionRunId: str
    connectorId: str
    collectorFramework: CollectorFramework
    collectorVersion: str
    startedAt: str
    completedAt: str
    requestCount: int
    pagesVisited: int
    recordsDiscovered: int
    recordsRejected: int
    warnings: list[str]
    errors: list[dict[str, object]]
    nextCursor: str | None
    records: list[dict[str, object]]


class CollectorContractError(ValueError):
    """Raised when a shared collector contract is invalid."""


SCHEMA_PATH = Path(__file__).resolve().parents[4] / "shared" / "collector-contract.schema.json"
with SCHEMA_PATH.open(encoding="utf-8") as schema_file:
    COLLECTOR_SCHEMA = json.load(schema_file)

REQUEST_VALIDATOR = Draft202012Validator(COLLECTOR_SCHEMA, format_checker=FormatChecker())
RESULT_VALIDATOR = Draft202012Validator(COLLECTOR_SCHEMA, format_checker=FormatChecker())


def validate_request(value: object) -> CollectorRequest:
    _validate(REQUEST_VALIDATOR, value)
    if not isinstance(value, dict):
        raise CollectorContractError("Collector request must be a JSON object.")
    return value  # type: ignore[return-value]


def validate_result(value: object) -> CollectorResult:
    _validate(RESULT_VALIDATOR, value)
    if not isinstance(value, dict):
        raise CollectorContractError("Collector result must be a JSON object.")
    return value  # type: ignore[return-value]


def assert_result_matches_request(
    request: CollectorRequest,
    result: CollectorResult,
) -> CollectorResult:
    if (
        result["sourceId"] != request["sourceId"]
        or result["jobId"] != request["jobId"]
        or result["ingestionRunId"] != request["ingestionRunId"]
        or result["connectorId"] != request["connectorId"]
        or result["collectorFramework"] != request["collectorFramework"]
        or result["recordsDiscovered"] != len(result["records"])
        or result["requestCount"] > request["limits"]["maxRequests"]
        or result["pagesVisited"] > request["limits"]["maxPages"]
        or len(result["records"]) > request["limits"]["maxRecords"]
    ):
        raise CollectorContractError("Collector result does not match request identity or limits.")

    total_bytes = 0
    allowed_hosts = [host.lower().rstrip(".") for host in request["allowedHosts"]]
    for record in result["records"]:
        source_url = urlparse(record["sourceUrl"])
        hostname = (source_url.hostname or "").lower().rstrip(".")
        if (
            source_url.scheme != "https"
            or source_url.username is not None
            or source_url.password is not None
            or source_url.port not in (None, 443)
            or not any(hostname == host or hostname.endswith(f".{host}") for host in allowed_hosts)
        ):
            raise CollectorContractError("Collector result contains a disallowed source hostname.")
        canonical_value = record.get("canonicalUrl")
        if canonical_value is not None:
            canonical_url = urlparse(canonical_value)
            canonical_hostname = (canonical_url.hostname or "").lower().rstrip(".")
            if (
                canonical_url.scheme != "https"
                or canonical_url.username is not None
                or canonical_url.password is not None
                or canonical_url.port not in (None, 443)
                or not any(
                    canonical_hostname == host or canonical_hostname.endswith(f".{host}")
                    for host in allowed_hosts
                )
            ):
                raise CollectorContractError("Collector result contains a disallowed canonical URL.")
        payload = record["payload"]
        payload_text = payload if isinstance(payload, str) else json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        payload_bytes = payload_text.encode("utf-8")
        if len(payload_bytes) > request["limits"]["maxResponseBytes"]:
            raise CollectorContractError("Collector result contains an oversized raw payload.")
        if hashlib.sha256(payload_bytes).hexdigest() != record["payloadChecksum"]:
            raise CollectorContractError("Collector payload checksum does not match its content.")
        total_bytes += len(payload_bytes)
        if total_bytes > request["limits"]["maxTotalBytes"]:
            raise CollectorContractError("Collector result exceeds the aggregate payload limit.")
    return result


def _validate(validator: Draft202012Validator, value: object) -> None:
    errors = sorted(validator.iter_errors(value), key=lambda error: list(error.path))
    if errors:
        messages = "; ".join(_format_error(error) for error in errors[:20])
        raise CollectorContractError(f"Collector contract validation failed: {messages}")


def _format_error(error: ValidationError) -> str:
    path = ".".join(str(part) for part in error.path) or "/"
    return f"{path}: {error.message}"
