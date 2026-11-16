from dataclasses import dataclass
from importlib.metadata import version
from typing import Literal


@dataclass(frozen=True)
class CollectorRegistration:
    framework: Literal["scrapy", "scrapling"]
    runtime: Literal["python"]
    package_version: str
    supported_formats: tuple[Literal["html", "xml"], ...]
    transport: str
    extractor: str


class CollectorRegistry:
    def __init__(self) -> None:
        self._registrations: dict[str, CollectorRegistration] = {}

    def register(self, registration: CollectorRegistration) -> None:
        if registration.framework in self._registrations:
            raise ValueError(f'Collector "{registration.framework}" is already registered.')
        self._registrations[registration.framework] = registration

    def resolve(self, framework: str, content_format: str) -> CollectorRegistration:
        registration = self._registrations.get(framework)
        if not registration or content_format not in registration.supported_formats:
            raise ValueError("No compatible Python collector is registered for this source.")
        return registration

    def list(self) -> tuple[CollectorRegistration, ...]:
        return tuple(self._registrations.values())


def create_default_registry() -> CollectorRegistry:
    registry = CollectorRegistry()
    registry.register(CollectorRegistration(
        framework="scrapy",
        runtime="python",
        package_version=version("Scrapy"),
        supported_formats=("html", "xml"),
        transport="scrapy-bounded-http",
        extractor="parsel-css-xpath",
    ))
    registry.register(CollectorRegistration(
        framework="scrapling",
        runtime="python",
        package_version=version("scrapling"),
        supported_formats=("html",),
        transport="scrapy-bounded-http",
        extractor="scrapling-selector",
    ))
    return registry
