import React from 'react';
import { Box, Typography } from '@mui/material';
import logoPng from '../../assets/career-os-logo.png';

interface CareerOsLogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  align?: 'left' | 'center';
  className?: string;
}

export const CareerOsLogo: React.FC<CareerOsLogoProps> = ({
  size = 'medium',
  showSubtitle = true,
  align = 'left',
  className,
}) => {
  const iconHeight = size === 'small' ? 24 : size === 'large' ? 38 : 32;
  const titleSize = size === 'small' ? '1.05rem' : size === 'large' ? '1.4rem' : '1.22rem';
  const subtitleSize = size === 'small' ? '0.65rem' : '0.70rem';

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        flexDirection: 'row',
        gap: 1.25,
      }}
    >
      {/* 3D Graduation Cap Icon */}
      <Box
        component="img"
        src={logoPng}
        alt="Career OS"
        sx={{
          height: iconHeight,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 10px rgba(6, 182, 212, 0.45))',
          userSelect: 'none',
          flexShrink: 0,
        }}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.2rem',
          }}
        >
          <span style={{ color: '#ffffff' }}>Career</span>
          <span
            style={{
              color: '#00e5a3',
              background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            OS
          </span>
        </Typography>

        {showSubtitle && (
          <Typography
            component="div"
            sx={{
              mt: 0.25,
              color: '#8fa2bd',
              fontSize: subtitleSize,
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            College Placement Assessment Platform
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default CareerOsLogo;
