import { useWindowDimensions, Dimensions } from 'react-native';

/**
 * Responsive utility hook for phone, phablet, and tablet adaptation.
 * Breakpoints:
 * - Small phones: width < 360px (e.g. iPhone SE 1st gen, Galaxy J2, small Androids)
 * - Standard phones: 360px <= width < 600px
 * - Tablets: width >= 600px
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 360;
  const isMedium = width >= 360 && width < 420;
  const isLarge = width >= 420 && width < 600;
  const isTablet = width >= 600;

  // Grid columns for dashboard action tiles
  const tileColumns = isTablet ? 4 : isSmall ? 2 : 3;

  /**
   * Safe font scaling helper: clamps font size between minimum and maximum bounds.
   */
  const scaleFont = (size, factor = 0.15) => {
    if (isSmall) return Math.max(Math.round(size * (1 - factor)), 10);
    if (isTablet) return Math.round(size * (1 + factor * 0.8));
    return size;
  };

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    tileColumns,
    scaleFont,
  };
}

/**
 * Static fallback for non-hook callers.
 */
export function getScreenInfo() {
  const { width, height } = Dimensions.get('window');
  const isSmall = width < 360;
  const isTablet = width >= 600;
  return {
    width,
    height,
    isSmall,
    isTablet,
    tileColumns: isTablet ? 4 : isSmall ? 2 : 3,
  };
}
