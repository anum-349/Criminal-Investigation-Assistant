import React from 'react';
import { 
  Shield, Search, Calendar, Filter, 
  ExternalLink, ChevronDown, CheckCircle 
} from 'lucide-react';

const LinkedCases = () => {
  const linkedData = [
    {
      id: "C-10046",
      title: "Armed Robbery – Clifton Market",
      investigator: "Insp. A. Khan",
      date: "11 / 23 / 2026",
      status: "Closed",
      relation: "Similar suspect description (dark hoodie)"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* Top Section remains consistent for UI stability (HCI Principle: Consistency) */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 m-6 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold">Linked Cases</h2>
          <p className="text-sm text-slate-500">Visualize relationship between cases</p>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 flex flex-wrap gap-3 items-center border-b border-slate-200">
          <div className="relative grow max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search linked cases..." 
              className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <select className="border rounded-md px-3 py-2 text-sm bg-white outline-none cursor-pointer">
            <option>Relation</option>
            <option>Modus Operandi</option>
            <option>Location Match</option>
          </select>

          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input 
              type="date" 
              placeholder="Select Date" 
              className="pl-10 pr-4 py-2 border rounded-md text-sm bg-white outline-none"
            />
          </div>

          <select className="border rounded-md px-3 py-2 text-sm bg-white outline-none cursor-pointer">
            <option>Status All</option>
            <option>Open</option>
            <option>Closed</option>
          </select>

          <button className="bg-[#1a3a4a] text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-slate-700 transition-colors">
            Apply
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200/50 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">Case ID</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4 text-center">Investigator</th>
                <th className="px-6 py-4 text-center">Register Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Relation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linkedData.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{row.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{row.title}</td>
                  <td className="px-6 py-4 text-center text-sm">{row.investigator}</td>
                  <td className="px-6 py-4 text-center text-sm">{row.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-[#1a2e35] text-white px-6 py-1 rounded text-xs font-bold">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-rose-700 text-white px-4 py-2 rounded-full text-[10px] font-bold block text-center leading-tight">
                      {row.relation.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LinkedCases;