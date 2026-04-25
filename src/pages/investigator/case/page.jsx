import { useState } from 'react';
import Header from '../../../components/Header';
import CaseTimeline from './CaseTimeline';
import CaseVictim from './CaseVictims';
import CaseWitnesses from './CaseWitnesses';
import CaseSuspects from './CaseSuspects';
import CaseInvestigationLeads from './CaseLeads';
import LinkedCases from './CaseLinkedCases';
import { Badge } from '../../../components/ui/Badge';
import CaseEvidence from './CaseEvidence';
import { ArrowLeft, FolderOpen, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CaseLocation from './CaseLocation';
import AddEvidenceDialog from './forms/AddEvidence';
import AddSuspectDialog from './forms/AddSuspect';

const CasePage = () => {
    const [activeTab, setActiveTab] = useState("timeline")
    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [showAddSuspects, setShowAddSuspect] = useState(false);
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14">

            {/* Header */}
            <Header />

            {/* Case Header */}
            <header className="bg-cool-silver p-6 border-b border-slate-300">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button
                                onClick={() => navigate("/investigator")}
                                className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Dashboard
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <button
                                onClick={() => navigate("/investigator/cases")}
                                className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <FolderOpen className="h-3.5 w-3.5" />
                                All Cases
                            </button>
                            <span className="text-muted-foreground text-xs">/</span>
                            <span className="text-xs font-medium text-foreground">Case 101</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case ID: C-2053</p>

                        <h1 className="text-2xl font-bold mt-1">Murder - Homicide Investigation</h1>
                        <p className="text-sm text-slate-600 mt-1">Assigned: Inspector Rana Ali Khan</p>
                        <div className="flex gap-2 mt-3">
                            <span className="bg-forest-teal text-white inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" >
                                Under Investigation
                            </span>
                            <Badge variant='destructive'>
                                Critical
                            </Badge>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="grid grid-cols-3 *:cursor-pointer  gap-2 *:bg-deep-ocean-500 *:text-white *:px-4 *:py-1.5 *:rounded *:text-xs *:font-medium *:hover:bg-slate-700 *:transition *:shadow-inner *:shadow-deep-ocean-900">
                            <button onClick={() => setShowAddEvidence(true)}>Add Evidence</button>
                            <button onClick={() => setShowAddSuspect(true)}>Add Suspect</button>
                            <button>Add Victim</button>
                            <button>Add Witness</button>
                            <button>Add Timeline</button>
                            <button>Add Lead</button>
                        </div>
                        <p className="text-xs text-slate-blue italic">Last Updated: Today, 3:12 PM</p>
                    </div>
                </div>
            </header>

            {/* Overview Section */}
            <main className="p-6 max-w-7xl mx-auto">
                <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold border-b pb-2 mb-4">Case Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div className="space-y-2 *:grid *:grid-cols-2 *:gap-x-4">
                            <p className="text-sm "><strong>Case Type:</strong> <span className=" text-slate-600">Murder</span></p>
                            <p className="text-sm"><strong>Location:</strong> <span className="text-slate-600">Clifton Block 5, Karachi</span></p>
                            <p className="text-sm"><strong>Jurisdiction:</strong> <span className=" text-slate-600">Central Division</span></p>
                        </div>
                        <div className="space-y-2 *:grid *:grid-cols-2 *:gap-x-4">
                            <p className="text-sm"><strong>Date of Incident:</strong> <span className=" text-slate-600">12 Dec 2025</span></p>
                            <p className="text-sm"><strong>Time:</strong> <span className=" text-slate-600">10:45 PM</span></p>
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
                            <div key={i} className="bg-deep-ocean-500 shadow-inner shadow-deep-ocean-900/60 text-white p-3 rounded text-center text-sm font-medium">
                                {stat}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-8 mb-6">
                    {['Timeline', 'Victims', 'Evidences', 'Witnesses', 'Suspects', 'Leads', 'Linked Cases', "Location"].map((tab) => (
                        <button
                            key={tab}
                            className={` cursor-pointer px-6 py-1.5 rounded-full shadow-inner text-xs font-semibold transition-all 
                                ${activeTab === tab.toLowerCase()
                                    ? 'bg-deep-ocean-500  shadow-deep-ocean-900/60 text-white scale-105'
                                    : 'bg-slate-blue shadow-deep-ocean text-white opacity-80 hover:opacity-100'
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
                            : activeTab === "evidences" ? <CaseEvidence />
                                : activeTab === "witnesses" ? <CaseWitnesses />
                                    : activeTab === "suspects" ? <CaseSuspects />
                                        : activeTab === "leads" ? <CaseInvestigationLeads />
                                            : activeTab === "linked cases" ? <LinkedCases />
                                                : activeTab === "location" ? <CaseLocation />
                                                    : null
                }
            </main>

            <AddEvidenceDialog
                isOpen={showAddEvidence}
                onClose={() => setShowAddEvidence(false)}
                onSubmit={(data) => console.log(data)}
                caseId="C-2053"
            />

            
            <AddSuspectDialog
                isOpen={showAddSuspects}
                onClose={() => setShowAddSuspect(false)}
                onSubmit={(data) => console.log(data)}
                caseId="C-2053"
            />
        </div>
    )
}

export default CasePage