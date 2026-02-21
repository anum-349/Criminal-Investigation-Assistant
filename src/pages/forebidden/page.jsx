import React from "react";
import { useNavigate } from "react-router-dom";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
   
    <div className="flex items-center justify-center h-screen bg-linear-to-br from-deep-ocean-900 to-slate-blue via-deep-ocean px-4">
      <div className="max-w-md text-center bg-soft-mist p-8 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-6xl font-extrabold text-red-500 mb-4 animate-pulse">403</h1>
        <h2 className="text-2xl font-semibold text-deep-ocean mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page.
        </p>
        <button
          onClick={() => navigate(-1) || navigate("/")}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}