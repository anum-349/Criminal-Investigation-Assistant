import React, { useState } from 'react';
import {
  Shield,
  Info,
  CheckCircle2,
  Plus,
  Mic,
  Circle,
  Pencil,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import AddVictimDialog from './forms/AddVictim';
import { Button } from '@/components/ui/Button';

const victimsList = [
  {
    id: 1,
    title: 'Victim #1',
    role: 'IT Professional',
    status: 'Fatal',
    statusVariant: 'fatal',
  },
  {
    id: 2,
    title: 'Victim #2',
    role: 'Store Owner',
    status: 'No Injury',
    statusVariant: 'noInjury',
  },
];

const victim1Details = {
  personal: {
    name: 'Ahmad Khan',
    age: 38,
    contact: '+92 340 4554560',
    gender: 'Male',
    occupation: 'IT Professional',
    cnic: '82101-9796820-8',
  },
  incident: {
    residentialAddress: 'Apartment #12, Clifton Block 5, Karachi',
    natureOfInjuries: 'Multiple stab wounds to chest and abdomen',
    causeOfDeath: 'Excessive blood loss',
    declaredDead: 'At scene',
    postmortemAutopsy: 'Conducted, Pending',
  },
  injurySummary: 'Multiple stab wounds to chest and abdomen',
  injuryRecordedBy: 'Inspector Ali',
  forensic: [
    'Blood samples collected from crime scene',
    'Defensive wounds found on victim\'s hands',
    'No signs of forced entry',
    'Time of death estimated between 10:45 PM',
  ],
  timeline: [
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim last contacted sister via phone' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Neighbors heard loud argument' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim discovered deceased' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim discovered deceased' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim discovered deceased' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim discovered deceased' },
    { date: '20 Aug, 2025 5:00 PM', text: 'Victim discovered deceased' },
  ],
  protection: {
    threatLevel: 'Low',
    protectionAssigned: 'No',
    notes: 'Victim had recent disagreements with colleague.',
  },
  legal: [
    { label: 'FIR Filed', done: true },
    { label: 'Case Section: PPC 302 (Murder)', done: true },
    { label: 'Court Proceedings: Pending', done: false },
    { label: 'Next Step: Submission of forensic reports', done: false },
  ],
  nextFollowUp: '20 Dec 2025',
  caseType: 'Murder / Homicide',
  primaryLabel: 'Primary Victim - Murder',
  cooperative: true,
};

const victim2Details = {
  ...victim1Details,
  personal: {
    name: 'TBD',
    age: '—',
    contact: '—',
    gender: '—',
    occupation: 'Store Owner',
    cnic: '—',
  },
  incident: {
    residentialAddress: '—',
    natureOfInjuries: 'None',
    causeOfDeath: 'N/A',
    declaredDead: 'N/A',
    postmortemAutopsy: 'N/A',
  },
  injurySummary: 'No injury',
  injuryRecordedBy: '—',
  forensic: ['Awaiting documentation.'],
  timeline: [],
  nextFollowUp: 'TBD',
};

const victimDetailsMap = { 1: victim1Details, 2: victim2Details };

const CaseVictim = () => {
  const [selectedVictimId, setSelectedVictimId] = useState(1);
  const details = victimDetailsMap[selectedVictimId] || victim1Details;
  const [updateTarget, setUpdateTarget] = useState(null);

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Victims"
    >
      {/* Header – HCI: Clear hierarchy and navigation */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Victims</h2>
        <p className="text-sm text-slate-600 mt-1">View all victims and their case involvement</p>
      </header>

      {/* Victim selection tabs – HCI: Recognition over recall, clear selected state */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        role="tablist"
        aria-label="Select victim"
      >
        {victimsList.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={selectedVictimId === v.id}
            aria-controls="victim-details-panel"
            id={`victim-tab-${v.id}`}
            onClick={() => setSelectedVictimId(v.id)}
            className={`rounded-xl cursor-pointer p-5 text-left transition-all shadow-inner shadow-deep-ocean-900/50 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 ${selectedVictimId === v.id
              ? 'bg-slate-blue text-white'
              : 'bg-cool-silver text-slate-700 hover:bg-deep-ocean hover:text-slate-300 shadow-deep-ocean/30'
              }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{v.title}</h3>
                <p className={`text-sm ${selectedVictimId === v.id ? 'opacity-90' : ''}`}>
                  {v.role}
                </p>
              </div>
              <Badge variant={v.statusVariant === 'fatal' ? 'destructive' : 'success'} size="sm" className="shrink-0 px-4 py-2">
                {v.statusVariant === 'fatal' ? <Info size={14} aria-hidden className='mr-2' /> : <CheckCircle2 size={14} aria-hidden className='mr-2' />}
                {v.statusVariant.toLowerCase()
                  .split(" ")
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* Primary victim case header – HCI: Visibility of key info and primary action */}
      <div
        id="victim-details-panel"
        role="tabpanel"
        aria-labelledby={`victim-tab-${selectedVictimId}`}
        className="from-deep-ocean bg-linear-60 to-slate-blue rounded-lg p-6 shadow-inner shadow-deep-ocean-900/50 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="size-18 rounded-full overflow-hidden border-2 border-white/20 bg-slate-400 shrink-0">
            <img
              src="/profile.jpg"
              alt=""
              className="object-cover h-full w-full"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold">{details.caseType}</h3>
            <p className="text-xs uppercase opacity-90">{details.primaryLabel}</p>
            <p className="text-sm mt-2 opacity-90">
              Next Follow-Up Date: <strong>{details.nextFollowUp}</strong>
            </p>
          </div>
        </div>
        <div className='grid grid-rows-2 gap-2'>
          <Button
            variant='default'
            className={'px-4 py-2 border border-slate-50'}
            onClick={() => setUpdateTarget(details)}
            aria-label={`Update victim ${selectedVictimId} details`}
          >
            <Pencil className="h-3.5 w-3.5 mr-3" aria-hidden />
            Update
          </Button>
          <div className="flex flex-wrap gap-3 items-center">
            {details.cooperative && (
              <Badge variant="success" size="sm" className="inline-flex items-center gap-2 px-4 py-2 border border-forest-teal font-semibold">
                <CheckCircle2 size={16} className="text-emerald-green" aria-hidden />
                Cooperative
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Detail cards grid – HCI: Logical grouping, scannability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Victim details">
        {/* Personal Information */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="personal-info-heading"
        >
          <h3 id="personal-info-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="space-y-2 *:grid *:gap-1 *:grid-cols-2">
              <p><span className="text-slate-700 font-semibold">Name:</span> <span className="text-slate-600">{details.personal.name}</span></p>
              <p><span className="text-slate-700 font-semibold">Age:</span> <span className="text-slate-600">{details.personal.age}</span></p>
              <p><span className="text-slate-700 font-semibold">Contact:</span> <span className="text-slate-600">{details.personal.contact}</span></p>
            </div>
            <div className="space-y-2 *:grid *:gap-1 *:grid-cols-2">
              <p><span className="text-slate-700 font-semibold">Gender:</span> <span className="text-slate-600">{details.personal.gender}</span></p>
              <p><span className="text-slate-700 font-semibold">Occupation:</span> <span className="text-slate-600">{details.personal.occupation}</span></p>
              <p><span className="text-slate-700 font-semibold">CNIC:</span> <span className="text-slate-600">{details.personal.cnic}</span></p>
            </div>
          </div>
        </article>

        {/* Incident Details */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="incident-details-heading"
        >
          <h3 id="incident-details-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Incident Details
          </h3>
          <div className="space-y-2 *:grid *:gap-1 *:grid-cols-2">
            <p><span className="text-slate-700 font-semibold">Residential Address:</span>
              <span className="text-slate-600">{details.incident.residentialAddress}</span></p>
            <p><span className="text-slate-700 font-semibold">Nature of Injuries:</span>
              <span className="text-slate-600">{details.incident.natureOfInjuries}</span></p>
            <p><span className="text-slate-700 font-semibold">Cause of Death:</span>
              <span className="text-slate-600">{details.incident.causeOfDeath}</span></p>
            <p><span className="text-slate-700 font-semibold">Declared Dead:</span>
              <span className="text-slate-600">{details.incident.declaredDead}</span></p>
            <p><span className="text-slate-700 font-semibold">Postmortem, Autopsy:</span>
              <span className="text-slate-600">{details.incident.postmortemAutopsy}</span></p>
          </div>
        </article>

        {/* Injury & Medical Status – HCI: Emphasize key finding, show source/verification */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="injury-heading"
        >
          <h3 id="injury-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Injury & Medical Status
          </h3>
          <div className="bg-deep-ocean-500 text-white rounded-md px-4 py-3 mb-3">
            <p className="font-medium">{details.injurySummary}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Mic size={14} className="shrink-0" aria-hidden />
            Recorded by {details.injuryRecordedBy}. Verified <CheckCircle2 size={14} className="inline text-emerald-600" aria-hidden />
          </p>
        </article>

        {/* Forensic Summary */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="forensic-heading"
        >
          <h3 id="forensic-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Forensic Summary
          </h3>
          <ul className="list-none space-y-2 text-sm text-slate-700">
            {details.forensic.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-deep-ocean-900 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Victims Activity Timeline – HCI: Chronological clarity */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm lg:col-span-2"
          aria-labelledby="timeline-heading"
        >
          <h3 id="timeline-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Victims Activity Timeline
          </h3>
          {details.timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No timeline entries yet.</p>
          ) : (
            <ul className="relative space-y-0 pl-6 grid-cols-2 grid ml-2" role="list">
              {details.timeline.map((entry, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span
                    className="absolute -left-8 top-0.5 w-3 h-3 rounded-full bg-deep-ocean-500 border-2 border-soft-mist shadow"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-slate-800">{entry.date}</p>
                  <p className="text-sm text-slate-600">{entry.text}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Protection Status */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="protection-heading"
        >
          <h3 id="protection-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-slate-600" aria-hidden />
            Protection Status
          </h3>
          <div className="space-y-2 text-sm *:grid *:gap-1 *:grid-cols-2">
            <p><span className="text-slate-700 font-semibold ">Threat Level:</span> <span className="text-slate-600">{details.protection.threatLevel}</span></p>
            <p><span className="text-slate-700 font-semibold">Protection Assigned:</span> <span className="text-slate-600">{details.protection.protectionAssigned}</span></p>
            <p className="mt-3"><span className="text-slate-700 font-semibold">Notes:</span><span className="text-slate-600">{details.protection.notes}</span></p>
          </div>
        </article>

        {/* Legal Status – HCI: At-a-glance progress with checkmarks */}
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          aria-labelledby="legal-heading"
        >
          <h3 id="legal-heading" className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            Legal Status
          </h3>
          <ul className="space-y-2 text-sm">
            {details.legal.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 size={18} className="text-emerald-green shrink-0" aria-hidden />
                ) : (
                  <Circle size={18} className="text-slate-300 shrink-0" aria-hidden />
                )}
                <span className={item.done ? 'text-slate-800' : 'text-slate-600'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <AddVictimDialog
        isOpen={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        onSubmit={(data) => console.log("updated:", data)}
        caseId="C-2053"
        initialData={updateTarget}
      />
    </section>
  );
};

export default CaseVictim;
