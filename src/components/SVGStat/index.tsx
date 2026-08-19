import { lazy, useEffect, type LazyExoticComponent } from 'react';
import { totalStat } from '@assets/index';
import { useLanguage } from '@/hooks/useLanguage';
import { getLocalizedSvgPath, type Language } from '@/utils/language';
import {
  loadSvgComponent,
  type SvgComponent,
  type SvgModule,
} from '@/utils/svgUtils';
import { initSvgColorAdjustments } from '@/utils/colorUtils';

type TotalStatComponents = {
  GithubSvg: LazyExoticComponent<SvgComponent>;
  GridSvg: LazyExoticComponent<SvgComponent>;
};

type TotalStatModules = {
  github: Promise<SvgModule>;
  grid: Promise<SvgModule>;
};

const totalStatComponents = new Map<Language, TotalStatComponents>();
const totalStatModules = new Map<Language, TotalStatModules>();

const getTotalStatModules = (language: Language) => {
  const cached = totalStatModules.get(language);
  if (cached) return cached;

  const modules = {
    github: loadSvgComponent(
      totalStat,
      getLocalizedSvgPath('./github.svg', language)
    ),
    grid: loadSvgComponent(
      totalStat,
      getLocalizedSvgPath('./grid.svg', language)
    ),
  };
  totalStatModules.set(language, modules);
  return modules;
};

export const preloadTotalStats = (language: Language) => {
  getTotalStatModules(language);
};

const getTotalStatComponents = (language: Language) => {
  const cached = totalStatComponents.get(language);
  if (cached) return cached;

  const modules = getTotalStatModules(language);
  const components = {
    GithubSvg: lazy(() => modules.github),
    GridSvg: lazy(() => modules.grid),
  };
  totalStatComponents.set(language, components);
  return components;
};

const SVGStat = () => {
  const { language } = useLanguage();
  const { GithubSvg, GridSvg } = getTotalStatComponents(language);

  useEffect(() => {
    // Initialize SVG color adjustments when component mounts
    const timer = setTimeout(() => {
      initSvgColorAdjustments();
    }, 100); // Small delay to ensure SVG is rendered

    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="svgStat">
      <GithubSvg className="github-svg mt-4 h-auto w-full" />
      <GridSvg className="grid-svg mt-4 h-auto w-full" />
    </div>
  );
};

export default SVGStat;
