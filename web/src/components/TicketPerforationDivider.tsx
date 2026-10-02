"use client"

import React from "react"

interface TicketPerforationDividerProps {
  className?: string
  color?: string
}

/**
 * Renders an authentic torn ticket perforation:
 * 1. Deep half-circle punch cutout notches at the top and bottom edges (where the ticket is torn)
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
        className={`hidden md:flex relative z-20 w-6 -mx-3 shrink-0 flex-col items-center justify-between pointer-events-none self-stretch ${className}`}
        aria-hidden="true"
      >
        {/* Top Tear Notch Cutout */}
        <div className="w-5 h-3 bg-background rounded-b-full shadow-inner -mt-[1px] shrink-0" />

        {/* Center Dashed Perforation Stitch Line */}
        <div className="w-full flex-1 flex items-center justify-center my-1 relative overflow-hidden">
          <svg
            className="w-full h-full"
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

        {/* Bottom Tear Notch Cutout */}
        <div className="w-5 h-3 bg-background rounded-t-full shadow-inner -mb-[1px] shrink-0" />
      </div>

      {/* ─── Mobile Horizontal Perforation Divider (below md) ─── */}
      <div
        className={`flex md:hidden relative z-20 h-6 -my-3 w-full shrink-0 flex-row items-center justify-between pointer-events-none self-stretch ${className}`}
        aria-hidden="true"
      >
        {/* Left Tear Notch Cutout */}
        <div className="h-5 w-3 bg-background rounded-r-full shadow-inner -ml-[1px] shrink-0" />

        {/* Center Dashed Perforation Stitch Line */}
        <div className="h-full flex-1 flex items-center justify-center mx-1 relative overflow-hidden">
          <svg
            className="w-full h-full"
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

        {/* Right Tear Notch Cutout */}
        <div className="h-5 w-3 bg-background rounded-l-full shadow-inner -mr-[1px] shrink-0" />
      </div>
    </>
  )
}
