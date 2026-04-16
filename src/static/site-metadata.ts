import {
  NAV_SETUP_LABEL,
  NAV_SOURCE_LABEL,
  NAV_SUMMARY_LABEL,
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
  description: '个人跑步记录页面，由 Keep、GitHub Actions 与 Netlify 提供支持。',
  navLinks: [
    {
      name: NAV_SUMMARY_LABEL,
      url: `${getBasePath()}/summary`,
    },
    {
      name: NAV_SOURCE_LABEL,
      url: 'https://github.com/resetsix/running_page',
    },
    {
      name: NAV_SETUP_LABEL,
      url: 'https://github.com/resetsix/running_page/blob/master/docs/netlify-deployment.md',
    },
  ],
};

export default data;
