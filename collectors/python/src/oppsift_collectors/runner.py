from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin
from typing import Any

from oppsift_collectors import __version__
from oppsift_collectors.adapters.extraction import extract_html_page
from oppsift_collectors.contracts.approval import verify_approved_request
from oppsift_collectors.contracts.models import (
    assert_result_matches_request,
    validate_request,
    validate_result,
)
from oppsift_collectors.contracts.safety import DestinationPolicyError, validate_allowed_url
from oppsift_collectors.registry import create_default_registry


def run_fixture_collection(input_value: object) -> dict[str, Any]:
    if not isinstance(input_value, dict) or input_value.get("mode") != "fixture":
        raise ValueError("The Python CLI only supports local fixture mode.")
    request = validate_request(input_value.get("request"))
    framework = request["collectorFramework"]
    if framework not in ("scrapy", "scrapling"):
        raise ValueError("The Python runner only executes the Scrapy and Scrapling frameworks.")
    registration = create_default_registry().resolve(framework, request["adapter"]["format"])
    verify_approved_request(request, input_value.get("approval"))
    pages = input_value.get("pages")
    if not isinstance(pages, dict):
        raise ValueError("Fixture pages must be an object keyed by HTTPS URL.")

    started = datetime.now(timezone.utc)
    queue = [request["sourceBaseUrl"]]
    if request["currentCursor"]:
        queue = [urljoin(request["sourceBaseUrl"], request["currentCursor"])]
    seen_urls: set[str] = set()
    seen_records: set[str] = set()
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    errors: list[dict[str, Any]] = []
    request_count = 0
    pages_visited = 0
    records_rejected = 0
    total_bytes = 0

    while queue and request_count < request["limits"]["maxRequests"] and pages_visited < request["limits"]["maxPages"]:
        page_url = queue.pop(0)
        try:
            page_url = validate_allowed_url(page_url, request["allowedHosts"])
        except DestinationPolicyError as error:
            errors.append({
                "code": "destination_policy_rejected",
                "message": str(error),
                "url": page_url,
                "retryable": False,
            })
            continue
        if page_url in seen_urls:
            continue
        seen_urls.add(page_url)
        page_fixture = pages.get(page_url)
        if not isinstance(page_fixture, dict):
            errors.append({
                "code": "fixture_missing",
                "message": "Fixture URL has no configured response.",
                "url": page_url,
                "retryable": False,
            })
            request_count += 1
            continue
        request_count += 1
        content_type = str(page_fixture.get("contentType", "text/html")).split(";", 1)[0].lower()
        permitted = (
            {"text/html", "application/xhtml+xml"}
            if request["adapter"]["format"] == "html"
            else {"application/xml", "text/xml", "application/rss+xml", "application/atom+xml"}
        )
        if content_type not in permitted:
            errors.append({
                "code": "unsupported_content_type",
                "message": f'Unsupported content type "{content_type}".',
                "url": page_url,
                "retryable": False,
            })
            continue
        body = page_fixture.get("body", "")
        if not isinstance(body, str) or len(body.encode("utf-8")) > request["limits"]["maxResponseBytes"]:
            errors.append({
                "code": "response_too_large",
                "message": "Fixture response exceeds the configured byte limit.",
                "url": page_url,
                "retryable": False,
            })
            continue

        pages_visited += 1
        extracted = extract_html_page(
            request,
            body,
            page_url,
            status=int(page_fixture.get("status", 200)),
            content_type=content_type,
            fetched_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            etag=page_fixture.get("etag"),
            last_modified=page_fixture.get("lastModified"),
            extractor=framework,
        )
        records_rejected += extracted["rejectedCount"]
        warnings.extend(extracted["warnings"])
        for record in extracted["records"]:
            if record["externalRecordId"] in seen_records:
                records_rejected += 1
                warnings.append(f'Duplicate external record identifier "{record["externalRecordId"]}" was skipped.')
                continue
            payload = record["payload"]
            payload_bytes = len(payload.encode("utf-8"))
            if (
                len(records) >= request["limits"]["maxRecords"]
                or total_bytes + payload_bytes > request["limits"]["maxTotalBytes"]
            ):
                records_rejected += 1
                warnings.append("Maximum record or aggregate payload limit was reached.")
                continue
            seen_records.add(record["externalRecordId"])
            total_bytes += payload_bytes
            records.append(record)
        for candidate in ([extracted["nextPage"]] if extracted["nextPage"] else []) + extracted["discoveredLinks"]:
            if candidate not in seen_urls and candidate not in queue:
                queue.append(candidate)

    if queue:
        warnings.append("Collection stopped at the configured page or request limit.")
    result = {
        "contractVersion": "1.0",
        "sourceId": request["sourceId"],
        "jobId": request["jobId"],
        "ingestionRunId": request["ingestionRunId"],
        "connectorId": request["connectorId"],
        "collectorFramework": framework,
        "collectorVersion": f"{framework}@{registration.package_version}+oppsift-{__version__}",
        "startedAt": started.isoformat().replace("+00:00", "Z"),
        "completedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "requestCount": request_count,
        "pagesVisited": pages_visited,
        "recordsDiscovered": len(records),
        "recordsRejected": records_rejected,
        "warnings": warnings[:200],
        "errors": errors[:200],
        "nextCursor": queue[0] if queue else None,
        "records": records,
    }
    return assert_result_matches_request(request, validate_result(result))


def main() -> None:
    try:
        input_value = json.load(sys.stdin)
        result = run_fixture_collection(input_value)
        json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write("\n")
    except Exception as error:
        print(str(error) or "Collector execution failed.", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
