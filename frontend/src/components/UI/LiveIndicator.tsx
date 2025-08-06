'use client';

import { 
  Box, 
  HStack, 
  Text, 
  Circle, 
  Tooltip, 
  useColorModeValue 
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { formatDistanceToNow } from 'date-fns';

// Pulse animation for the live indicator
const pulseKeyframes = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
`;

const pulseAnimation = `${pulseKeyframes} 2s ease-in-out infinite`;

interface LiveIndicatorProps {
  /** Whether live updates are active */
  isLive: boolean;
  /** Last update timestamp */
  lastUpdate?: Date | null;
  /** Whether there are recent changes */
  hasRecentChanges?: boolean;
  /** Error message if polling failed */
  error?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Show status text */
  showText?: boolean;
  /** Custom status text */
  statusText?: string;
}

export default function LiveIndicator({
  isLive,
  lastUpdate,
  hasRecentChanges = false,
  error,
  size = 'md',
  showTimestamp = true,
  showText = true,
  statusText
}: LiveIndicatorProps) {
  const errorColor = useColorModeValue('red.500', 'red.300');
  const liveColor = useColorModeValue('green.500', 'green.300');
  const inactiveColor = useColorModeValue('gray.400', 'gray.500');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  // Size configurations
  const sizeConfig = {
    sm: { circle: 2, text: 'xs', spacing: 1 },
    md: { circle: 2.5, text: 'sm', spacing: 2 },
    lg: { circle: 3, text: 'md', spacing: 3 }
  };

  const config = sizeConfig[size];

  // Determine indicator color and animation
  const getIndicatorProps = () => {
    if (error) {
      return {
        bg: errorColor,
        animation: undefined,
        tooltip: `Error: ${error}`
      };
    }
    
    if (isLive) {
      return {
        bg: hasRecentChanges ? 'orange.400' : liveColor,
        animation: hasRecentChanges ? pulseAnimation : undefined,
        tooltip: hasRecentChanges 
          ? 'Live updates - Recent changes detected!' 
          : 'Live updates active'
      };
    }
    
    return {
      bg: inactiveColor,
      animation: undefined,
      tooltip: 'Live updates paused'
    };
  };

  const indicatorProps = getIndicatorProps();

  // Format last update time
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never updated';
    
    try {
      return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch {
      return 'Recently updated';
    }
  };

  const getStatusText = () => {
    if (statusText) return statusText;
    
    if (error) return 'Connection error';
    if (isLive && hasRecentChanges) return 'Live - Changes detected';
    if (isLive) return 'Live';
    return 'Paused';
  };

  return (
    <Tooltip 
      label={indicatorProps.tooltip} 
      placement="top"
      hasArrow
    >
      <HStack spacing={config.spacing} align="center">
        <Circle
          size={config.circle}
          bg={indicatorProps.bg}
          animation={indicatorProps.animation}
          flexShrink={0}
        />
        
        {showText && (
          <Text
            fontSize={config.text}
            color={error ? errorColor : mutedTextColor}
            fontWeight={hasRecentChanges ? 'semibold' : 'normal'}
            minW="max-content"
          >
            {getStatusText()}
          </Text>
        )}
        
        {showTimestamp && lastUpdate && !error && (
          <Text
            fontSize="xs"
            color={mutedTextColor}
            fontStyle="italic"
            minW="max-content"
          >
            {formatLastUpdate(lastUpdate)}
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
}

// Compact variant for use in tight spaces
interface CompactLiveIndicatorProps extends Omit<LiveIndicatorProps, 'showText' | 'showTimestamp'> {
  /** Show tooltip with details */
  showTooltip?: boolean;
}

export function CompactLiveIndicator({
  isLive,
  lastUpdate,
  hasRecentChanges = false,
  error,
  size = 'sm',
  showTooltip = true
}: CompactLiveIndicatorProps) {
  const indicatorProps = {
    isLive,
    lastUpdate,
    hasRecentChanges,
    error,
    size,
    showText: false,
    showTimestamp: false
  };

  if (!showTooltip) {
    return (
      <Circle
        size={sizeConfig[size].circle}
        bg={error ? 'red.500' : isLive ? (hasRecentChanges ? 'orange.400' : 'green.500') : 'gray.400'}
        animation={hasRecentChanges && isLive ? pulseAnimation : undefined}
        flexShrink={0}
      />
    );
  }

  return <LiveIndicator {...indicatorProps} />;
}

const sizeConfig = {
  sm: { circle: 2, text: 'xs', spacing: 1 },
  md: { circle: 2.5, text: 'sm', spacing: 2 },
  lg: { circle: 3, text: 'md', spacing: 3 }
};