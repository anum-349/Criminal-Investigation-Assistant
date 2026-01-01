import React from "react";
import clsx from "clsx";

export const TableWrapper = ({ children, className }) => (
  <div
    className={clsx(
      "overflow-hidden rounded-lg border-2 border-[#1B3C53]",
      className
    )}
  >
    {children}
  </div>
);

export const Table = ({ children, className }) => (
  <table
    className={clsx(
      "w-full caption-bottom text-sm border-collapse",
      className
    )}
  >
    {children}
  </table>
);

export const TableHeader = ({ children }) => (
  <thead className="bg-[#1B3C53] text-white">
    {children}
  </thead>
);

export const TableBody = ({ children }) => <tbody>{children}</tbody>;

export const TableRow = ({ children, className }) => (
  <tr
    className={clsx(
      "border-b last:border-b-0 border-[#1B3C53]/20",
      className
    )}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className }) => (
  <th className={clsx("px-4 py-3 text-left font-semibold", className)}>
    {children}
  </th>
);

export const TableCell = ({ children, className }) => (
  <td className={clsx("px-4 py-3 text-left text-gray-700", className)}>
    {children}
  </td>
);
