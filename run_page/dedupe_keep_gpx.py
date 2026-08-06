import argparse
import json

from config import JSON_FILE, SQL_FILE
from generator import Generator

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove confirmed Keep GPX duplicates")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    generator = Generator(SQL_FILE)
    removed_ids = generator.cleanup_keep_gpx_duplicates(commit=not args.dry_run)
    if args.dry_run:
        generator.session.rollback()
    else:
        activities = generator.load()
        with open(JSON_FILE, mode="w", encoding="utf-8") as file:
            json.dump(activities, file)
    generator.session.close()
    print(f"Removed {len(removed_ids)} duplicate Keep GPX activities.")
