import { Search} from 'lucide-react';

const CaseWitnesses = () => {
  return (
  <div className="p-8">
    <h2 className="text-2xl font-bold">Witnesses</h2>
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
        <thead className="bg-slate-100 text-[11px] font-bold text-slate-500 uppercase">
          <tr><th className="p-4">ID</th><th className="p-4">Description</th><th className="p-4 text-center">Date</th><th className="p-4 text-center">Status</th></tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <td className="p-4 font-bold">ID-10046</td>
            <td className="p-4">Standard dummy data record for tracking.</td>
            <td className="p-4 text-center">11 / 23 / 2026</td>
            <td className="p-4 text-center">
              <span className="bg-[#1a3a4a] text-white px-4 py-1 rounded text-[10px] font-bold">CLOSED</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  );
};

export default CaseWitnesses;