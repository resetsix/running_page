import {
  NAV_SUMMARY_LABEL,
  SITE_DESCRIPTION,
} from '@/utils/const';

interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const getBasePath = () => {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === '/' ? '' : baseUrl;
};

const data: ISiteMetadataResult = {
  siteTitle: 'Resetsix Running',
  siteUrl: '/',
  logo: `${getBasePath()}/images/favicon.png`,
  description: SITE_DESCRIPTION,
  navLinks: [
    {
      name: NAV_SUMMARY_LABEL,
      url: `${getBasePath()}/summary`,
    },
  ],
};

export default data;
