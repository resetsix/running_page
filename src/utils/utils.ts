import * as mapboxPolyline from '@mapbox/polyline';
import gcoord from 'gcoord';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import { RPGeometry } from '@/static/run_countries';
import { chinaCities } from '@/static/city';
import {
  MAIN_COLOR,
  MUNICIPALITY_CITIES_ARR,
  NEED_FIX_MAP,
  RICH_TITLE,
  CYCLING_COLOR,
  HIKING_COLOR,
  WALKING_COLOR,
  SWIMMING_COLOR,
  INDOOR_COLOR,
  getRuntimeRunColor,
  RUN_TRAIL_COLOR,
  MAP_TILE_STYLES,
  MAP_TILE_STYLE_DARK,
  NO_MAP_DATA_FOR_RUN,
  TOTAL_FILTER_KEY,
} from './const';
import type { UIText } from './const';
import {
  FeatureCollection,
  LineString,
  Feature,
  GeoJsonProperties,
} from 'geojson';
import { getMapThemeFromCurrentTheme } from '@/hooks/useTheme';

export type Coordinate = [number, number];

export type RunIds = Array<number> | [];

// Check for units environment variable
const IS_IMPERIAL = import.meta.env.VITE_USE_IMPERIAL === 'true';
export const M_TO_DIST = IS_IMPERIAL ? 1609.344 : 1000; // Meters to Mi or Km
export const M_TO_ELEV = IS_IMPERIAL ? 3.28084 : 1; // Meters to Feet or Meters
export const DIST_UNIT = IS_IMPERIAL ? 'mi' : 'km'; // Label
export const ELEV_UNIT = IS_IMPERIAL ? 'ft' : 'm'; // Label

export interface Activity {
  run_id: number;
  name: string;
  distance: number;
  moving_time: string;
  type: string;
  subtype: string;
  start_date: string;
  start_date_local: string;
  location_country?: string | null;
  summary_polyline?: string | null;
  average_heartrate?: number | null;
  elevation_gain: number | null;
  average_speed: number;
  streak: number;
}

const KEEP_GPX_DUPLICATE_NAME = 'gpx from keep';
const KEEP_DUPLICATE_MS = 5_000;
const KEEP_DUPLICATE_DISTANCE_RATIO = 0.08;

type LocalizedRunTitleKey =
  | 'full_marathon'
  | 'half_marathon'
  | 'late_night_run'
  | 'morning_run'
  | 'forenoon_run'
  | 'midday_run'
  | 'afternoon_run'
  | 'evening_run'
  | 'night_run'
  | 'run_generic'
  | 'run_trail'
  | 'run_treadmill'
  | 'hiking'
  | 'cycling'
  | 'walking'
  | 'swimming'
  | 'skiing';

type RunTitleLabels = Pick<UIText, 'runTitles' | 'activityTypes' | 'cityNames'>;

const titleForShow = (run: Activity): string => {
  const date = run.start_date_local.slice(0, 11);
  const distance = (run.distance / M_TO_DIST).toFixed(2);
  let name = 'Run';
  if (run.name.slice(0, 7) === 'Running') {
    name = 'run';
  }
  if (run.name) {
    name = run.name;
  }
  return `${name} ${date} ${distance} ${DIST_UNIT} ${
    !run.summary_polyline ? NO_MAP_DATA_FOR_RUN : ''
  }`;
};

const formatPace = (d: number): string => {
  if (Number.isNaN(d)) return '0';
  const pace = (M_TO_DIST / 60.0) * (1.0 / d);
  const minutes = Math.floor(pace);
  const seconds = Math.floor((pace - minutes) * 60.0);
  return `${minutes}'${seconds.toFixed(0).toString().padStart(2, '0')}"`;
};

const convertMovingTime2Sec = (moving_time: string): number => {
  if (!moving_time) {
    return 0;
  }
  // moving_time : '2 days, 12:34:56' or '12:34:56';
  const splits = moving_time.split(', ');
  const days = splits.length == 2 ? parseInt(splits[0]) : 0;
  const time = splits.splice(-1)[0];
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const totalSeconds = ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
  return totalSeconds;
};

const formatRunTime = (moving_time: string): string => {
  const totalSeconds = convertMovingTime2Sec(moving_time);
  const seconds = totalSeconds % 60;
  const minutes = (totalSeconds - seconds) / 60;
  if (minutes === 0) {
    return seconds + 's';
  }
  return minutes + 'min';
};

// for scroll to the map
const scrollToMap = () => {
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const extractCities = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(市|自治州|特别行政区|盟|地区))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
};

const extractDistricts = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(区|县))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
};

const extractCoordinate = (str: string): [number, number] | null => {
  const pattern = /'latitude': ([-]?\d+\.\d+).*?'longitude': ([-]?\d+\.\d+)/;
  const match = str.match(pattern);

  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    return [longitude, latitude];
  }

  return null;
};

const extractLocationField = (str: string, field: string): string => {
  const match = str.match(new RegExp(`'${field}':\\s*(None|'([^']+)')`));
  return match?.[2] ?? '';
};

const cities = chinaCities.map((c) => c.name);
const locationCache = new Map<number, ReturnType<typeof locationForRun>>();
// what about oversea?
const locationForRun = (
  run: Activity
): {
  country: string;
  province: string;
  city: string;
  coordinate: [number, number] | null;
} => {
  if (locationCache.has(run.run_id)) {
    return locationCache.get(run.run_id)!;
  }
  let location = run.location_country;
  let [city, province, country] = ['', '', ''];
  let coordinate = null;
  if (location) {
    // Only for Chinese now
    // should filter 臺灣
    const cityMatch = extractCities(location);
    const provinceMatch = location.match(/[\u4e00-\u9fa5]{2,}(省|自治区)/);

    if (cityMatch) {
      city = cities.find((value) => cityMatch.includes(value)) as string;

      if (!city) {
        city = '';
      }
    }
    if (provinceMatch) {
      [province] = provinceMatch;
      // try to extract city coord from location_country info
      coordinate = extractCoordinate(location);
    }
    const l = location.split(',');
    // or to handle keep location format
    let countryMatch = l[l.length - 1].match(
      /[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/
    );
    if (!countryMatch && l.length >= 3) {
      countryMatch = l[2].match(/[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/);
    }
    if (countryMatch) {
      [country] = countryMatch;
    }
  }
  if (MUNICIPALITY_CITIES_ARR.includes(city)) {
    province = city;
    if (location) {
      const districtMatch = extractDistricts(location);
      if (districtMatch.length > 0) {
        city = districtMatch[districtMatch.length - 1];
      }
    }
  }

  const r = { country, province, city, coordinate };
  locationCache.set(run.run_id, r);
  return r;
};

const getDisplayLocationForRun = (run: Activity): string => {
  const { city, province, country } = locationForRun(run);

  if (city) {
    return city;
  }

  if (province) {
    return province;
  }

  if (country) {
    return country;
  }

  if (!run.location_country) {
    return '';
  }

  const fallbackLocation =
    extractLocationField(run.location_country, 'city') ||
    extractLocationField(run.location_country, 'province') ||
    extractLocationField(run.location_country, 'country');

  if (fallbackLocation) {
    return fallbackLocation;
  }

  return run.location_country
    .replace(/^\{+|\}+$/g, '')
    .replace(/'latitude':\s*[-]?\d+\.\d+,?\s*/g, '')
    .replace(/'longitude':\s*[-]?\d+\.\d+,?\s*/g, '')
    .trim();
};

const intComma = (x = '') => {
  if (x.toString().length <= 5) {
    return x;
  }
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const pathForRun = (run: Activity): Coordinate[] => {
  try {
    if (!run.summary_polyline) {
      return [];
    }
    const c = mapboxPolyline.decode(run.summary_polyline);
    // reverse lat long for mapbox
    c.forEach((arr) => {
      [arr[0], arr[1]] = !NEED_FIX_MAP
        ? [arr[1], arr[0]]
        : gcoord.transform([arr[1], arr[0]], gcoord.GCJ02, gcoord.WGS84);
    });
    // try to use location city coordinate instead , if runpath is incomplete
    if (c.length === 2 && String(c[0]) === String(c[1])) {
      const { coordinate } = locationForRun(run);
      if (coordinate?.[0] && coordinate?.[1]) {
        return [coordinate, coordinate];
      }
    }
    return c;
  } catch (_err) {
    return [];
  }
};

const normalizeActivitySportType = (type: string): string => {
  const rawType = type.trim();
  const normalized = rawType.toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized === 'run' || normalized === 'running' || normalized === 'virtualrun') {
    return 'running';
  }

  if (normalized === 'ride' || normalized === 'cycling') {
    return 'cycling';
  }

  if (normalized === 'walk' || normalized === 'walking') {
    return 'walking';
  }

  if (normalized === 'hike' || normalized === 'hiking') {
    return 'hiking';
  }

  if (normalized === 'swim' || normalized === 'swimming') {
    return 'swimming';
  }

  if (normalized.includes('skiing') || normalized === 'ski') {
    return 'skiing';
  }

  return rawType;
};

const isGpxFromKeepActivity = (activity: Activity): boolean =>
  activity.name.trim().toLowerCase() === KEEP_GPX_DUPLICATE_NAME;

const isCanonicalKeepActivity = (activity: Activity): boolean => {
  const name = activity.name.trim().toLowerCase();
  return name.endsWith(' from keep') && name !== KEEP_GPX_DUPLICATE_NAME;
};

const areSameKeepActivity = (left: Activity, right: Activity): boolean => {
  if (normalizeActivitySportType(left.type) !== normalizeActivitySportType(right.type)) {
    return false;
  }

  const leftStart = new Date(left.start_date_local.replace(' ', 'T')).getTime();
  const rightStart = new Date(right.start_date_local.replace(' ', 'T')).getTime();
  if (Number.isNaN(leftStart) || Number.isNaN(rightStart)) {
    return false;
  }

  if (Math.abs(leftStart - rightStart) > KEEP_DUPLICATE_MS) {
    return false;
  }

  const baseline = Math.max(left.distance, right.distance, 1);
  return (
    Math.abs(left.distance - right.distance) / baseline <=
    KEEP_DUPLICATE_DISTANCE_RATIO
  );
};

const dedupeKeepGpxActivities = (activities: Activity[]): Activity[] =>
  activities.reduce<Activity[]>((deduped, activity) => {
    const duplicateIndex = deduped.findIndex((candidate) => {
      const isKeepPair =
        (isCanonicalKeepActivity(candidate) && isGpxFromKeepActivity(activity)) ||
        (isGpxFromKeepActivity(candidate) && isCanonicalKeepActivity(activity));

      return isKeepPair && areSameKeepActivity(candidate, activity);
    });

    if (duplicateIndex === -1) {
      deduped.push(activity);
      return deduped;
    }

    if (
      isCanonicalKeepActivity(activity) &&
      isGpxFromKeepActivity(deduped[duplicateIndex])
    ) {
      deduped[duplicateIndex] = activity;
    }

    return deduped;
  }, []);

const colorForRun = (run: Activity): string => {
  const dynamicRunColor = getRuntimeRunColor();
  const normalizedType = normalizeActivitySportType(run.type);

  switch (normalizedType) {
    case 'running': {
      if (run.type === 'VirtualRun') {
        return INDOOR_COLOR;
      }
      if (run.subtype === 'indoor' || run.subtype === 'treadmill') {
        return INDOOR_COLOR;
      }
      if (run.subtype === 'trail') {
        return RUN_TRAIL_COLOR;
      } else if (run.subtype === 'generic') {
        return dynamicRunColor;
      }
      return dynamicRunColor;
    }
    case 'cycling':
      return CYCLING_COLOR;
    case 'hiking':
      return HIKING_COLOR;
    case 'walking':
      return WALKING_COLOR;
    case 'swimming':
      return SWIMMING_COLOR;
    default:
      return MAIN_COLOR;
  }
};

const geoJsonForRuns = (runs: Activity[]): FeatureCollection<LineString> => ({
  type: 'FeatureCollection',
  features: runs.map((run) => {
    const points = pathForRun(run);
    const color = colorForRun(run);
    return {
      type: 'Feature',
      properties: {
        color: color,
        indoor: run.subtype === 'indoor' || run.subtype === 'treadmill',
      },
      geometry: {
        type: 'LineString',
        coordinates: points,
      },
    };
  }),
});

const geoJsonForMap = async (): Promise<FeatureCollection<RPGeometry>> => {
  const [{ chinaGeojson }, worldGeoJson] = await Promise.all([
    import('@/static/run_countries'),
    import('@surbowl/world-geo-json-zh/world.zh.json'),
  ]);

  return {
    type: 'FeatureCollection',
    features: [
      ...worldGeoJson.default.features,
      ...chinaGeojson.features,
    ] as Feature<RPGeometry, GeoJsonProperties>[],
  };
};

const getActivitySportKey = (act: Activity): LocalizedRunTitleKey | '' => {
  const normalizedType = normalizeActivitySportType(act.type);

  if (normalizedType === 'running') {
    if (act.subtype === 'generic') {
      const runDistance = act.distance / 1000;
      if (runDistance > 20 && runDistance < 40) {
        return 'half_marathon';
      }
      if (runDistance >= 40) {
        return 'full_marathon';
      }
      return 'run_generic';
    }

    if (act.subtype === 'trail') {
      return 'run_trail';
    }

    if (act.subtype === 'treadmill') {
      return 'run_treadmill';
    }

    return 'run_generic';
  }

  if (normalizedType === 'hiking') {
    return 'hiking';
  }

  if (normalizedType === 'cycling') {
    return 'cycling';
  }

  if (normalizedType === 'walking') {
    return 'walking';
  }

  if (normalizedType === 'swimming') {
    return 'swimming';
  }

  if (normalizedType === 'skiing') {
    return 'skiing';
  }

  return '';
};

const getLocalizedRunTitle = (
  titleKey: string,
  labels: RunTitleLabels
): string => {
  if (titleKey.startsWith('name:')) {
    return titleKey.slice('name:'.length);
  }

  if (titleKey.startsWith('city:')) {
    const sportMarker = '|sport:';
    const markerIndex = titleKey.indexOf(sportMarker);
    if (markerIndex === -1) {
      return titleKey.slice('city:'.length);
    }

    const city = titleKey.slice('city:'.length, markerIndex);
    const sportKey = titleKey.slice(markerIndex + sportMarker.length);
    const sportTitle = getLocalizedRunTitle(sportKey, labels);
    const cityName = labels.cityNames[city] ?? city;
    return `${cityName} ${sportTitle}`.trim();
  }

  switch (titleKey) {
    case 'full_marathon':
      return labels.runTitles.FULL_MARATHON_RUN_TITLE;
    case 'half_marathon':
      return labels.runTitles.HALF_MARATHON_RUN_TITLE;
    case 'late_night_run':
      return labels.runTitles.LATE_NIGHT_RUN_TITLE;
    case 'morning_run':
      return labels.runTitles.MORNING_RUN_TITLE;
    case 'forenoon_run':
      return labels.runTitles.FORENOON_RUN_TITLE;
    case 'midday_run':
      return labels.runTitles.MIDDAY_RUN_TITLE;
    case 'afternoon_run':
      return labels.runTitles.AFTERNOON_RUN_TITLE;
    case 'evening_run':
      return labels.runTitles.EVENING_RUN_TITLE;
    case 'night_run':
      return labels.runTitles.NIGHT_RUN_TITLE;
    case 'run_generic':
      return labels.activityTypes.RUN_GENERIC_TITLE;
    case 'run_trail':
      return labels.activityTypes.RUN_TRAIL_TITLE;
    case 'run_treadmill':
      return labels.activityTypes.RUN_TREADMILL_TITLE;
    case 'hiking':
      return labels.activityTypes.HIKING_TITLE;
    case 'cycling':
      return labels.activityTypes.CYCLING_TITLE;
    case 'walking':
      return labels.activityTypes.WALKING_TITLE;
    case 'swimming':
      return labels.activityTypes.SWIMMING_TITLE;
    case 'skiing':
      return labels.activityTypes.SKIING_TITLE;
    default:
      return titleKey;
  }
};

const titleKeyForRun = (run: Activity): string => {
  const activitySportKey = getActivitySportKey(run);

  if (activitySportKey && activitySportKey !== 'run_generic') {
    return activitySportKey;
  }

  if (RICH_TITLE) {
    if (run.name !== '') {
      return `name:${run.name}`;
    }

    const { city } = locationForRun(run);
    if (city && city.length > 0 && activitySportKey.length > 0) {
      return `city:${city}|sport:${activitySportKey}`;
    }
  }

  const runDistance = run.distance / 1000;
  const runHour = +run.start_date_local.slice(11, 13);
  if (runDistance > 20 && runDistance < 40) {
    return 'half_marathon';
  }
  if (runDistance >= 40) {
    return 'full_marathon';
  }
  if (runHour <= 4) {
    return 'late_night_run';
  }
  if (runHour <= 8) {
    return 'morning_run';
  }
  if (runHour <= 10) {
    return 'forenoon_run';
  }
  if (runHour <= 13) {
    return 'midday_run';
  }
  if (runHour <= 17) {
    return 'afternoon_run';
  }
  if (runHour <= 19) {
    return 'evening_run';
  }
  return 'night_run';
};

const titleForRun = (run: Activity, labels: RunTitleLabels): string => {
  return getLocalizedRunTitle(titleKeyForRun(run), labels);
};

export interface IViewState {
  longitude?: number;
  latitude?: number;
  zoom?: number;
}

type GeoBounds = [Coordinate, Coordinate];

const DEFAULT_MAP_BOUNDS: GeoBounds = [
  [-180, -85],
  [180, 85],
];

const getBoundsForCoordinates = (points: Coordinate[]): GeoBounds | null => {
  if (points.length === 0) {
    return null;
  }

  const pointsLong = points.map((point) => point[0]) as number[];
  const pointsLat = points.map((point) => point[1]) as number[];

  return [
    [Math.min(...pointsLong), Math.min(...pointsLat)],
    [Math.max(...pointsLong), Math.max(...pointsLat)],
  ];
};

const getVisibleRouteBounds = (
  geoData: FeatureCollection<RPGeometry>
): GeoBounds | null => {
  const points = geoData.features.flatMap((feature) => {
    if (feature.geometry.type !== 'LineString') {
      return [];
    }
    return feature.geometry.coordinates as Coordinate[];
  });

  return getBoundsForCoordinates(points);
};

const getVisibleRouteViewState = (
  geoData: FeatureCollection<RPGeometry>,
  padding = 200
): IViewState => {
  const visibleRouteBounds = getVisibleRouteBounds(geoData);
  if (!visibleRouteBounds) {
    return { longitude: 20, latitude: 20, zoom: 3 };
  }

  if (
    String(visibleRouteBounds[0]) === String(visibleRouteBounds[1])
  ) {
    return {
      longitude: visibleRouteBounds[0][0],
      latitude: visibleRouteBounds[0][1],
      zoom: 9,
    };
  }

  const viewState = new WebMercatorViewport({
    width: 800,
    height: 600,
  }).fitBounds(visibleRouteBounds, { padding });

  return {
    longitude: viewState.longitude,
    latitude: viewState.latitude,
    zoom: viewState.zoom,
  };
};

const getBoundsForGeoData = (
  geoData: FeatureCollection<LineString>
): IViewState => {
  const { features } = geoData;
  let points: Coordinate[] = [];
  // find first have data
  for (const f of features) {
    if (f.geometry.coordinates.length) {
      points = f.geometry.coordinates as Coordinate[];
      break;
    }
  }
  if (points.length === 0) {
    return { longitude: 20, latitude: 20, zoom: 3 };
  }
  if (points.length === 2 && String(points[0]) === String(points[1])) {
    return { longitude: points[0][0], latitude: points[0][1], zoom: 9 };
  }
  const cornersLongLat =
    getBoundsForCoordinates(points) ?? DEFAULT_MAP_BOUNDS;
  const viewState = new WebMercatorViewport({
    width: 800,
    height: 600,
  }).fitBounds(cornersLongLat, { padding: 200 });
  let { longitude, latitude, zoom } = viewState;
  if (features.length > 1) {
    zoom = 11.5;
  }
  return { longitude, latitude, zoom };
};

const filterYearRuns = (run: Activity, year: string) => {
  if (run && run.start_date_local) {
    return run.start_date_local.slice(0, 4) === year;
  }
  return false;
};

const filterCityRuns = (run: Activity, city: string) => {
  if (run && run.location_country) {
    return run.location_country.includes(city);
  }
  return false;
};
const filterTitleRuns = (run: Activity, title: string) =>
  titleKeyForRun(run) === title;

const filterAndSortRuns = (
  activities: Activity[],
  item: string,
  filterFunc: (_run: Activity, _bvalue: string) => boolean,
  sortFunc: (_a: Activity, _b: Activity) => number
) => {
  let s = activities;
  if (item !== TOTAL_FILTER_KEY) {
    s = activities.filter((run) => filterFunc(run, item));
  }
  return s.sort(sortFunc);
};

const sortDateFunc = (a: Activity, b: Activity) => {
  return (
    new Date(b.start_date_local.replace(' ', 'T')).getTime() -
    new Date(a.start_date_local.replace(' ', 'T')).getTime()
  );
};
const sortDateFuncReverse = (a: Activity, b: Activity) => sortDateFunc(b, a);

const getMapStyle = (vendor: string, styleName: string, token: string) => {
  const style = (MAP_TILE_STYLES as any)[vendor][styleName];
  if (!style) {
    return MAP_TILE_STYLES.default;
  }
  if (vendor === 'maptiler' || vendor === 'stadiamaps') {
    return style + token;
  }
  return style;
};

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 768
  ); // Consider small screens as touch devices
};

/**
 * Determines the appropriate map theme based on current settings
 * @returns The map theme style to use
 */
const getMapTheme = (): string => {
  if (typeof window === 'undefined') return MAP_TILE_STYLE_DARK;

  // Check for explicit theme in DOM
  const dataTheme = document.documentElement.getAttribute('data-theme') as
    | 'light'
    | 'dark'
    | null;

  // Check for saved theme in localStorage
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

  // Determine theme based on priority:
  // 1. DOM attribute
  // 2. localStorage
  // 3. Default to dark theme
  if (dataTheme) {
    return getMapThemeFromCurrentTheme(dataTheme);
  } else if (savedTheme) {
    return getMapThemeFromCurrentTheme(savedTheme);
  } else {
    return getMapThemeFromCurrentTheme('dark');
  }
};

export {
  titleForShow,
  formatPace,
  scrollToMap,
  locationForRun,
  getDisplayLocationForRun,
  intComma,
  pathForRun,
  geoJsonForRuns,
  geoJsonForMap,
  getLocalizedRunTitle,
  titleForRun,
  titleKeyForRun,
  filterYearRuns,
  filterCityRuns,
  filterTitleRuns,
  filterAndSortRuns,
  sortDateFunc,
  sortDateFuncReverse,
  getBoundsForGeoData,
  getVisibleRouteBounds,
  getVisibleRouteViewState,
  formatRunTime,
  convertMovingTime2Sec,
  getMapStyle,
  isTouchDevice,
  getMapTheme,
  normalizeActivitySportType,
  dedupeKeepGpxActivities,
};
