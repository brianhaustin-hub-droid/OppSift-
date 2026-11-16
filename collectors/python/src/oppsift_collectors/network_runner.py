from __future__ import annotations

import json
import sys
from typing import Any

from oppsift_collectors.scrapy_engine.spider import run_scrapy_collection


def run_approved_network_collection(input_value: object) -> dict[str, Any]:
    if not isinstance(input_value, dict) or input_value.get("mode") != "approved_network":
        raise ValueError("The Python network runner accepts only approved network requests.")
    request = input_value.get("request")
    approval = input_value.get("approval")
    if not isinstance(approval, dict):
        raise ValueError("The trusted Node host must provide a source approval decision.")
    if not isinstance(request, dict):
        raise ValueError("A collector request is required.")
    return run_scrapy_collection(
        request,
        lambda source_id, connector_id: (
            approval
            if approval.get("sourceId") == source_id
            and approval.get("connectorId") == connector_id
            else None
        ),
        framework=request.get("collectorFramework", "scrapy"),
    )


def main() -> None:
    try:
        input_value = json.load(sys.stdin)
        result = run_approved_network_collection(input_value)
        json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write("\n")
    except Exception as error:
        print(str(error) or "Python collector execution failed.", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
