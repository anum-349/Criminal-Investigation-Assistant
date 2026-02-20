import { Search } from "lucide-react";

const CaseSuspects = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold mb-6">Suspects</h2>
    <div className="mt-6 flex flex-wrap gap-3 p-4 bg-slate-50 border rounded-t-lg">
       <div className="relative grow max-w-xs">
          <Search className="absolute left-2 top-2.5 size-4 text-slate-400" />
          <input type="text" placeholder="Search..." className="w-full pl-8 pr-4 py-2 border rounded-md text-sm outline-none" />
       </div>
       <select className="border rounded px-3 py-2 text-sm bg-white outline-none"><option>All Statuses</option></select>
       <input type="date" className="border rounded px-3 py-2 text-sm bg-white outline-none" />
       <button className="bg-[#1a3a4a] text-white px-8 py-2 rounded font-bold text-sm">Apply</button>
    </div>
    <div className="border rounded-b-lg overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-tighter">
          <tr><th className="p-4">Suspect ID</th><th className="p-4">Name</th><th className="p-4">Reason</th><th className="p-4 text-center">Status</th><th className="p-4">Relation</th></tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-100">
          <tr className="hover:bg-slate-50">
            <td className="p-4 font-bold">S-10046</td>
            <td className="p-4">Hamza Ali<br/><span className="text-[10px] text-slate-400">29 / Male</span></td>
            <td className="p-4 text-blue-900 font-medium">Recent workplace disagreements with victim</td>
            <td className="p-4"><span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded block text-center font-bold">QUESTIONED - DENIES</span></td>
            <td className="p-4">Colleague</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// ... Additional views (LeadsView, LinkedView) would follow the same pattern as shown in previous responses.

export default CaseSuspects;