import json
from functools import lru_cache

from config import HIDDEN_ACTIVITY_DATES_FILE


@lru_cache(maxsize=1)
def load_hidden_activity_dates():
    try:
        with open(HIDDEN_ACTIVITY_DATES_FILE, "r", encoding="utf-8") as f:
            dates = json.load(f)
    except FileNotFoundError:
        return set()

    return {date.strip() for date in dates if isinstance(date, str) and date.strip()}


def is_hidden_activity_date(start_date_local):
    if not start_date_local:
        return False
    return str(start_date_local)[:10] in load_hidden_activity_dates()
