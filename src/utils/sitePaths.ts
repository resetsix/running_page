const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const getBasePath = (): string => {
  const baseUrl = import.meta.env.BASE_URL || '/';

  if (baseUrl === '/') {
    return '';
  }

  const trimmedBaseUrl = trimSlashes(baseUrl);

  return trimmedBaseUrl ? `/${trimmedBaseUrl}` : '';
};

export const getSiteAssetPath = (path: string): string => {
  const normalizedPath = trimSlashes(path);
  const basePath = getBasePath();

  return basePath ? `${basePath}/${normalizedPath}` : `/${normalizedPath}`;
};
