import { ComponentType, SVGProps } from 'react';

export type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>;
export type SvgModule = {
  default: SvgComponent;
};
export type SvgLoaderMap = Record<string, () => Promise<unknown>>;

const FailedLoadSvg: SvgComponent = () => {
  console.log('Failed to load SVG component');
  return <div></div>;
};

export const loadSvgComponent = async (
  stats: SvgLoaderMap,
  path: string
): Promise<SvgModule> => {
  try {
    const module = await stats[path]();
    return { default: module as SvgComponent };
  } catch (error) {
    console.error(error);
    return { default: FailedLoadSvg };
  }
};
