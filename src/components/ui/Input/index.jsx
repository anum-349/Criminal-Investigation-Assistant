import React from "react";
import clsx from "clsx";

export const Input = ({ className, ...props }) => {
  return (
    <input
      className={clsx(
        "px-4 py-2 border border-gray-300 rounded-md focus:outline-none transition-colors",
        className
      )}
      {...props}
    />
  );
};
