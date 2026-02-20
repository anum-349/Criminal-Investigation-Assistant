import { useState } from 'react';
import Header from '../../../components/Header';
import CaseTimeline from './CaseTimeline';
import CaseVictim from './CaseVictims';
import CaseWitnesses from './CaseWitnesses';
import CaseSuspects from './CaseSuspects';
import CaseInvestigationLeads from './CaseLeads';
import LinkedCases from './CaseLinkedCases';

const CasePage = () => {
    const [activeTab, setActiveTab] = useState("timeline")

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">

            <title>Criminal Investigation Assistant - Dashboard</title>
            <meta
                name="description"
                content="Criminal Investigation Assistant Dashboard - Manage cases, track leads, and analyze crime data efficiently."
            />

            {/* Header */}
            <Header />

            {/* Case Header */}
            <header className="bg-slate-200 p-6 border-b border-slate-300">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case ID: C-2053</p>
                        <h1 className="text-2xl font-bold mt-1">Murder - Homicide Investigation</h1>
                        <p className="text-sm text-slate-600 mt-1">Assigned: Inspector Rana Ali Khan</p>
                        <div className="flex gap-2 mt-3">
                            <span className="bg-[#1a3a4a] text-white text-[10px] px-3 py-1 rounded-full uppercase">Under Investigation</span>
                            <span className="bg-[#2d3a44] text-white text-[10px] px-3 py-1 rounded-full uppercase">Critical</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex gap-2">
                            <button className="bg-[#1a3a4a] text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-slate-700 transition">Add Evidence</button>
                            <button className="bg-[#1a3a4a] text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-slate-700 transition">Add Suspect</button>
                            <button className="bg-[#1a3a4a] text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-slate-700 transition">Generate Leads</button>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Last Updated: Today, 3:12 PM</p>
                    </div>
                </div>
            </header>

            {/* Overview Section */}
            <main className="p-6 max-w-7xl mx-auto">
                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold border-b pb-2 mb-4">Case Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div className="space-y-2">
                            <p className="text-sm"><strong>Case Type:</strong> <span className="ml-4 text-slate-600">Murder</span></p>
                            <p className="text-sm"><strong>Location:</strong> <span className="ml-5 text-slate-600">Clifton Block 5, Karachi</span></p>
                            <p className="text-sm"><strong>Jurisdiction:</strong> <span className="ml-2 text-slate-600">Central Division</span></p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm"><strong>Date of Incident:</strong> <span className="ml-4 text-slate-600">12 Dec 2025</span></p>
                            <p className="text-sm"><strong>Time:</strong> <span className="ml-20 text-slate-600">10:45 PM</span></p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="font-bold text-sm mb-2">Description:</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Victim identified as Mr. Asim Raza, 34, was found deceased in his apartment with multiple stab wounds.
                            Neighbors reported hearing a struggle and suspicious noises around 10:30 PM. No forced entry was observed.
                        </p>
                    </div>

                    {/* Stats Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['Evidence Collected: 10', 'Suspects: 3', 'Investigation Leads: 4', 'Victims: 2', 'Days Open: 10'].map((stat, i) => (
                            <div key={i} className="bg-[#1a3a4a] text-white p-3 rounded text-center text-sm font-medium">
                                {stat}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-8 mb-6">
                    {['Timeline', 'Victims', 'Witnesses', 'Suspects', 'Leads', 'Linked Cases'].map((tab) => (
                        <button
                            key={tab}
                            className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all 
                                ${activeTab === tab.toLowerCase()
                                    ? 'bg-slate-700 text-white shadow-md scale-105' 
                                    : 'bg-slate-500 text-white opacity-80 hover:opacity-100'
                                }`}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {
                    activeTab === "timeline" ? <CaseTimeline /> 
                    : activeTab === "victims" ? <CaseVictim />
                    : activeTab === "witnesses" ? <CaseWitnesses />
                    : activeTab === "suspects" ? <CaseSuspects />
                    : activeTab === "leads" ? <CaseInvestigationLeads />
                    : activeTab === "linked cases" ? <LinkedCases />
                    : null
                }
            </main>
        </div>
    )
}

export default CasePage