import { colors } from './colors';

export const theme = {
  colors,
  roundness: 12,
  minTouchTarget: 44,
  shadows: {
    card: {
      shadowColor: '#102A43',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3
    },
    hover: {
      shadowColor: '#102A43',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6
    }
  }
};
