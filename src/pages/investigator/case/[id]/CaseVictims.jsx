import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield, Info, CheckCircle2, Mic, Circle, Pencil,
  Loader2, AlertTriangle, User as UserIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import AddVictimDialog from './forms/AddVictim';
import {
  listVictims,
  getVictim,
  updateVictim,
  uploadVictimPhoto,
  deleteVictimPhoto,
  detailToFormShape,
  formatApiError,
} from '@/services/victimApi';

// ─── Case type config ────────────────────────────────────────────────────────
// Defines which detail sections are relevant per case type.
// Add new types here — the UI adapts automatically.

const CASE_TYPE_CONFIG = {
  // ── Murder / Homicide ──────────────────────────────────────────────────────
  murder: {
    label: 'Murder / Homicide',
    showDeceased: true,   // cause of death, declared dead, postmortem
    showInjury: true,
    showForensic: true,
    showProtection: false,
    showLegal: true,
    showTimeline: true,
    showStatement: false, // victim is deceased — no statement
  },
  homicide: {
    label: 'Homicide',
    showDeceased: true,
    showInjury: true,
    showForensic: true,
    showProtection: false,
    showLegal: true,
    showTimeline: true,
    showStatement: false,
  },

  // ── Assault / Injury ───────────────────────────────────────────────────────
  assault: {
    label: 'Assault / Injury',
    showDeceased: false,
    showInjury: true,
    showForensic: true,
    showProtection: true,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },

  // ── Kidnapping / Abduction ─────────────────────────────────────────────────
  kidnapping: {
    label: 'Kidnapping / Abduction',
    showDeceased: false,
    showInjury: false,
    showForensic: true,
    showProtection: true,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },
  abduction: {
    label: 'Abduction',
    showDeceased: false,
    showInjury: false,
    showForensic: true,
    showProtection: true,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },

  // ── Theft / Robbery ────────────────────────────────────────────────────────
  theft: {
    label: 'Theft',
    showDeceased: false,
    showInjury: false,
    showForensic: true,
    showProtection: false,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },
  robbery: {
    label: 'Robbery',
    showDeceased: false,
    showInjury: true,   // robbery can involve physical harm
    showForensic: true,
    showProtection: false,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },

  // ── Sexual Assault ─────────────────────────────────────────────────────────
  'sexual assault': {
    label: 'Sexual Assault',
    showDeceased: false,
    showInjury: true,
    showForensic: true,
    showProtection: true,
    showLegal: true,
    showTimeline: true,
    showStatement: true,
  },
};

// Fallback config for unrecognised / generic case types
const DEFAULT_CASE_CONFIG = {
  label: 'General',
  showDeceased: false,
  showInjury: true,
  showForensic: true,
  showProtection: true,
  showLegal: true,
  showTimeline: true,
  showStatement: true,
};

/** Resolve config from a raw caseType string (case-insensitive). */
const getCaseConfig = (caseType) => {
  if (!caseType) return DEFAULT_CASE_CONFIG;
  return CASE_TYPE_CONFIG[caseType.toLowerCase().trim()] ?? DEFAULT_CASE_CONFIG;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────


/** Returns up to 2 uppercase initials from a name string. */
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const VictimAvatar = ({ name, src }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(name);

  if (!src || imgFailed) {
    return (
      <div
        className="size-18 rounded-full border-2 border-white/20 bg-slate-500 shrink-0
                   flex items-center justify-center select-none"
        aria-label={`Avatar for ${name || 'unknown'}`}
      >
        <span className="text-white font-bold text-lg leading-none">{initials}</span>
      </div>
    );
  }

  return (
    <div className="size-18 rounded-full overflow-hidden border-2 border-white/20 bg-slate-400 shrink-0">
      <img src={photoSrc(src)}
        alt={`Photo of ${name || 'victim'}`}
        className="object-cover h-full w-full"
        onError={() => setImgFailed(true)}/>

    </div>
  );
};

// ─── Detail section sub-components ───────────────────────────────────────────

const Row = ({ label, value }) => (
  <p className="grid gap-1 grid-cols-2 text-sm">
    <span className="text-slate-700 font-semibold">{label}:</span>
    <span className="text-slate-600">{value || '—'}</span>
  </p>
);

/** Personal Info — always shown */
const PersonalInfoCard = ({ personal }) => (
  <article
    className="bg-white col-span-2 border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="personal-info-heading"
  >
    <h3
      id="personal-info-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Personal Information
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <div className="space-y-2">
        <Row label="Name" value={personal?.name} />
        <Row label="Age" value={personal?.age} />
        <Row label="Contact" value={personal?.contact} />
      </div>
      <div className="space-y-2">
        <Row label="Gender" value={personal?.gender} />
        <Row label="Occupation" value={personal?.occupation} />
        <Row label="CNIC" value={personal?.cnic} />
      </div>
    </div>
  </article>
);

/**
 * Incident Details card.
 * Deceased fields (cause of death, declared dead, postmortem) are only shown
 * when showDeceased=true (i.e. murder/homicide cases).
 */
const IncidentDetailsCard = ({ incident, showDeceased }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="incident-details-heading"
  >
    <h3
      id="incident-details-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Incident Details
    </h3>
    <div className="space-y-2">
      <Row label="Residential Address" value={incident?.residentialAddress} />
      <Row label="Nature of Injuries" value={incident?.natureOfInjuries} />

      {/* ── Deceased-only fields ── */}
      {showDeceased && (
        <>
          <Row label="Cause of Death" value={incident?.causeOfDeath} />
          <Row label="Declared Dead" value={incident?.declaredDead} />
          <Row label="Postmortem / Autopsy" value={incident?.postmortemAutopsy} />
        </>
      )}
    </div>
  </article>
);

/** Injury & Medical — shown when showInjury=true */
const InjuryCard = ({ injurySummary, injuryRecordedBy }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="injury-heading"
  >
    <h3
      id="injury-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Injury &amp; Medical Status
    </h3>
    <div className="bg-deep-ocean-500 text-white rounded-md px-4 py-3 mb-3">
      <p className="font-medium">{injurySummary || '—'}</p>
    </div>
    {injuryRecordedBy && (
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Mic size={14} className="shrink-0" aria-hidden />
        Recorded by {injuryRecordedBy}.&nbsp;
        <CheckCircle2 size={14} className="inline text-emerald-600" aria-hidden />
        Verified
      </p>
    )}
  </article>
);

/** Victim statement — shown when showStatement=true */
const StatementCard = ({ statement }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="statement-heading"
  >
    <h3
      id="statement-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Victim Statement
    </h3>
    {statement ? (
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{statement}</p>
    ) : (
      <p className="text-sm text-slate-500">No statement recorded yet.</p>
    )}
  </article>
);

/** Forensic Summary — shown when showForensic=true */
const ForensicCard = ({ forensic }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="forensic-heading"
  >
    <h3
      id="forensic-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Forensic Summary
    </h3>
    {forensic?.length ? (
      <ul className="list-none space-y-2 text-sm text-slate-700">
        {forensic.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-deep-ocean-900 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-500">No forensic findings recorded yet.</p>
    )}
  </article>
);

/** Activity Timeline — shown when showTimeline=true */
const TimelineCard = ({ timeline }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm lg:col-span-2"
    aria-labelledby="timeline-heading"
  >
    <h3
      id="timeline-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Victim's Activity Timeline
    </h3>
    {!timeline?.length ? (
      <p className="text-sm text-slate-500">No timeline entries yet.</p>
    ) : (
      <ul
        className="relative space-y-0 pl-6 grid-cols-2 grid ml-2"
        role="list"
      >
        {timeline.map((entry, i) => (
          <li key={i} className="relative pb-4 last:pb-0">
            <span
              className="absolute -left-8 top-0.5 w-3 h-3 rounded-full bg-deep-ocean-500 border-2 border-soft-mist shadow"
              aria-hidden
            />
            <p className="text-sm font-medium text-slate-800">{entry.date || '—'}</p>
            <p className="text-sm text-slate-600">{entry.text}</p>
          </li>
        ))}
      </ul>
    )}
  </article>
);

/** Protection Status — shown when showProtection=true */
const ProtectionCard = ({ protection }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="protection-heading"
  >
    <h3
      id="protection-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"
    >
      <Shield size={20} className="text-slate-600" aria-hidden />
      Protection Status
    </h3>
    <div className="space-y-2 text-sm">
      <Row label="Threat Level" value={protection?.threatLevel} />
      <Row label="Protection Assigned" value={protection?.protectionAssigned} />
      <Row label="Notes" value={protection?.notes} />
    </div>
  </article>
);

//photoSrc helper at the top of the file:
const photoSrc = (rawUrl) => {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http')) return rawUrl;
  if (rawUrl.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
  return rawUrl;
};


// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 6 (optional) — Tab cards: render a tiny photoUrl thumbnail next to
// the title so the tab is recognizable at a glance. Inside the existing
// .map((v) => <button …>) replace the inner content with:
// //

/** Legal Status — shown when showLegal=true */
const LegalCard = ({ legal }) => (
  <article
    className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
    aria-labelledby="legal-heading"
  >
    <h3
      id="legal-heading"
      className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4"
    >
      Legal Status
    </h3>
    {legal?.length ? (
      <ul className="space-y-2 text-sm">
        {legal.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {item.done ? (
              <CheckCircle2 size={18} className="text-emerald-green shrink-0" aria-hidden />
            ) : (
              <Circle size={18} className="text-slate-300 shrink-0" aria-hidden />
            )}
            <span className={item.done ? 'text-slate-800' : 'text-slate-600'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-500">No legal milestones recorded yet.</p>
    )}
  </article>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CaseVictim = () => {
  const { id: caseIdFromUrl } = useParams();
  const caseId = caseIdFromUrl || 'C-2053';

  const [victims, setVictims] = useState([]);
  const [selectedVictimId, setSelectedVictimId] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);

  const [updateTarget, setUpdateTarget] = useState(null);
  const [updating, setUpdating] = useState(false);

  const detailReqSeq = useRef(0);

  const fetchList = useCallback(async () => {
    if (!caseId) return;
    setLoadingList(true);
    setError(null);
    try {
      const data = await listVictims(caseId);
      const items = data?.items || [];
      setVictims(items);
      if (items.length && !selectedVictimId) {
        setSelectedVictimId(items[0].id);
      } else if (!items.length) {
        setSelectedVictimId(null);
        setDetails(null);
      }
    } catch (err) {
      console.error('Failed to load victims:', err);
      setError(formatApiError(err, 'Could not load victims.'));
      setVictims([]);
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Detail fetch
  useEffect(() => {
    if (!selectedVictimId || !caseId) { setDetails(null); return; }
    const seq = ++detailReqSeq.current;
    setLoadingDetails(true);

    (async () => {
      try {
        const data = await getVictim(caseId, selectedVictimId);
        if (seq !== detailReqSeq.current) return;
        setDetails(data);
      } catch (err) {
        if (seq !== detailReqSeq.current) return;
        console.error('Failed to load victim detail:', err);
        setError(formatApiError(err, 'Could not load victim details.'));
        setDetails(null);
      } finally {
        if (seq === detailReqSeq.current) setLoadingDetails(false);
      }
    })();
  }, [selectedVictimId, caseId]);


  useEffect(()=>{
    fetchList()
  }, [updateTarget])

  const handleUpdateSubmit = async ({ caseId: cid, victims, isUpdate }) => {
    if (!isUpdate) {
      return { ok: false, error: 'CaseVictims only handles updates here.' };
    }
    const vid = updateTarget?.id;
    const first = victims?.[0];
    if (!vid || !first) {
      setUpdateTarget(null);
      return { ok: false, error: 'Missing victim reference.' };
    }

    setUpdating(true);
    try {
      const { detail, photo_failures } = await updateVictim(cid, vid, first);

    setDetails(detail);
    fetchList();

      return { ok: true, detail, photo_failures };
    } catch (err) {
      console.error('Update failed:', err);
      return { ok: false, error: formatApiError(err, 'Update failed.') };
    } finally {
      setUpdating(false);
      setTimeout(() => setUpdateTarget(null), 0);
    }
  };


  // ── Early returns ─────────────────────────────────────────────────────────
  if (loadingList) {
    return (
      <section className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm">
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading victims…</span>
        </div>
      </section>
    );
  }

  if (error && !victims.length) {
    return (
      <section className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Could not load victims</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchList}
            className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer px-2"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!victims.length) {
    return (
      <section className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Victims</h2>
          <p className="text-sm text-slate-600 mt-1">View all victims and their case involvement</p>
        </header>
        <div className="text-center py-16 text-slate-400">
          <UserIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No victims linked to this case yet.</p>
          <p className="text-xs mt-1">Add victims from the case page header.</p>
        </div>
      </section>
    );
  }

  // Derive the config once the details are loaded
  const cfg = getCaseConfig(details?.caseType);
  const victimName = details?.personal?.name || '';

  return (
    <section
      className="bg-white rounded-t-lg border-x border-t border-slate-300 p-6 shadow-sm"
      aria-label="Victims"
    >
      {/* ── Header ── */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Victims</h2>
        <p className="text-sm text-slate-600 mt-1">View all victims and their case involvement</p>
      </header>

      {/* ── Victim tabs ── */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        role="tablist"
        aria-label="Select victim"
      >
        {victims.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={selectedVictimId === v.id}
            aria-controls="victim-details-panel"
            id={`victim-tab-${v.id}`}
            onClick={() => setSelectedVictimId(v.id)}
            className={`rounded-xl cursor-pointer p-5 text-left transition-all shadow-inner shadow-deep-ocean-900/50
              focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2
              ${selectedVictimId === v.id
                ? 'bg-slate-blue text-white'
                : 'bg-cool-silver text-slate-700 hover:bg-deep-ocean hover:text-slate-300 shadow-deep-ocean/30'
              }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{v.title}</h3>
                <p className={`text-sm ${selectedVictimId === v.id ? 'opacity-90' : ''}`}>
                  {v.role || '—'}
                </p>
              </div>
              <Badge
                variant={v.statusVariant === 'fatal' ? 'destructive' : 'success'}
                size="sm"
                className="shrink-0 px-4 py-2"
              >
                {v.statusVariant === 'fatal'
                  ? <Info size={14} aria-hidden className="mr-2" />
                  : <CheckCircle2 size={14} aria-hidden className="mr-2" />}
                {v.status}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* ── Detail body ── */}
      {loadingDetails || !details ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading details…</span>
        </div>
      ) : (
        <>
          {/* Hero header */}
          <div
            id="victim-details-panel"
            role="tabpanel"
            aria-labelledby={`victim-tab-${selectedVictimId}`}
            className="from-deep-ocean bg-linear-60 to-slate-blue rounded-lg p-6 shadow-inner
                       shadow-deep-ocean-900/50 text-white flex flex-col md:flex-row
                       justify-between items-start md:items-center gap-4 mb-8"
          >
            <div className="flex items-center gap-4 flex-wrap">
              {/* Avatar with initials fallback */}
              <div className="relative group">
                <VictimAvatar name={victimName} src={details.photoUrl} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{details.caseType || '—'}</h3>
                <p className="text-xs uppercase opacity-90">{details.primaryLabel || '—'}</p>
                <p className="text-sm mt-2 opacity-90">
                  Next Follow-Up Date: <strong>{details.nextFollowUp || '—'}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-rows-2 gap-2">
              <Button
                variant="default"
                className="px-4 py-2 border border-slate-50"
                onClick={() => setUpdateTarget(detailToFormShape(details))}
                disabled={updating}
                aria-label={`Update victim ${selectedVictimId} details`}
              >
                {updating
                  ? <Loader2 className="h-3.5 w-3.5 mr-3 animate-spin" />
                  : <Pencil className="h-3.5 w-3.5 mr-3" aria-hidden />}
                Update
              </Button>

              <div className="flex flex-wrap gap-3 items-center">
                {details.cooperative && (
                  <Badge
                    variant="success"
                    size="sm"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-forest-teal font-semibold"
                  >
                    <CheckCircle2 size={16} className="text-emerald-green" aria-hidden />
                    Cooperative
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ── Detail cards — rendered conditionally per case type ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Victim details">

            {/* Personal Information — always shown */}
            <PersonalInfoCard personal={details.personal} />

            {/* Incident Details — always shown; deceased sub-fields gated */}
            <IncidentDetailsCard
              incident={details.incident}
              showDeceased={cfg.showDeceased}
            />

            {/* Injury & Medical — assault, robbery, sexual assault */}
            {cfg.showInjury && (
              <InjuryCard
                injurySummary={details.injurySummary}
                injuryRecordedBy={details.injuryRecordedBy}
              />
            )}

            {/* Victim Statement — living victims only */}
            {cfg.showStatement && (
              <StatementCard statement={details.statement} />
            )}

            {/* Forensic Summary */}
            {cfg.showForensic && (
              <ForensicCard forensic={details.forensic} />
            )}

            {/* Activity Timeline — full width */}
            {cfg.showTimeline && (
              <TimelineCard timeline={details.timeline} />
            )}

            {/* Protection Status — kidnapping, assault, sexual assault */}
            {cfg.showProtection && (
              <ProtectionCard protection={details.protection} />
            )}

            {/* Legal Status */}
            {cfg.showLegal && (
              <LegalCard legal={details.legal} />
            )}
          </div>
        </>
      )}

      <AddVictimDialog
        isOpen={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        onSubmit={handleUpdateSubmit}
        caseId={caseId}
        caseType={details?.caseType || ''}
        initialData={updateTarget}
      />
    </section>
  );
};

export default CaseVictim;