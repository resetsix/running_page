import { ComponentType, SVGProps } from 'react';

export type SvgComponent = ComponentType;
export type SvgModule = {
  default: SvgComponent;
};
export type SvgLoaderMap = Record;

const FailedLoadSvg: SvgComponent = () => {
  console.log('Failed to load SVG component');
  return <div></div>;
};

export const loadSvgComponent = async (
  stats: SvgLoaderMap,
  path: string
): Promise => {
  try {
    const module = await stats[path]();
    return { default: module as SvgComponent };
  } catch (error) {
    console.error(error);
    return { default: FailedLoadSvg };
  }
};
