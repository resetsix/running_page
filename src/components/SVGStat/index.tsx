import { lazy, Suspense, useEffect, useMemo } from 'react';
import { totalStat } from '@assets/index';
import { useLanguage } from '@/hooks/useLanguage';
import useLabels from '@/hooks/useLabels';
import { getLocalizedSvgPath } from '@/utils/language';
import { loadSvgComponent } from '@/utils/svgUtils';
import { initSvgColorAdjustments } from '@/utils/colorUtils';

const SVGStat = () => {
  const { language } = useLanguage();
  const labels = useLabels();
  const GithubSvg = useMemo(
    () =>
      lazy(() =>
        loadSvgComponent(totalStat, getLocalizedSvgPath('./github.svg', language))
      ),
    [language]
  );
  const GridSvg = useMemo(
    () =>
      lazy(() =>
        loadSvgComponent(totalStat, getLocalizedSvgPath('./grid.svg', language))
      ),
    [language]
  );

  useEffect(() => {
    // Initialize SVG color adjustments when component mounts
    const timer = setTimeout(() => {
      initSvgColorAdjustments();
    }, 100); // Small delay to ensure SVG is rendered

    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="svgStat">
      <Suspense fallback={<div className="text-center">{labels.loadingText}</div>}>
        <GithubSvg className="github-svg mt-4 h-auto w-full" />
        <GridSvg className="grid-svg mt-4 h-auto w-full" />
      </Suspense>
    </div>
  );
};

export default SVGStat;
