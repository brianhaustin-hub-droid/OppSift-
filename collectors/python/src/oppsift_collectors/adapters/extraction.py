from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import urljoin

from parsel import Selector as ParselSelector
from scrapling import Selector as ScraplingSelector

from oppsift_collectors.contracts.safety import DestinationPolicyError, validate_allowed_url


def extract_html_page(
    request: dict[str, Any],
    body: str,
    page_url: str,
    *,
    status: int,
    content_type: str,
    fetched_at: str,
    etag: str | None,
    last_modified: str | None,
    extractor: Literal["scrapy", "scrapling"],
) -> dict[str, Any]:
    root = _make_selector(body, extractor, request["adapter"]["format"])
    adapter = request["adapter"]
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    seen_ids: set[str] = set()
    rejected = 0

    for row in _select(root, adapter["recordSelector"], extractor):
        if len(records) >= request["limits"]["maxRecords"]:
            break
        extracted = {
            field: _field_value(row, selector, extractor)
            for field, selector in adapter["fields"].items()
            if field not in ("pagination", "links")
        }
        external_id = (extracted.get("externalId") or "").strip()
        title = (extracted.get("title") or "").strip()
        if not external_id or not title:
            warnings.append("Record missing a required external ID or title.")
            rejected += 1
            continue
        if external_id in seen_ids:
            warnings.append(f'Duplicate external record identifier "{external_id}" was skipped.')
            rejected += 1
            continue
        seen_ids.add(external_id)

        link = extracted.get("canonicalUrl")
        source_url = page_url
        if link:
            try:
                source_url = validate_allowed_url(urljoin(page_url, link), request["allowedHosts"])
            except DestinationPolicyError:
                warnings.append(f'Record "{external_id}" has a disallowed source URL.')
                rejected += 1
                continue

        payload = _record_html(row, extractor) or body
        if len(payload.encode("utf-8")) > request["limits"]["maxResponseBytes"]:
            warnings.append(f'Record "{external_id}" exceeds the configured payload size.')
            rejected += 1
            continue
        expected = max(1, len(extracted))
        confidence = sum(value is not None for value in extracted.values()) / expected
        record_warnings = [
            f'Required extraction field "{field}" is missing.'
            for field, selector in adapter["fields"].items()
            if field not in ("pagination", "links")
            and selector.get("required") is True
            and not extracted.get(field)
        ]
        records.append({
            "externalRecordId": external_id,
            "sourceUrl": source_url,
            "canonicalUrl": source_url if link else None,
            "httpStatus": status,
            "contentType": content_type,
            "fetchedAt": fetched_at,
            "publishedAt": _parse_datetime(extracted.get("publishedAt")),
            "etag": etag,
            "lastModified": last_modified,
            "payloadType": "html",
            "payload": payload,
            "payloadChecksum": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
            "extracted": extracted,
            "extractionConfidence": confidence,
            "warnings": record_warnings,
        })

    pagination = adapter["fields"].get("pagination")
    next_page = _field_value(root, pagination, extractor) if pagination else None
    if next_page:
        try:
            next_page = validate_allowed_url(urljoin(page_url, next_page), request["allowedHosts"])
        except DestinationPolicyError:
            warnings.append("Pagination target was outside the approved host allowlist.")
            next_page = None

    links_selector = adapter["fields"].get("links")
    links: list[str] = []
    if links_selector:
        for link_element in _select(root, links_selector["selector"], extractor):
            reference = link_element.attrib.get(links_selector.get("attribute") or "href")
            if not reference:
                continue
            try:
                links.append(validate_allowed_url(urljoin(page_url, reference), request["allowedHosts"]))
            except DestinationPolicyError:
                warnings.append("A discovered link was outside the approved host allowlist.")

    return {
        "records": records,
        "discoveredLinks": list(dict.fromkeys(links)),
        "nextPage": next_page,
        "rejectedCount": rejected,
        "warnings": warnings,
    }


def _make_selector(body: str, extractor: str, content_format: str) -> Any:
    if extractor == "scrapling":
        return ScraplingSelector(body)
    return ParselSelector(text=body, type="xml" if content_format == "xml" else "html")


def _select(root: Any, selector: str, extractor: str) -> list[Any]:
    if extractor == "scrapling":
        return list(root.css(selector))
    return list(root.css(selector))


def _field_value(root: Any, field: dict[str, Any] | None, extractor: str) -> str | None:
    if not field:
        return None
    selected = _select(root, field["selector"], extractor)
    if not selected:
        return None
    element = selected[0]
    attribute = field.get("attribute")
    if attribute:
        value = element.attrib.get(attribute)
    elif extractor == "scrapling":
        value = getattr(element, "text", None)
    else:
        value = element.xpath("string(.)").get()
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", str(value)).strip()
    return normalized or None


def _record_html(element: Any, extractor: str) -> str:
    if extractor == "scrapling":
        return str(getattr(element, "html", "") or "")
    return element.get()


def _parse_datetime(value: str | None) -> str | None:
    if not value or not re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})",
        value,
    ):
        return None
    candidate = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
