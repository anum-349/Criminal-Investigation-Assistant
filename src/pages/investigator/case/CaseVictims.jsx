import React from 'react';
import {
    Shield, Search, Bell, User, Info,
    CheckCircle2, PlusCircle, UserCircle
} from 'lucide-react';

const CaseVictim = () => {
    const victims = [
        { id: 1, title: "Victim #1", role: "IT Professional", status: "Fatal", color: "bg-[#1e3a4c]" },
        { id: 2, title: "Victim #2", role: "Store Owner", status: "No Injury", color: "bg-[#1e3a4c]" },
    ];

    return (
        <section className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800">Victims</h2>
            <p className="text-sm text-slate-500 mt-1">View all Victims</p>
            <hr className="my-6 border-slate-400" />

            {/* Victim Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Victim 1 Card */}
                <div className="bg-[#1e3a4c] rounded-xl p-5 text-white flex justify-between items-center shadow-lg">
                    <div>
                        <h3 className="text-xl font-bold">Victim #1</h3>
                        <p className="text-sm opacity-80">IT Professional</p>
                    </div>
                    <div className="bg-rose-700/80 border border-rose-400 px-6 py-2 rounded-full flex items-center gap-2">
                        <Info size={16} />
                        <span className="font-bold text-sm tracking-wide uppercase">Fatal</span>
                    </div>
                </div>

                {/* Victim 2 Card */}
                <div className="bg-[#1e3a4c] rounded-xl p-5 text-white flex justify-between items-center shadow-lg opacity-90">
                    <div>
                        <h3 className="text-xl font-bold">Victim #2</h3>
                        <p className="text-sm opacity-80">Store Owner</p>
                    </div>
                    <div className="bg-[#1e3a4c] border border-emerald-400 px-6 py-2 rounded-full flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="font-bold text-sm tracking-wide uppercase">No Injury</span>
                    </div>
                </div>
            </div>

            {/* Detailed Profile View (Sample) */}
            <div className="bg-[#536d7e] rounded-lg p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-16 bg-slate-400 rounded-md overflow-hidden border-2 border-white/20">
                        <img src="https://via.placeholder.com/150" alt="Victim Profile" className="object-cover h-full w-full" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Murder / Homicide</h3>
                        <p className="text-xs uppercase opacity-80">Primary Victim - Murder</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-slate-800/40 border border-emerald-400/50 px-6 py-1.5 rounded-full">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold">Cooperative</span>
                    </div>
                    <button className="flex items-center gap-2 bg-slate-800/40 border border-slate-300 px-4 py-1.5 rounded-full hover:bg-slate-700 transition">
                        <PlusCircle size={14} />
                        <span className="text-xs font-semibold">Add Statement</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CaseVictim;