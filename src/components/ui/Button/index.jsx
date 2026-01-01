import clsx from "clsx";

export const Button = ({ children, className, variant = "default", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    default: "bg-[#14374E] hover:bg-[#021624] text-white",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline:
      "border border-gray-300 text-gray-700",
  };

  return (
    <button className={clsx(baseStyles, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};
