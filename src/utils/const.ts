import {
  type Language,
  getStoredLanguage,
  isChineseLanguage,
} from '@/utils/language';

// Constants
const MAPBOX_TOKEN =
  // For security reasons, please avoid using the default public token provided by Mapbox as much as possible.
  // Instead, manually add a new token and apply URL restrictions.
  // (please refer to https://github.com/yihong0618/running_page/issues/643#issuecomment-2042668580)
  'pk.eyJ1IjoieWlob25nMDYxOCIsImEiOiJjbWYxdXR4YncwMTJtMm5zOTE4eTZpMGdtIn0.OnsXdwkZFztR8a5Ph_T-xg';
const MUNICIPALITY_CITIES_ARR = [
  '北京市',
  '上海市',
  '天津市',
  '重庆市',
  '香港特别行政区',
  '澳门特别行政区',
];
const MAP_LAYER_LIST = [
  'road-label',
  'waterway-label',
  'natural-line-label',
  'natural-point-label',
  'water-line-label',
  'water-point-label',
  'poi-label',
  'airport-label',
  'settlement-subdivision-label',
  'settlement-label',
  'state-label',
  'country-label',
];

const USE_GOOGLE_ANALYTICS = false;
const GOOGLE_ANALYTICS_TRACKING_ID = '';

// styling: set to `true` if you want dash-line route
const USE_DASH_LINE = true;
// styling: route line opacity: [0, 1]
const LINE_OPACITY = 0.4;
// styling: map height - responsive design
// Use smaller height on mobile devices for better user experience
const MAP_HEIGHT = window.innerWidth <= 768 ? 250 : 600;
//set to `false` if you want to hide the road label characters
const ROAD_LABEL_DISPLAY = true;
// updated on 2024/11/17: privacy mode is set to true by default
//set to `true` if you want to display only the routes without showing the map.
const PRIVACY_MODE = false;
// updated on 2024/11/17: lights are turned off by default
//set to `false` if you want to make light off as default, only effect when `PRIVACY_MODE` = false
const LIGHTS_ON = false;
//set to `true` if you want to show the 'Elevation Gain' column
const SHOW_ELEVATION_GAIN = false;
// richer title for the activity types (like garmin style)
const RICH_TITLE = false;

const CURRENT_LANGUAGE = getStoredLanguage();
const USE_ANIMATION_FOR_GRID = false;
const TOTAL_FILTER_KEY = 'Total';
const CHINESE_INFO_MESSAGE = (yearLength: number, year: string): string => {
  if (year === TOTAL_FILTER_KEY) {
    return `记录自己跑步 ${yearLength} 年了，下面列表展示的是总览数据`;
  }
  return `记录自己跑步 ${yearLength} 年了，下面列表展示的是 ${year} 年的数据`;
};
const ENGLISH_INFO_MESSAGE = (yearLength: number, year: string): string =>
  year === TOTAL_FILTER_KEY
    ? `Running Journey with ${yearLength} Years, the table shows overview data`
    : `Running Journey with ${yearLength} Years, the table shows year ${year} data`;

const getUIText = (language: Language) => {
  const isChinese = isChineseLanguage(language);
  const infoMessage = isChinese ? CHINESE_INFO_MESSAGE : ENGLISH_INFO_MESSAGE;
  const htmlLang = isChinese ? 'zh-CN' : 'en';
  const metaKeywords = isChinese
    ? '跑步, running, 热力图, 运动数据, 地图'
    : 'running, heatmap, activity data, map';
  const siteDescription = isChinese
    ? '个人跑步记录页面，由 Keep、GitHub Actions 与 Netlify 提供支持。'
    : 'Personal running log powered by Keep, GitHub Actions, and Netlify.';
  const totalLabel = isChinese ? '总览' : 'Total';
  const lifeLabel = isChinese ? '生涯' : 'Life';
  const yearFilterLabel = isChinese ? '年份' : 'Year';
  const cityFilterLabel = isChinese ? '城市' : 'City';
  const periodFilterLabel = isChinese ? '时段' : 'Title';
  const runningHeatmapLabel = isChinese ? '跑步热力图' : 'Running Heatmap';
  const journeyLabel = isChinese ? '年度' : 'Journey';
  const runsLabel = isChinese ? '次跑步' : 'Runs';
  const avgPaceLabel = isChinese ? '平均配速' : 'Avg Pace';
  const streakLabel = isChinese ? '连跑' : 'Streak';
  const streakUnitLabel = isChinese ? '天' : 'day';
  const runOccurrencesLabel = isChinese ? '次' : 'Runs';
  const navSummaryLabel = isChinese ? '总览' : 'Summary';
  const navSourceLabel = isChinese ? '源码' : 'Source';
  const navSetupLabel = isChinese ? '部署' : 'Setup';
  const languageZhLabel = '中';
  const languageEnLabel = 'EN';
  const switchToChineseLabel = isChinese ? '当前为中文' : 'Switch to Chinese';
  const switchToEnglishLabel = isChinese ? '切换到英文' : 'Switch to English';
  const locationSummaryYearsLabel = isChinese ? ' 年里我跑过' : ' years of running';
  const locationSummaryCountriesLabel = isChinese ? ' 个国家' : ' countries';
  const locationSummaryProvincesLabel = isChinese ? ' 个省份' : ' provinces';
  const locationSummaryCitiesLabel = isChinese ? ' 个城市' : ' cities';
  const tableElevationLabel = isChinese ? '爬升' : 'Elev';
  const tablePaceLabel = isChinese ? '配速' : 'Pace';
  const tableTimeLabel = isChinese ? '时间' : 'Time';
  const tableDateLabel = isChinese ? '日期' : 'Date';
  const loadingSvgText = isChinese ? '正在加载图表...' : 'Loading SVG...';
  const noMapDataForRun = isChinese
    ? '(该条记录暂无路线数据)'
    : '(No map data for this run)';
  const switchToDarkThemeLabel = isChinese
    ? '切换到深色主题'
    : 'Switch to dark theme';
  const switchToLightThemeLabel = isChinese
    ? '切换到浅色主题'
    : 'Switch to light theme';
  const fitMapLabel = isChinese ? '定位' : 'Fit';
  const fitMapTitle = isChinese
    ? '将地图定位到当前热力路线范围'
    : 'Fit the map to the current route bounds';
  const fullMarathonRunTitle = isChinese ? '全程马拉松' : 'Full Marathon';
  const halfMarathonRunTitle = isChinese ? '半程马拉松' : 'Half Marathon';
  const morningRunTitle = isChinese ? '清晨跑步' : 'Morning Run';
  const middayRunTitle = isChinese ? '午间跑步' : 'Midday Run';
  const afternoonRunTitle = isChinese ? '午后跑步' : 'Afternoon Run';
  const eveningRunTitle = isChinese ? '傍晚跑步' : 'Evening Run';
  const nightRunTitle = isChinese ? '夜晚跑步' : 'Night Run';
  const runGenericTitle = isChinese ? '跑步' : 'Run';
  const runTrailTitle = isChinese ? '越野跑' : 'Trail Run';
  const runTreadmillTitle = isChinese ? '跑步机' : 'Treadmill Run';
  const hikingTitle = isChinese ? '徒步' : 'Hiking';
  const cyclingTitle = isChinese ? '骑行' : 'Cycling';
  const skiingTitle = isChinese ? '滑雪' : 'Skiing';
  const walkingTitle = isChinese ? '步行' : 'Walking';
  const swimmingTitle = isChinese ? '游泳' : 'Swimming';
  const allTitle = isChinese ? '所有' : 'All';
  const activityCountTitle = isChinese ? '活动次数' : 'Activity Count';
  const maxDistanceTitle = isChinese ? '最远距离' : 'Max Distance';
  const maxSpeedTitle = isChinese ? '最快速度' : 'Max Speed';
  const totalTimeTitle = isChinese ? '总时间' : 'Total Time';
  const averageSpeedTitle = isChinese ? '平均速度' : 'Average Speed';
  const totalDistanceTitle = isChinese ? '总距离' : 'Total Distance';
  const averageDistanceTitle = isChinese ? '平均距离' : 'Average Distance';
  const totalElevationGainTitle = isChinese
    ? '总海拔爬升'
    : 'Total Elevation Gain';
  const averageHeartRateTitle = isChinese ? '平均心率' : 'Average Heart Rate';
  const yearlyTitle = isChinese ? '年' : 'Yearly';
  const monthlyTitle = isChinese ? '月' : 'Monthly';
  const weeklyTitle = isChinese ? '周' : 'Weekly';
  const dailyTitle = isChinese ? '日' : 'Daily';
  const locationTitle = isChinese ? '地点' : 'Location';
  const homePageTitle = isChinese ? '总览' : 'Home';
  const loadingText = isChinese ? '加载中...' : 'Loading...';
  const noRouteData = isChinese ? '暂无路线数据' : 'No route data';
  const invalidRouteData = isChinese ? '路线数据无效' : 'Invalid route data';
  const timeHoursLabel = isChinese ? '小时' : 'h';
  const timeMinutesLabel = isChinese ? '分' : 'm';
  const timeSecondsLabel = isChinese ? '秒' : 's';
  const paceMinutesLabel = isChinese ? '分' : 'min';
  const chineseLocationInfoMessages = [
    '跑过了一些地方，希望随着时间推移，点亮的地方越来越多',
    '不要停下来，不要停下奔跑的脚步',
    '别再说明天，就从今天开始',
  ] as const;

  const activityTypes = {
    RUN_GENERIC_TITLE: runGenericTitle,
    RUN_TRAIL_TITLE: runTrailTitle,
    RUN_TREADMILL_TITLE: runTreadmillTitle,
    HIKING_TITLE: hikingTitle,
    CYCLING_TITLE: cyclingTitle,
    SKIING_TITLE: skiingTitle,
    WALKING_TITLE: walkingTitle,
    SWIMMING_TITLE: swimmingTitle,
    ALL_TITLE: allTitle,
  };

  const sportTypeLabels: Record<string, string> = {
    all: allTitle,
    running: runGenericTitle,
    Run: runGenericTitle,
    walking: walkingTitle,
    Walk: walkingTitle,
    cycling: cyclingTitle,
    Ride: cyclingTitle,
    hiking: hikingTitle,
    swimming: swimmingTitle,
    skiing: skiingTitle,
  };

  const runTitles = {
    FULL_MARATHON_RUN_TITLE: fullMarathonRunTitle,
    HALF_MARATHON_RUN_TITLE: halfMarathonRunTitle,
    MORNING_RUN_TITLE: morningRunTitle,
    MIDDAY_RUN_TITLE: middayRunTitle,
    AFTERNOON_RUN_TITLE: afternoonRunTitle,
    EVENING_RUN_TITLE: eveningRunTitle,
    NIGHT_RUN_TITLE: nightRunTitle,
  };

  const activityTotal = {
    ACTIVITY_COUNT_TITLE: activityCountTitle,
    MAX_DISTANCE_TITLE: maxDistanceTitle,
    MAX_SPEED_TITLE: maxSpeedTitle,
    TOTAL_TIME_TITLE: totalTimeTitle,
    AVERAGE_SPEED_TITLE: averageSpeedTitle,
    TOTAL_DISTANCE_TITLE: totalDistanceTitle,
    AVERAGE_DISTANCE_TITLE: averageDistanceTitle,
    TOTAL_ELEVATION_GAIN_TITLE: totalElevationGainTitle,
    AVERAGE_HEART_RATE_TITLE: averageHeartRateTitle,
    YEARLY_TITLE: yearlyTitle,
    MONTHLY_TITLE: monthlyTitle,
    WEEKLY_TITLE: weeklyTitle,
    DAILY_TITLE: dailyTitle,
    LOCATION_TITLE: locationTitle,
  };

  return {
    isChinese,
    infoMessage,
    htmlLang,
    metaKeywords,
    siteDescription,
    totalLabel,
    lifeLabel,
    yearFilterLabel,
    cityFilterLabel,
    periodFilterLabel,
    runningHeatmapLabel,
    journeyLabel,
    runsLabel,
    avgPaceLabel,
    streakLabel,
    streakUnitLabel,
    runOccurrencesLabel,
    navSummaryLabel,
    navSourceLabel,
    navSetupLabel,
    languageZhLabel,
    languageEnLabel,
    switchToChineseLabel,
    switchToEnglishLabel,
    locationSummaryYearsLabel,
    locationSummaryCountriesLabel,
    locationSummaryProvincesLabel,
    locationSummaryCitiesLabel,
    tableElevationLabel,
    tablePaceLabel,
    tableTimeLabel,
    tableDateLabel,
    loadingSvgText,
    noMapDataForRun,
    switchToDarkThemeLabel,
    switchToLightThemeLabel,
    fitMapLabel,
    fitMapTitle,
    runTitles,
    activityTypes,
    activityTotal,
    totalElevationGainTitle,
    averageHeartRateTitle,
    homePageTitle,
    loadingText,
    noRouteData,
    invalidRouteData,
    timeHoursLabel,
    timeMinutesLabel,
    timeSecondsLabel,
    paceMinutesLabel,
    heartRateUnitLabel: 'BPM',
    sportTypeLabels,
    chineseLocationInfoMessages,
  };
};

const UI_TEXT = getUIText(CURRENT_LANGUAGE);
const IS_CHINESE = UI_TEXT.isChinese;
const INFO_MESSAGE = UI_TEXT.infoMessage;
const HTML_LANG = UI_TEXT.htmlLang;
const META_KEYWORDS = UI_TEXT.metaKeywords;
const SITE_DESCRIPTION = UI_TEXT.siteDescription;
const TOTAL_LABEL = UI_TEXT.totalLabel;
const LIFE_LABEL = UI_TEXT.lifeLabel;
const YEAR_FILTER_LABEL = UI_TEXT.yearFilterLabel;
const CITY_FILTER_LABEL = UI_TEXT.cityFilterLabel;
const PERIOD_FILTER_LABEL = UI_TEXT.periodFilterLabel;
const RUNNING_HEATMAP_LABEL = UI_TEXT.runningHeatmapLabel;
const JOURNEY_LABEL = UI_TEXT.journeyLabel;
const RUNS_LABEL = UI_TEXT.runsLabel;
const AVG_PACE_LABEL = UI_TEXT.avgPaceLabel;
const STREAK_LABEL = UI_TEXT.streakLabel;
const STREAK_UNIT_LABEL = UI_TEXT.streakUnitLabel;
const RUN_OCCURRENCES_LABEL = UI_TEXT.runOccurrencesLabel;
const NAV_SUMMARY_LABEL = UI_TEXT.navSummaryLabel;
const NAV_SOURCE_LABEL = UI_TEXT.navSourceLabel;
const NAV_SETUP_LABEL = UI_TEXT.navSetupLabel;
const LANGUAGE_ZH_LABEL = UI_TEXT.languageZhLabel;
const LANGUAGE_EN_LABEL = UI_TEXT.languageEnLabel;
const SWITCH_TO_CHINESE_LABEL = UI_TEXT.switchToChineseLabel;
const SWITCH_TO_ENGLISH_LABEL = UI_TEXT.switchToEnglishLabel;
const LOCATION_SUMMARY_YEARS_LABEL = UI_TEXT.locationSummaryYearsLabel;
const LOCATION_SUMMARY_COUNTRIES_LABEL = UI_TEXT.locationSummaryCountriesLabel;
const LOCATION_SUMMARY_PROVINCES_LABEL =
  UI_TEXT.locationSummaryProvincesLabel;
const LOCATION_SUMMARY_CITIES_LABEL = UI_TEXT.locationSummaryCitiesLabel;
const TABLE_ELEVATION_LABEL = UI_TEXT.tableElevationLabel;
const TABLE_PACE_LABEL = UI_TEXT.tablePaceLabel;
const TABLE_TIME_LABEL = UI_TEXT.tableTimeLabel;
const TABLE_DATE_LABEL = UI_TEXT.tableDateLabel;
const LOADING_SVG_TEXT = UI_TEXT.loadingSvgText;
const NO_MAP_DATA_FOR_RUN = UI_TEXT.noMapDataForRun;
const SWITCH_TO_DARK_THEME_LABEL = UI_TEXT.switchToDarkThemeLabel;
const SWITCH_TO_LIGHT_THEME_LABEL = UI_TEXT.switchToLightThemeLabel;
const RUN_TITLES = UI_TEXT.runTitles;
const ACTIVITY_TYPES = UI_TEXT.activityTypes;
const ACTIVITY_TOTAL = UI_TEXT.activityTotal;
const TOTAL_ELEVATION_GAIN_TITLE = UI_TEXT.totalElevationGainTitle;
const AVERAGE_HEART_RATE_TITLE = UI_TEXT.averageHeartRateTitle;
const HOME_PAGE_TITLE = UI_TEXT.homePageTitle;
const LOADING_TEXT = UI_TEXT.loadingText;
const NO_ROUTE_DATA = UI_TEXT.noRouteData;
const INVALID_ROUTE_DATA = UI_TEXT.invalidRouteData;
const TIME_HOURS_LABEL = UI_TEXT.timeHoursLabel;
const TIME_MINUTES_LABEL = UI_TEXT.timeMinutesLabel;
const TIME_SECONDS_LABEL = UI_TEXT.timeSecondsLabel;
const PACE_MINUTES_LABEL = UI_TEXT.paceMinutesLabel;
const HEART_RATE_UNIT_LABEL = UI_TEXT.heartRateUnitLabel;
const SPORT_TYPE_LABELS = UI_TEXT.sportTypeLabels;
const [
  CHINESE_LOCATION_INFO_MESSAGE_FIRST,
  CHINESE_LOCATION_INFO_MESSAGE_SECOND,
  CHINESE_LOCATION_INFO_MESSAGE_THIRD,
] = UI_TEXT.chineseLocationInfoMessages;

export {
  getUIText,
  USE_GOOGLE_ANALYTICS,
  GOOGLE_ANALYTICS_TRACKING_ID,
  CHINESE_LOCATION_INFO_MESSAGE_FIRST,
  CHINESE_LOCATION_INFO_MESSAGE_SECOND,
  CHINESE_LOCATION_INFO_MESSAGE_THIRD,
  MAPBOX_TOKEN,
  MUNICIPALITY_CITIES_ARR,
  MAP_LAYER_LIST,
  IS_CHINESE,
  CURRENT_LANGUAGE,
  ROAD_LABEL_DISPLAY,
  INFO_MESSAGE,
  HTML_LANG,
  META_KEYWORDS,
  SITE_DESCRIPTION,
  TOTAL_FILTER_KEY,
  TOTAL_LABEL,
  LIFE_LABEL,
  YEAR_FILTER_LABEL,
  CITY_FILTER_LABEL,
  PERIOD_FILTER_LABEL,
  RUNNING_HEATMAP_LABEL,
  JOURNEY_LABEL,
  RUNS_LABEL,
  AVG_PACE_LABEL,
  STREAK_LABEL,
  STREAK_UNIT_LABEL,
  RUN_OCCURRENCES_LABEL,
  NAV_SUMMARY_LABEL,
  NAV_SOURCE_LABEL,
  NAV_SETUP_LABEL,
  LANGUAGE_ZH_LABEL,
  LANGUAGE_EN_LABEL,
  SWITCH_TO_CHINESE_LABEL,
  SWITCH_TO_ENGLISH_LABEL,
  LOCATION_SUMMARY_YEARS_LABEL,
  LOCATION_SUMMARY_COUNTRIES_LABEL,
  LOCATION_SUMMARY_PROVINCES_LABEL,
  LOCATION_SUMMARY_CITIES_LABEL,
  TABLE_ELEVATION_LABEL,
  TABLE_PACE_LABEL,
  TABLE_TIME_LABEL,
  TABLE_DATE_LABEL,
  LOADING_SVG_TEXT,
  NO_MAP_DATA_FOR_RUN,
  SWITCH_TO_DARK_THEME_LABEL,
  SWITCH_TO_LIGHT_THEME_LABEL,
  RUN_TITLES,
  USE_ANIMATION_FOR_GRID,
  USE_DASH_LINE,
  LINE_OPACITY,
  MAP_HEIGHT,
  PRIVACY_MODE,
  LIGHTS_ON,
  SHOW_ELEVATION_GAIN,
  RICH_TITLE,
  ACTIVITY_TYPES,
  ACTIVITY_TOTAL,
  TOTAL_ELEVATION_GAIN_TITLE,
  AVERAGE_HEART_RATE_TITLE,
  HOME_PAGE_TITLE,
  LOADING_TEXT,
  NO_ROUTE_DATA,
  INVALID_ROUTE_DATA,
  TIME_HOURS_LABEL,
  TIME_MINUTES_LABEL,
  TIME_SECONDS_LABEL,
  PACE_MINUTES_LABEL,
  HEART_RATE_UNIT_LABEL,
  SPORT_TYPE_LABELS,
};

const nike = 'rgb(224,237,94)'; // if you want to change the main color, modify this value in src/styles/variables.scss
const dark_vanilla = 'rgb(228,212,220)';

// If your map has an offset please change this line
// issues #92 and #198
export const NEED_FIX_MAP = false;
export const MAIN_COLOR = nike;
export const PROVINCE_FILL_COLOR = '#47b8e0';
export const COUNTRY_FILL_COLOR = dark_vanilla;

// Static color constants
export const RUN_COLOR_LIGHT = '#47b8e0';
export const RUN_COLOR_DARK = MAIN_COLOR;

// Single run animation colors
export const SINGLE_RUN_COLOR_LIGHT = '#52c41a'; // Green for light theme
export const SINGLE_RUN_COLOR_DARK = '#ff4d4f'; // Red for dark theme

// Helper function to get theme-aware RUN_COLOR
export const getRuntimeRunColor = (): string => {
  if (typeof window === 'undefined') return RUN_COLOR_DARK;

  const dataTheme = document.documentElement.getAttribute('data-theme');
  const savedTheme = localStorage.getItem('theme');

  // Determine current theme (default to dark)
  const isDark =
    dataTheme === 'dark' ||
    (!dataTheme && savedTheme === 'dark') ||
    (!dataTheme && !savedTheme);

  return isDark ? RUN_COLOR_DARK : RUN_COLOR_LIGHT;
};

// Helper function to get theme-aware SINGLE_RUN_COLOR
export const getRuntimeSingleRunColor = (): string => {
  if (typeof window === 'undefined') return SINGLE_RUN_COLOR_DARK;

  const dataTheme = document.documentElement.getAttribute('data-theme');
  const savedTheme = localStorage.getItem('theme');

  // Determine current theme (default to dark)
  const isDark =
    dataTheme === 'dark' ||
    (!dataTheme && savedTheme === 'dark') ||
    (!dataTheme && !savedTheme);

  return isDark ? SINGLE_RUN_COLOR_DARK : SINGLE_RUN_COLOR_LIGHT;
};

// Legacy export for backwards compatibility
export const RUN_COLOR = '#47b8e0';
export const RUN_TRAIL_COLOR = 'rgb(255,153,51)';
export const CYCLING_COLOR = 'rgb(51,255,87)';
export const HIKING_COLOR = 'rgb(151,51,255)';
export const WALKING_COLOR = HIKING_COLOR;
export const SWIMMING_COLOR = 'rgb(255,51,51)';
export const INDOOR_COLOR = '#8899aa';

// map tiles vendor, maptiler or mapbox or stadiamaps
// if you want to use maptiler, set the access token in MAP_TILE_ACCESS_TOKEN
export const MAP_TILE_VENDOR = 'mapcn';

// map tiles style name, see MAP_TILE_STYLES for more details
export const MAP_TILE_STYLE_LIGHT = 'osm-bright';
export const MAP_TILE_STYLE_DARK = 'dark-matter';

// access token. you can apply a new one, it's free.
// maptiler: Gt5R0jT8tuIYxW6sNrAg | sign up at https://cloud.maptiler.com/auth/widget
// stadiamaps: 8a769c5a-9125-4936-bdcf-a6b90cb5d0a4 | sign up at https://client.stadiamaps.com/signup/
// mapcn: empty
export const MAP_TILE_ACCESS_TOKEN = '';

export const MAP_TILE_STYLES = {
  mapcn: {
    'osm-bright':
      'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    'osm-liberty':
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    'dark-matter':
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  // Alternative free tile providers for regions where Carto may be blocked
  mapcn_openfreemap: {
    'osm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'dark-matter': 'https://tiles.openfreemap.org/styles/dark',
  },
  mapcn_maptiler_free: {
    // Use free, tokenless styles to avoid requiring an API key
    'osm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'dark-matter': 'https://tiles.openfreemap.org/styles/dark',
  },
  maptiler: {
    'dataviz-light': 'https://api.maptiler.com/maps/dataviz/style.json?key=',
    'dataviz-dark':
      'https://api.maptiler.com/maps/dataviz-dark/style.json?key=',
    'basic-light': 'https://api.maptiler.com/maps/basic-v2/style.json?key=',
    'basic-dark': 'https://api.maptiler.com/maps/basic-v2-dark/style.json?key=',
    'streets-light': 'https://api.maptiler.com/maps/streets-v2/style.json?key=',
    'streets-dark':
      'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=',
    'outdoor-light': 'https://api.maptiler.com/maps/outdoor-v2/style.json?key=',
    'outdoor-dark':
      'https://api.maptiler.com/maps/outdoor-v2-dark/style.json?key=',
    'bright-light': 'https://api.maptiler.com/maps/bright-v2/style.json?key=',
    'bright-dark':
      'https://api.maptiler.com/maps/bright-v2-dark/style.json?key=',
    'topo-light': 'https://api.maptiler.com/maps/topo-v2/style.json?key=',
    'topo-dark': 'https://api.maptiler.com/maps/topo-v2-dark/style.json?key=',
    'winter-light': 'https://api.maptiler.com/maps/winter-v2/style.json?key=',
    'winter-dark':
      'https://api.maptiler.com/maps/winter-v2-dark/style.json?key=',
    hybrid: 'https://api.maptiler.com/maps/hybrid/style.json?key=',
  },

  // https://docs.stadiamaps.com/themes/
  stadiamaps: {
    // light
    alidade_smooth:
      'https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=',
    alidade_smooth_dark:
      'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=',
    alidade_satellite:
      'https://tiles.stadiamaps.com/styles/alidade_satellite.json?api_key=',
  },

  // https://docs.mapbox.com/api/maps/styles/
  mapbox: {
    'dark-v10': 'mapbox://styles/mapbox/dark-v10',
    'dark-v11': 'mapbox://styles/mapbox/dark-v11',
    'light-v10': 'mapbox://styles/mapbox/light-v10',
    'light-v11': 'mapbox://styles/mapbox/light-v11',
    'navigation-night': 'mapbox://styles/mapbox/navigation-night-v1',
    'satellite-streets-v12': 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  default: 'mapbox://styles/mapbox/dark-v10',
};

// Configuration validation
if (typeof window !== 'undefined') {
  // Validate token requirements
  if (MAP_TILE_VENDOR === 'mapcn' && MAP_TILE_ACCESS_TOKEN !== '') {
    console.warn(
      '⚠️ MapCN (Carto) does not require an access token.\n' +
        '💡 You can set MAP_TILE_ACCESS_TOKEN = "" in src/utils/const.ts'
    );
  }

  if (
    ['mapbox', 'maptiler', 'stadiamaps'].includes(MAP_TILE_VENDOR) &&
    MAP_TILE_ACCESS_TOKEN === ''
  ) {
    console.error(
      `❌ ${MAP_TILE_VENDOR.toUpperCase()} requires an access token!\n` +
        `💡 Please set MAP_TILE_ACCESS_TOKEN in src/utils/const.ts\n` +
        `📚 See README.md for instructions on getting a token.\n` +
        `\n` +
        `💡 TIP: Use MAP_TILE_VENDOR = 'mapcn' for free (no token required)`
    );
  }

  // Validate style matches vendor
  const vendorStyles = (MAP_TILE_STYLES as any)[MAP_TILE_VENDOR];
  if (vendorStyles && !vendorStyles[MAP_TILE_STYLE_LIGHT]) {
    console.error(
      `❌ Style "${MAP_TILE_STYLE_LIGHT}" is not valid for vendor "${MAP_TILE_VENDOR}"\n` +
        `💡 Available styles: ${Object.keys(vendorStyles).join(', ')}\n` +
        `📚 Check src/utils/const.ts MAP_TILE_STYLES for valid combinations`
    );
  }

  // Success message for correct MapCN configuration
  if (
    MAP_TILE_VENDOR === 'mapcn' &&
    MAP_TILE_ACCESS_TOKEN === '' &&
    vendorStyles?.[MAP_TILE_STYLE_LIGHT]
  ) {
    console.info(
      '✅ Using MapCN (Carto Basemaps) - Free, no token required!\n' +
        '📖 Attribution: Map tiles © CARTO, Map data © OpenStreetMap contributors\n' +
        '📚 See docs/CARTO_TERMS.md for usage terms'
    );
  }
}
