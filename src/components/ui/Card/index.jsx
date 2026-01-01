import React from "react";
import clsx from "clsx";

export const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-200 bg-white shadow-sm p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
