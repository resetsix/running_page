import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import useLabels from '@/hooks/useLabels';

interface LayoutProps extends React.PropsWithChildren {
  flushBottom?: boolean;
  headerCenter?: React.ReactNode;
  stickyHeader?: boolean;
}

const Layout = ({
  children,
  flushBottom = false,
  headerCenter,
  stickyHeader = true,
}: LayoutProps) => {
  const { siteTitle, description } = useSiteMetadata();
  const labels = useLabels();

  return (
    <>
      <Helmet>
        <html lang={labels.htmlLang} />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={labels.metaKeywords} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Helmet>
      <Header center={headerCenter} sticky={stickyHeader} />
      <div
        className={
          flushBottom
            ? 'mx-auto max-w-screen-2xl p-4 pb-0 lg:flex lg:p-16 lg:pb-0'
            : 'mx-auto mb-16 max-w-screen-2xl p-4 lg:flex lg:p-16'
        }
      >
        {children}
      </div>
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  flushBottom: PropTypes.bool,
  headerCenter: PropTypes.node,
  stickyHeader: PropTypes.bool,
};

export default Layout;
