import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useLanguage } from '@/hooks/useLanguage';
import useLabels from '@/hooks/useLabels';
import { useTheme, Theme } from '@/hooks/useTheme';
import styles from './style.module.css';

interface HeaderProps {
  center?: ReactNode;
  sticky?: boolean;
}

const DESKTOP_YEAR_TRAVEL = 112;
const DESKTOP_YEAR_INSET_START = 80;
const HEADER_DIRECTION_THRESHOLD = 12;

const Header = ({ center, sticky = true }: HeaderProps) => {
  const { logo, siteUrl, navLinks } = useSiteMetadata();
  const { language, setLanguage } = useLanguage();
  const labels = useLabels();
  const { theme, setTheme } = useTheme();
  const hasCenter = center !== undefined && center !== null;
  const actionsRef = useRef<HTMLDivElement>(null);
  const [desktopYearTravel, setDesktopYearTravel] = useState(() =>
    typeof window === 'undefined'
      ? 0
      : Math.min(window.scrollY, DESKTOP_YEAR_TRAVEL)
  );
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [actionsWidth, setActionsWidth] = useState(0);
  const lastScrollYRef = useRef(
    typeof window === 'undefined' ? 0 : Math.max(window.scrollY, 0)
  );
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const directionStartYRef = useRef(lastScrollYRef.current);

  useEffect(() => {
    let frame: number | null = null;
    const updateHeaderPosition = () => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        const currentScrollY = Math.max(window.scrollY, 0);

        setDesktopYearTravel(
          hasCenter ? Math.min(currentScrollY, DESKTOP_YEAR_TRAVEL) : 0
        );

        if (!sticky || currentScrollY <= DESKTOP_YEAR_TRAVEL) {
          setIsHeaderVisible(true);
          scrollDirectionRef.current = null;
          directionStartYRef.current = currentScrollY;
          lastScrollYRef.current = currentScrollY;
          return;
        }

        const previousScrollY = lastScrollYRef.current;
        const delta = currentScrollY - previousScrollY;
        if (delta === 0) return;

        const nextDirection = delta > 0 ? 'down' : 'up';
        if (scrollDirectionRef.current !== nextDirection) {
          scrollDirectionRef.current = nextDirection;
          directionStartYRef.current =
            nextDirection === 'down'
              ? Math.max(previousScrollY, DESKTOP_YEAR_TRAVEL)
              : previousScrollY;
        }

        const directionDistance = Math.abs(
          currentScrollY - directionStartYRef.current
        );
        if (directionDistance >= HEADER_DIRECTION_THRESHOLD) {
          setIsHeaderVisible(nextDirection === 'up');
          directionStartYRef.current = currentScrollY;
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    updateHeaderPosition();
    window.addEventListener('scroll', updateHeaderPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateHeaderPosition);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hasCenter, sticky]);

  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions) return;

    const updateActionsWidth = () => {
      setActionsWidth(actions.getBoundingClientRect().width);
    };
    updateActionsWidth();

    const observer = new ResizeObserver(updateActionsWidth);
    observer.observe(actions);
    return () => observer.disconnect();
  }, []);

  const icons = [
    {
      id: 'dark',
      svg: (
        <svg
          width="22"
          height="23"
          viewBox="0 0 22 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.7519 15.0137C20.597 15.4956 19.3296 15.7617 18 15.7617C12.6152 15.7617 8.25 11.3965 8.25 6.01171C8.25 4.68211 8.51614 3.41468 8.99806 2.25977C5.47566 3.72957 3 7.20653 3 11.2617C3 16.6465 7.36522 21.0117 12.75 21.0117C16.8052 21.0117 20.2821 18.536 21.7519 15.0137Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'light',
      svg: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3.00464V5.25464M18.364 5.64068L16.773 7.23167M21 12.0046H18.75M18.364 18.3686L16.773 16.7776M12 18.7546V21.0046M7.22703 16.7776L5.63604 18.3686M5.25 12.0046H3M7.22703 7.23167L5.63604 5.64068M15.75 12.0046C15.75 14.0757 14.0711 15.7546 12 15.7546C9.92893 15.7546 8.25 14.0757 8.25 12.0046C8.25 9.93357 9.92893 8.25464 12 8.25464C14.0711 8.25464 15.75 9.93357 15.75 12.0046Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  const handleToggle = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const currentIcon = theme === 'dark' ? icons[0] : icons[1];
  const nextThemeLabel =
    theme === 'dark'
      ? labels.switchToLightThemeLabel
      : labels.switchToDarkThemeLabel;
  const effectiveDesktopYearTravel = sticky ? desktopYearTravel : 0;
  const isHeaderHidden = sticky && !isHeaderVisible;
  const insetProgress = Math.max(
    0,
    (effectiveDesktopYearTravel - DESKTOP_YEAR_INSET_START) /
      (DESKTOP_YEAR_TRAVEL - DESKTOP_YEAR_INSET_START)
  );

  return (
    <header
      id="site-header"
      data-sticky={sticky}
      data-visible={!isHeaderHidden}
      className={`${styles.header} ${isHeaderHidden ? styles.headerHidden : ''} ${sticky ? 'sticky top-0' : 'relative'} z-30 w-full`}
    >
      <nav className="pointer-events-none relative z-10 mx-auto flex w-full max-w-screen-2xl items-center justify-between pl-6 pt-12 lg:px-16">
        <div className="pointer-events-auto">
          <Link to={siteUrl}>
            <picture>
              <img className="h-16 w-16 rounded-full" alt="logo" src={logo} />
            </picture>
          </Link>
        </div>
        <div
          ref={actionsRef}
          className={`${styles.headerActions} pointer-events-auto flex min-w-0 items-center justify-end text-right`}
        >
          {navLinks.map((n, i) => (
            <a
              key={i}
              href={n.url}
              className="mr-3 text-lg lg:mr-4 lg:text-base"
            >
              {n.name}
            </a>
          ))}
          <div className={styles.languageToggle}>
            <button
              type="button"
              onClick={() => setLanguage('zh-CN')}
              className={`${styles.languageButton} ${language === 'zh-CN' ? styles.languageButtonActive : ''}`}
              aria-label={labels.switchToChineseLabel}
              title={labels.switchToChineseLabel}
            >
              {labels.languageZhLabel}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`${styles.languageButton} ${language === 'en' ? styles.languageButtonActive : ''}`}
              aria-label={labels.switchToEnglishLabel}
              title={labels.switchToEnglishLabel}
            >
              {labels.languageEnLabel}
            </button>
          </div>
          <div className="ml-4 flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggle}
              className={`${styles.themeButton} ${styles.themeButtonActive}`}
              aria-label={nextThemeLabel}
              title={nextThemeLabel}
            >
              <div className={styles.iconWrapper}>{currentIcon.svg}</div>
            </button>
          </div>
        </div>
      </nav>
      {center && (
        <div className={`${styles.headerCenter} lg:hidden`}>{center}</div>
      )}
      {center && (
        <div
          className={`${styles.headerCenter} absolute left-0 top-full hidden w-full lg:block`}
        >
          <div className="mx-auto max-w-screen-2xl px-16">
            <div
              id="site-header-scroll-boundary"
              className={`${styles.desktopCenterPanel} ml-[33.333333%] w-2/3`}
              style={{
                paddingRight: actionsWidth * insetProgress,
                transform: `translateY(-${effectiveDesktopYearTravel}px)`,
              }}
            >
              <div className="pt-16">{center}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
