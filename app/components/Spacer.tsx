"use client";

import React, { JSX } from "react";

type SpacerProps = {
  /** גודל הרווח בפיקסלים (ברירת מחדל 16) */
  size?: number;
  /** האם הרווח אנכי (ברירת מחדל true) */
  vertical?: boolean;
};

export default function Spacer({
  size = 16,
  vertical = true,
}: SpacerProps): JSX.Element {
  if (vertical) {
    return <div style={{ height: `${size}px` }} />;
  }
  return <div style={{ width: `${size}px`, display: "inline-block" }} />;
}
