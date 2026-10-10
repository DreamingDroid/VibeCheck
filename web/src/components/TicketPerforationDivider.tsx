"use client"

import React from "react"

interface TicketPerforationDividerProps {
  className?: string
  color?: string
}

/**
 * Renders an authentic torn ticket perforation:
 * 1. Deep half-circle punch cutout notches at the edges (spaced cleanly)
 * 2. A continuous, crisp dashed perforation stitch line running down the exact center
 */
export function TicketPerforationDivider({
  className = "",
  color = "rgba(0, 0, 0, 0.22)",
}: TicketPerforationDividerProps) {
  return (
    <>
      {/* ─── Desktop Vertical Perforation Divider (md and up) ─── */}
      <div
        className={`hidden md:flex relative z-20 w-0 -mx-[1px] shrink-0 flex-col items-center justify-between pointer-events-none self-stretch min-h-0 ${className}`}
        aria-hidden="true"
      >
        {/* Top Notch Spacer (12px cutout area) */}
        <div className="w-6 h-3 shrink-0 pointer-events-none" />

        {/* Center Dashed Perforation Stitch Line */}
        <div className="w-6 flex-1 my-0.5 relative overflow-hidden min-h-0 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 24 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="600"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Bottom Notch Spacer (12px cutout area) */}
        <div className="w-6 h-3 shrink-0 pointer-events-none" />
      </div>

      {/* ─── Mobile Horizontal Perforation Divider (below md) ─── */}
      <div
        className={`flex md:hidden relative z-20 h-0 -my-[1px] w-full shrink-0 flex-row items-center justify-between pointer-events-none self-stretch min-w-0 ${className}`}
        aria-hidden="true"
      >
        {/* Left Notch Spacer (12px cutout area) */}
        <div className="h-6 w-3 shrink-0 pointer-events-none" />

        {/* Center Dashed Perforation Stitch Line */}
        <div className="h-6 flex-1 mx-0.5 relative overflow-hidden min-w-0 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 600 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="0"
              y1="12"
              x2="600"
              y2="12"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Right Notch Spacer (12px cutout area) */}
        <div className="h-6 w-3 shrink-0 pointer-events-none" />
      </div>
    </>
  )
}

