import React from "react";
import clsx from "clsx";

export const Avatar = ({ src, alt, size = "md", className, children }) => {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-md",
    lg: "w-16 h-16 text-lg",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-100 text-gray-500",
        sizes[size],
        className
      )}
    >
      {src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : children}
    </div>
  );
};

export const AvatarFallback = ({ children, className }) => {
  return (
    <div
      className={clsx(
        "w-full h-full flex items-center justify-center bg-gray-200 text-gray-600",
        className
      )}
    >
      {children}
    </div>
  );
};

export const AvatarImage = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={clsx("w-full h-full object-cover", className)} />
);
