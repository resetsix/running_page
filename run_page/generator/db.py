import datetime
import random
import string

from geopy.geocoders import options, Nominatim
from sqlalchemy import (
    Column,
    Float,
    Integer,
    Interval,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

KEEP_GPX_DUPLICATE_NAME = "gpx from keep"
KEEP_DUPLICATE_SECONDS = 5
KEEP_DUPLICATE_DISTANCE_RATIO = 0.08


# random user name 8 letters
def randomword():
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for i in range(4))


options.default_user_agent = "running_page"
# reverse the location (lat, lon) -> location detail
g = Nominatim(user_agent=randomword())


ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "type",
    "subtype",
    "start_date",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "average_heartrate",
    "average_speed",
    "elevation_gain",
]


class Activity(Base):
    __tablename__ = "activities"

    run_id = Column(Integer, primary_key=True)
    name = Column(String)
    distance = Column(Float)
    moving_time = Column(Interval)
    elapsed_time = Column(Interval)
    type = Column(String)
    subtype = Column(String)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    average_heartrate = Column(Float)
    average_speed = Column(Float)
    elevation_gain = Column(Float)
    streak = None

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        if self.streak:
            out["streak"] = self.streak

        return out


def _activity_name(activity):
    return str(getattr(activity, "name", "") or "").strip().lower()


def _activity_type(activity):
    return str(getattr(activity, "type", "") or "").strip().lower()


def _activity_distance(activity):
    return float(getattr(activity, "distance", 0) or 0)


def _parse_activity_datetime(value):
    if isinstance(value, datetime.datetime):
        return value

    if isinstance(value, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.datetime.strptime(value, fmt)
            except ValueError:
                continue

    return None


def _activity_start_date_local(activity):
    value = getattr(activity, "start_date_local", None)
    return _parse_activity_datetime(value)


def is_gpx_from_keep_activity(activity):
    return _activity_name(activity) == KEEP_GPX_DUPLICATE_NAME


def is_keep_source_activity(activity):
    name = _activity_name(activity)
    return name.endswith(" from keep") and name != KEEP_GPX_DUPLICATE_NAME


def are_same_keep_activity(left, right):
    if not left or not right:
        return False

    if _activity_type(left) != _activity_type(right):
        return False

    left_start = _activity_start_date_local(left)
    right_start = _activity_start_date_local(right)
    if not left_start or not right_start:
        return False

    if abs((left_start - right_start).total_seconds()) > KEEP_DUPLICATE_SECONDS:
        return False

    left_distance = _activity_distance(left)
    right_distance = _activity_distance(right)
    baseline = max(left_distance, right_distance, 1.0)
    return (
        abs(left_distance - right_distance) / baseline
        <= KEEP_DUPLICATE_DISTANCE_RATIO
    )


def _same_day_candidates(session, activity):
    activity_type = getattr(activity, "type", None)
    filters = []

    if activity_type:
        filters.append(Activity.type == activity_type)

    start_date_local = _activity_start_date_local(activity)
    if start_date_local:
        filters.append(
            Activity.start_date_local.like(f"{start_date_local.strftime('%Y-%m-%d')}%")
        )

    query = session.query(Activity)
    if filters:
        query = query.filter(*filters)
    return query.all()


def _find_keep_duplicate_matches(session, activity, duplicate_kind):
    matches = []
    activity_id = getattr(activity, "id", None)
    for candidate in _same_day_candidates(session, activity):
        if activity_id is not None and str(getattr(candidate, "run_id", "")) == str(
            activity_id
        ):
            continue

        if duplicate_kind == "keep" and not is_keep_source_activity(candidate):
            continue
        if duplicate_kind == "gpx" and not is_gpx_from_keep_activity(candidate):
            continue

        if are_same_keep_activity(candidate, activity):
            matches.append(candidate)

    return matches


def resolve_keep_gpx_duplicates(session, activity):
    if is_gpx_from_keep_activity(activity):
        return bool(_find_keep_duplicate_matches(session, activity, "keep")), []

    if not is_keep_source_activity(activity):
        return False, []

    duplicates = _find_keep_duplicate_matches(session, activity, "gpx")
    for duplicate in duplicates:
        session.delete(duplicate)

    return False, duplicates


def cleanup_keep_gpx_duplicates(session):
    removed_ids = []
    gpx_activities = (
        session.query(Activity)
        .filter(Activity.name == KEEP_GPX_DUPLICATE_NAME)
        .order_by(Activity.start_date_local)
        .all()
    )

    for gpx_activity in gpx_activities:
        keep_matches = _find_keep_duplicate_matches(session, gpx_activity, "keep")
        if not keep_matches:
            continue

        removed_ids.append(gpx_activity.run_id)
        session.delete(gpx_activity)

    return removed_ids


def update_or_create_activity(session, run_activity):
    created = False
    try:
        should_skip, removed_duplicates = resolve_keep_gpx_duplicates(
            session, run_activity
        )
        if removed_duplicates:
            print(
                f"removed {len(removed_duplicates)} keep gpx duplicate(s) for {run_activity.id}"
            )
        if should_skip:
            print(f"skip duplicate keep gpx activity {run_activity.id}")
            return False

        activity = (
            session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
        )

        current_elevation_gain = 0.0  # default value

        # https://github.com/stravalib/stravalib/blob/main/src/stravalib/strava_model.py#L639C1-L643C41
        if (
            hasattr(run_activity, "total_elevation_gain")
            and run_activity.total_elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.total_elevation_gain)
        elif (
            hasattr(run_activity, "elevation_gain")
            and run_activity.elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.elevation_gain)

        if not activity:
            start_point = run_activity.start_latlng
            location_country = getattr(run_activity, "location_country", "")
            # or China for #176 to fix
            if not location_country and start_point or location_country == "China":
                try:
                    location_country = str(
                        g.reverse(
                            f"{start_point.lat}, {start_point.lon}", language="zh-CN"  # type: ignore
                        )
                    )
                # limit (only for the first time)
                except Exception:
                    try:
                        location_country = str(
                            g.reverse(
                                f"{start_point.lat}, {start_point.lon}",
                                language="zh-CN",  # type: ignore
                            )
                        )
                    except Exception:
                        pass

            activity = Activity(
                run_id=run_activity.id,
                name=run_activity.name,
                distance=run_activity.distance,
                moving_time=run_activity.moving_time,
                elapsed_time=run_activity.elapsed_time,
                type=run_activity.type,
                subtype=run_activity.subtype,
                start_date=run_activity.start_date,
                start_date_local=run_activity.start_date_local,
                location_country=location_country,
                average_heartrate=run_activity.average_heartrate,
                average_speed=float(run_activity.average_speed),
                elevation_gain=current_elevation_gain,
                summary_polyline=(
                    run_activity.map and run_activity.map.summary_polyline or ""
                ),
            )
            session.add(activity)
            created = True
        else:
            activity.name = run_activity.name
            activity.distance = float(run_activity.distance)
            activity.moving_time = run_activity.moving_time
            activity.elapsed_time = run_activity.elapsed_time
            activity.type = run_activity.type
            activity.subtype = run_activity.subtype
            activity.average_heartrate = run_activity.average_heartrate
            activity.average_speed = float(run_activity.average_speed)
            activity.elevation_gain = current_elevation_gain
            activity.summary_polyline = (
                run_activity.map and run_activity.map.summary_polyline or ""
            )
    except Exception as e:
        print(f"something wrong with {run_activity.id}")
        print(str(e))

    return created


def add_missing_columns(engine, model):
    inspector = inspect(engine)
    table_name = model.__tablename__
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name not in columns:
            missing_columns.append(column)
    if missing_columns:
        with engine.connect() as conn:
            for column in missing_columns:
                column_type = str(column.type)
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
                    )
                )


def init_db(db_path):
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)

    # check missing columns
    add_missing_columns(engine, Activity)

    sm = sessionmaker(bind=engine)
    session = sm()
    # apply the changes
    session.commit()
    return session
