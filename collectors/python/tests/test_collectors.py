from __future__ import annotations

import json
import unittest
from pathlib import Path
from uuid import uuid4

from scrapy.http import HtmlResponse, Request

from oppsift_collectors.adapters.extraction import extract_html_page
from oppsift_collectors.contracts.approval import ApprovalError, verify_approved_request
from oppsift_collectors.contracts.models import (
    CollectorContractError,
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
from oppsift_collectors.runner import run_fixture_collection
from oppsift_collectors.scrapy_engine.spider import (
    ApprovedCollectorSpider,
    ApprovedHostnameResolver,
)

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / "fixtures"
SHARED = ROOT / "shared"


def fixture_request(framework: str = "scrapy") -> dict:
    value = json.loads((SHARED / "fixtures" / "collector-request.json").read_text(encoding="utf-8"))
    value["collectorFramework"] = framework
    return value


def source_approval(request: dict) -> dict:
    return {
        "sourceId": request["sourceId"],
        "connectorId": request["connectorId"],
        "approvalStatus": "approved",
        "reusePermission": "permitted",
        "active": True,
        "allowedHosts": request["allowedHosts"],
        "methods": ["GET"],
        "conditionalConstraintsEnforced": False,
        "minimumRequestIntervalMs": 250,
        "maxRequests": 10,
    }


class CollectorContractTests(unittest.TestCase):
    def test_python_uses_the_same_request_and_result_schema_fixtures_as_typescript(self) -> None:
        request = json.loads((SHARED / "fixtures" / "collector-request.json").read_text(encoding="utf-8"))
        result = json.loads((SHARED / "fixtures" / "collector-result.json").read_text(encoding="utf-8"))
        self.assertEqual(validate_request(request)["contractVersion"], "1.0")
        self.assertEqual(validate_result(result)["collectorFramework"], "cheerio")
        with self.assertRaises(CollectorContractError):
            assert_result_matches_request(
                request,
                {
                    **result,
                    "records": [{
                        **result["records"][0],
                        "canonicalUrl": "https://public.example.org:8443/notices/one",
                    }],
                },
            )
        with self.assertRaises(CollectorContractError):
            validate_request({**request, "sourceId": "not-a-uuid"})

    def test_approval_and_public_url_policies_fail_closed(self) -> None:
        request = fixture_request()
        with self.assertRaises(ApprovalError):
            verify_approved_request(request, None)
        with self.assertRaises(DestinationPolicyError):
            validate_public_url(
                "https://public.example.org/",
                ["public.example.org"],
                resolver=lambda _host: ["127.0.0.1"],
            )
        with self.assertRaises(DestinationPolicyError):
            validate_public_url(
                "https://unapproved.example.net/",
                ["public.example.org"],
                resolver=lambda _host: ["93.184.216.34"],
            )

    def test_scrapy_resolver_uses_only_the_validated_pinned_address(self) -> None:
        clear_pinned_addresses()
        validate_public_url(
            "https://public.example.org/notices",
            ["public.example.org"],
            resolver=lambda _host: ["93.184.216.34"],
        )
        self.assertEqual(pinned_public_address("public.example.org"), "93.184.216.34")
        resolver = object.__new__(ApprovedHostnameResolver)
        resolved = resolver.getHostByName("public.example.org")
        self.assertTrue(resolved.called)
        self.assertEqual(resolved.result, "93.184.216.34")

    def test_registry_routes_scrapy_and_scrapling_to_python_runtime(self) -> None:
        registry = create_default_registry()
        self.assertEqual(registry.resolve("scrapy", "xml").transport, "scrapy-bounded-http")
        self.assertEqual(registry.resolve("scrapling", "html").extractor, "scrapling-selector")
        with self.assertRaises(ValueError):
            registry.resolve("scrapling", "xml")


class FrameworkAdapterTests(unittest.TestCase):
    def test_scrapy_spider_extracts_a_fixture_response_and_pagination(self) -> None:
        request_data = fixture_request("scrapy")
        state = {
            "requestCount": 0,
            "pagesVisited": 0,
            "recordsRejected": 0,
            "warnings": [],
            "errors": [],
            "records": [],
            "totalPayloadBytes": 0,
        }
        spider = ApprovedCollectorSpider(
            request_data,
            state,
            framework="scrapy",
            resolver=lambda _host: ["93.184.216.34"],
        )
        html = (FIXTURES / "notices.html").read_bytes()
        response = HtmlResponse(
            url=request_data["sourceBaseUrl"],
            request=Request(request_data["sourceBaseUrl"]),
            body=html,
            headers={"Content-Type": "text/html; charset=utf-8"},
            encoding="utf-8",
        )
        followups = list(spider.parse(response))
        self.assertEqual(state["records"][0]["externalRecordId"], "notice-1")
        self.assertEqual(len(followups), 1)
        self.assertEqual(followups[0].url, "https://public.example.org/notices?page=2")

    def test_scrapy_page_cap_preserves_continuation_without_scheduling_extra_request(self) -> None:
        request_data = fixture_request("scrapy")
        request_data["limits"]["maxPages"] = 1
        state = {
            "requestCount": 0,
            "pagesVisited": 0,
            "recordsRejected": 0,
            "warnings": [],
            "errors": [],
            "records": [],
            "totalPayloadBytes": 0,
        }
        spider = ApprovedCollectorSpider(
            request_data,
            state,
            resolver=lambda _host: ["93.184.216.34"],
        )
        response = HtmlResponse(
            url=request_data["sourceBaseUrl"],
            request=Request(request_data["sourceBaseUrl"]),
            body=(FIXTURES / "notices.html").read_bytes(),
            headers={"Content-Type": "text/html; charset=utf-8"},
            encoding="utf-8",
        )
        self.assertEqual(list(spider.parse(response)), [])
        self.assertEqual(state["nextCursor"], "https://public.example.org/notices?page=2")
        self.assertIn("Maximum page limit reached.", state["warnings"])

    def test_scrapling_extractor_handles_malformed_html_missing_fields_and_duplicates(self) -> None:
        request_data = fixture_request("scrapling")
        malformed = """
          <article class="notice">
            <a class="detail" href="/one">Framework
              <span class="id">same-id</span>
            </a>
          </article>
          <article class="notice">
            <span class="id">same-id</span>
            <a class="detail" href="/two">Duplicate</a>
          </article>
        """
        result = extract_html_page(
            request_data,
            malformed,
            request_data["sourceBaseUrl"],
            status=200,
            content_type="text/html",
            fetched_at="2026-03-01T10:00:00Z",
            etag=None,
            last_modified=None,
            extractor="scrapling",
        )
        self.assertGreaterEqual(result["rejectedCount"], 1)
        self.assertTrue(any("Duplicate" in warning for warning in result["warnings"]))
        empty = extract_html_page(
            request_data,
            "",
            request_data["sourceBaseUrl"],
            status=200,
            content_type="text/html",
            fetched_at="2026-03-01T10:00:00Z",
            etag=None,
            last_modified=None,
            extractor="scrapling",
        )
        self.assertEqual(empty["records"], [])

    def test_python_fixture_runner_returns_a_contract_validated_result(self) -> None:
        request_data = fixture_request("scrapy")
        approval = source_approval(request_data)
        result = run_fixture_collection({
            "mode": "fixture",
            "request": request_data,
            "approval": approval,
            "pages": {
                request_data["sourceBaseUrl"]: {
                    "contentType": "text/html; charset=utf-8",
                    "body": (FIXTURES / "notices.html").read_text(encoding="utf-8"),
                },
                "https://public.example.org/notices?page=2": {
                    "contentType": "text/html",
                    "body": "<article class='notice'><span class='id'>notice-2</span><a class='detail' href='/notices/2'>Another notice</a></article>",
                },
            },
        })
        self.assertEqual(result["pagesVisited"], 2)
        self.assertEqual(result["recordsDiscovered"], 2)
        self.assertEqual(result["records"][1]["externalRecordId"], "notice-2")

    def test_timezone_free_date_text_is_not_invented_as_utc(self) -> None:
        request_data = fixture_request()
        request_data["adapter"]["fields"]["publishedAt"] = {"selector": ".published"}
        html = """
          <article class="notice"><span class="id">date-only</span>
            <a class="detail" href="/date-only">Date-only notice</a>
            <span class="published">2026-03-01</span></article>
          <article class="notice"><span class="id">timestamp</span>
            <a class="detail" href="/timestamp">Timestamp notice</a>
            <span class="published">2026-03-01T10:00:00+01:00</span></article>
        """
        result = extract_html_page(
            request_data,
            html,
            request_data["sourceBaseUrl"],
            status=200,
            content_type="text/html",
            fetched_at="2026-03-01T10:00:00Z",
            etag=None,
            last_modified=None,
            extractor="scrapy",
        )
        self.assertIsNone(result["records"][0]["publishedAt"])
        self.assertEqual(result["records"][1]["publishedAt"], "2026-03-01T09:00:00Z")

    def test_invalid_fixture_mode_and_conditional_terms_are_rejected(self) -> None:
        with self.assertRaises(ValueError):
            run_fixture_collection({"mode": "network"})
        request_data = fixture_request()
        request_data["constraints"].update({
            "approvalStatus": "approved_with_constraints",
            "reusePermission": "conditional",
            "conditionalConstraintsEnforced": True,
        })
        source = source_approval(request_data)
        source.update({
            "approvalStatus": "approved_with_constraints",
            "reusePermission": "conditional",
            "conditionalConstraintsEnforced": True,
        })
        with self.assertRaises(ApprovalError):
            verify_approved_request(request_data, source)


if __name__ == "__main__":
    unittest.main()
