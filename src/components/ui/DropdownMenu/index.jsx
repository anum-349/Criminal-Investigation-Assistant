import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export const DropdownMenu = ({ children, className }) => {
  return <div className={clsx("relative inline-block text-left", className)}>{children}</div>;
};

export const DropdownMenuTrigger = ({ children, onClick, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400",
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownMenuContent = ({ children, isOpen, className }) => {
  if (!isOpen) return null;
  return (
    <div
      className={clsx(
        "absolute mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = ({ children, onClick, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
        className
      )}
    >
      {children}
    </button>
  );
};
