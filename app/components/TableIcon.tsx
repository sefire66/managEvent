// TableIcon.tsx
import React from "react";

export const TableIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 512 512"
    fill="currentColor"
  >
    <path d="M448 48H64c-35.29 0-64 28.71-64 64v288c0 35.29 28.71 64 64 64h384c35.29 0 64-28.71 64-64V112c0-35.29-28.71-64-64-64zm0 352H64V112h384v288z" />
    <path d="M112 160h48v192h-48zm240 0h48v192h-48z" />
  </svg>
);
