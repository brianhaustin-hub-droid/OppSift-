from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import scrapy
from scrapy.crawler import Crawler, CrawlerProcess
from scrapy.exceptions import IgnoreRequest
from scrapy.http import Response
from scrapy.resolver import CachingThreadedResolver
from twisted.internet.defer import fail, succeed
from twisted.internet.error import DNSLookupError

from oppsift_collectors import __version__
from oppsift_collectors.adapters.extraction import extract_html_page
from oppsift_collectors.contracts.approval import verify_approved_request
from oppsift_collectors.contracts.models import (
    assert_result_matches_request,
    validate_request,
    validate_result,
)
from oppsift_collectors.contracts.safety import (
    DestinationPolicyError,
    clear_pinned_addresses,
    pinned_public_address,
    validate_public_url,
)
from oppsift_collectors.registry import create_default_registry


class ApprovedDestinationMiddleware:
    def process_request(self, request: scrapy.Request, spider: "ApprovedCollectorSpider") -> None:
        contract = spider.contract
        if request.method not in contract["constraints"]["allowedMethods"]:
            spider._error("method_rejected", "HTTP method is not approved by the source registry.", request.url)
            raise IgnoreRequest("HTTP method is not approved by the source registry.")
        try:
            validate_public_url(request.url, contract["allowedHosts"], spider.resolver)
        except DestinationPolicyError as error:
            spider._error("destination_policy_rejected", str(error), request.url)
            raise IgnoreRequest(str(error)) from error
        if spider.state["requestCount"] >= contract["limits"]["maxRequests"]:
            spider._error("request_limit_reached", "Maximum HTTP request limit reached.", request.url)
            raise IgnoreRequest("Maximum HTTP request limit reached.")
        spider.state["requestCount"] += 1

    def process_response(
        self,
        request: scrapy.Request,
        response: Response,
        spider: "ApprovedCollectorSpider",
    ) -> Response:
        if len(response.body) > spider.contract["limits"]["maxResponseBytes"]:
            spider._error("response_too_large", "Source response exceeds the configured byte limit.", request.url)
            raise IgnoreRequest("Source response exceeds the configured byte limit.")
        return response

    def process_exception(
        self,
        request: scrapy.Request,
        exception: Exception,
        spider: "ApprovedCollectorSpider",
    ) -> None:
        spider._error("request_failed", str(exception), request.url, retryable=True)


class ApprovedHostnameResolver(CachingThreadedResolver):
    @classmethod
    def from_crawler(cls, crawler: Crawler, reactor: Any):
        return cls(reactor, 0, crawler.settings.getfloat("DNS_TIMEOUT"))

    def getHostByName(self, name: str, timeout: Any = ()):
        address = pinned_public_address(name)
        if address is None:
            return fail(DNSLookupError(name))
        return succeed(address)


class ApprovedCollectorSpider(scrapy.Spider):
    name = "oppsift_approved_source"
    handle_httpstatus_all = True

    def __init__(
        self,
        request_data: dict[str, Any],
        state: dict[str, Any],
        framework: str = "scrapy",
        resolver: Callable[[str], list[str]] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.contract = request_data
        self.state = state
        self.framework = framework
        self.extractor = "scrapling" if framework == "scrapling" else "scrapy"
        self.resolver = resolver
        self.allowed_domains = request_data["allowedHosts"]
        self._seen_urls: set[str] = set()
        self._seen_record_ids: set[str] = set()
        self._pending_urls: set[str] = set()
        self.state["pendingUrls"] = self._pending_urls

    def start_requests(self):
        cursor = self.contract["currentCursor"]
        start_url = urljoin(self.contract["sourceBaseUrl"], cursor) if cursor else self.contract["sourceBaseUrl"]
        yield self._make_request(start_url, 0)

    def parse(self, response: Response):
        self._pending_urls.discard(response.url)
        self._seen_urls.add(response.url)
        if response.status in (301, 302, 303, 307, 308):
            location = response.headers.get("Location")
            redirect_count = response.meta.get("oppsift_redirect_count", 0)
            if not location or redirect_count >= 3:
                self._error("redirect_rejected", "Source redirect is missing a target or exceeds the limit.", response.url)
                return
            try:
                yield self._make_request(urljoin(response.url, location.decode("utf-8")), redirect_count + 1)
            except DestinationPolicyError as error:
                self._error("redirect_rejected", str(error), response.url)
            return
        if response.status < 200 or response.status >= 300:
            self._error(
                "http_error",
                f"Approved source returned HTTP {response.status}.",
                response.url,
                retryable=response.status == 429 or response.status >= 500,
            )
            return
        content_type = response.headers.get("Content-Type", b"").decode("latin-1").split(";", 1)[0].strip().lower()
        permitted_types = (
            {"text/html", "application/xhtml+xml"}
            if self.contract["adapter"]["format"] == "html"
            else {"application/xml", "text/xml", "application/rss+xml", "application/atom+xml"}
        )
        if content_type not in permitted_types:
            self._error("unsupported_content_type", f'Unsupported content type "{content_type or "missing"}".', response.url)
            return
        if self.state["pagesVisited"] >= self.contract["limits"]["maxPages"]:
            self.state["nextCursor"] = response.url
            self.state["warnings"].append("Maximum page limit reached.")
            return

        self.state["pagesVisited"] += 1
        extracted = extract_html_page(
            self.contract,
            response.text,
            response.url,
            status=response.status,
            content_type=content_type,
            fetched_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            etag=_header(response, "ETag"),
            last_modified=_header(response, "Last-Modified"),
            extractor=self.extractor,
        )
        self.state["recordsRejected"] += extracted["rejectedCount"]
        self.state["warnings"].extend(extracted["warnings"])
        for record in extracted["records"]:
            if record["externalRecordId"] in self._seen_record_ids:
                self.state["recordsRejected"] += 1
                self.state["warnings"].append(
                    f'Duplicate external record identifier "{record["externalRecordId"]}" was skipped.'
                )
                continue
            payload = record["payload"]
            payload_bytes = len(payload.encode("utf-8")) if isinstance(payload, str) else len(json.dumps(payload).encode("utf-8"))
            if (
                len(self.state["records"]) >= self.contract["limits"]["maxRecords"]
                or self.state["totalPayloadBytes"] + payload_bytes > self.contract["limits"]["maxTotalBytes"]
            ):
                self.state["recordsRejected"] += 1
                self.state["warnings"].append("Maximum record or aggregate payload limit was reached.")
                continue
            self._seen_record_ids.add(record["externalRecordId"])
            self.state["totalPayloadBytes"] += payload_bytes
            self.state["records"].append(record)

        candidate_urls = []
        if extracted["nextPage"]:
            candidate_urls.append(extracted["nextPage"])
        candidate_urls.extend(extracted["discoveredLinks"])
        for candidate in candidate_urls:
            if candidate in self._seen_urls or candidate in self._pending_urls:
                continue
            if self.state["pagesVisited"] >= self.contract["limits"]["maxPages"]:
                self.state["nextCursor"] = candidate
                self.state["warnings"].append("Maximum page limit reached.")
                break
            if self.state["requestCount"] + len(self._pending_urls) >= self.contract["limits"]["maxRequests"]:
                self.state["nextCursor"] = candidate
                self.state["warnings"].append("Maximum HTTP request limit reached.")
                break
            try:
                yield self._make_request(candidate, 0)
            except DestinationPolicyError as error:
                self._error("destination_policy_rejected", str(error), candidate)

    def _make_request(self, url: str, redirect_count: int) -> scrapy.Request:
        validate_public_url(url, self.contract["allowedHosts"], self.resolver)
        if self.state["requestCount"] + len(self._pending_urls) >= self.contract["limits"]["maxRequests"]:
            raise DestinationPolicyError("Maximum HTTP request limit reached.")
        self._pending_urls.add(url)
        return scrapy.Request(
            url,
            callback=self.parse,
            method="GET",
            dont_filter=False,
            meta={
                "handle_httpstatus_all": True,
                "oppsift_redirect_count": redirect_count,
            },
        )

    def _error(
        self,
        code: str,
        message: str,
        url: str | None,
        retryable: bool = False,
    ) -> None:
        self.state["errors"].append({
            "code": code,
            "message": message[:1000],
            "url": url,
            "retryable": retryable,
        })


def run_scrapy_collection(
    request_value: object,
    load_approved_source: Callable[[str, str], dict[str, Any] | None],
    enforce_conditions: Callable[[dict[str, Any], dict[str, Any]], bool] | None = None,
    *,
    framework: str = "scrapy",
) -> dict[str, Any]:
    request = validate_request(request_value)
    if framework not in ("scrapy", "scrapling") or request["collectorFramework"] != framework:
        raise ValueError("The Python collector framework does not match the request.")
    registry = create_default_registry()
    registration = registry.resolve(framework, request["adapter"]["format"])
    approved_source = verify_approved_request(
        request,
        load_approved_source(request["sourceId"], request["connectorId"]),
        enforce_conditions,
    )
    clear_pinned_addresses()
    validate_public_url(request["sourceBaseUrl"], list(approved_source["allowedHosts"]))

    started = datetime.now(timezone.utc)
    state: dict[str, Any] = {
        "requestCount": 0,
        "pagesVisited": 0,
        "recordsRejected": 0,
        "warnings": [],
        "errors": [],
        "records": [],
        "totalPayloadBytes": 0,
        "nextCursor": None,
    }
    delay = request["limits"]["minimumRequestIntervalMs"] / 1000
    process = CrawlerProcess(settings={
        "ROBOTSTXT_OBEY": True,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "DOWNLOAD_DELAY": delay,
        "DOWNLOAD_TIMEOUT": request["limits"]["timeoutMs"] / 1000,
        "DOWNLOAD_MAXSIZE": request["limits"]["maxResponseBytes"],
        "DOWNLOAD_WARNSIZE": request["limits"]["maxResponseBytes"],
        "TWISTED_DNS_RESOLVER": "oppsift_collectors.scrapy_engine.spider.ApprovedHostnameResolver",
        "RETRY_ENABLED": False,
        "REDIRECT_ENABLED": False,
        "METAREFRESH_ENABLED": False,
        "HTTPERROR_ALLOW_ALL": True,
        "DOWNLOADER_MIDDLEWARES": {
            "oppsift_collectors.scrapy_engine.spider.ApprovedDestinationMiddleware": 550,
        },
        "LOG_ENABLED": False,
        "TELNETCONSOLE_ENABLED": False,
        "USER_AGENT": "OppSiftCollector/0.1 (+source contact per source terms)",
    })
    process.crawl(
        ApprovedCollectorSpider,
        request_data=request,
        state=state,
        framework=framework,
    )
    process.start()
    completed = datetime.now(timezone.utc)
    if state["pagesVisited"] < request["limits"]["maxPages"] and state["requestCount"] >= request["limits"]["maxRequests"]:
        state["warnings"].append("Maximum HTTP request limit reached.")
    next_cursor = state["nextCursor"] or next(iter(state["pendingUrls"]), None)
    result = {
        "contractVersion": "1.0",
        "sourceId": request["sourceId"],
        "jobId": request["jobId"],
        "ingestionRunId": request["ingestionRunId"],
        "connectorId": request["connectorId"],
        "collectorFramework": framework,
        "collectorVersion": f"{framework}@{registration.package_version}",
        "startedAt": started.isoformat().replace("+00:00", "Z"),
        "completedAt": completed.isoformat().replace("+00:00", "Z"),
        "requestCount": state["requestCount"],
        "pagesVisited": state["pagesVisited"],
        "recordsDiscovered": len(state["records"]),
        "recordsRejected": state["recordsRejected"],
        "warnings": state["warnings"][:200],
        "errors": state["errors"][:200],
        "nextCursor": next_cursor,
        "records": state["records"],
    }
    return assert_result_matches_request(request, validate_result(result))


def _header(response: Response, name: str) -> str | None:
    value = response.headers.get(name)
    return value.decode("latin-1") if value is not None else None
