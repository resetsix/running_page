"""Helpers for parsing environment variables consistently."""

from __future__ import annotations

import os

TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"", "0", "false", "no", "off"}


def env_bool(name: str, default: bool = False) -> bool:
    """Return an explicitly parsed boolean environment variable.

    Unknown values fall back to *default* instead of relying on Python's
    truthiness for non-empty strings (where ``"False"`` would be true).
    """

    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    value = raw_value.strip().lower()
    if value in TRUE_VALUES:
        return True
    if value in FALSE_VALUES:
        return False
    return default
