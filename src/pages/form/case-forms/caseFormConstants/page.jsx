
export const PROVINCES = [
  "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
  "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu & Kashmir",
];

export const CASE_TYPES = [
  "Murder / Homicide", "Rape / Sexual Assault", "Robbery / Armed Robbery",
  "Theft / Burglary", "Assault / Battery", "Fraud / Cybercrime",
  "Kidnapping / Abduction", "Drug Trafficking", "Extortion / Blackmail",
  "Missing Person", "Terrorism / Extremism", "Smuggling", "Other",
];

export const WEAPONS = [
  "Firearm (Pistol)", "Firearm (Rifle)", "Firearm (Shotgun)", "Knife / Blade",
  "Blunt Object", "Vehicle", "Chemical / Poison", "Explosive Device",
  "Hands / Feet (Physical)", "Unknown", "None / Not Applicable",
];

export const RELATION_TO_VICTIM = [
  "Stranger", "Neighbor", "Colleague", "Friend", "Family Member",
  "Spouse / Partner", "Ex-Partner", "Employer / Employee", "Unknown",
];

export const INJURY_TYPES = [
  "Fatal (Death)", "Severe / Critical", "Moderate", "Minor",
  "No Physical Injury", "Psychological Trauma",
];

export const EVIDENCE_TYPES = [
  "CCTV / Video Footage", "Photograph", "Fingerprint", "DNA Sample",
  "Weapon", "Document / Paper", "Digital Evidence", "Witness Statement",
  "Medical Report", "Forensic Report", "Physical Object", "Other",
];

export const SUSPECT_STATUSES = [
  "At Large", "Detained", "Arrested", "Charged",
  "Absconding", "Under Surveillance", "Released",
];

export const VICTIM_STATUSES = [
  "Alive", "Deceased", "Critical Condition", "Hospitalized", "Missing",
];

export const THREAT_LEVELS = ["Low", "Medium", "High", "Critical"];

export const DECLARED_DEAD_OPTIONS = [
  "At scene",
  "On arrival at hospital",
  "During treatment",
  "Pronounced later",
  "Unknown",
];

export const POSTMORTEM_OPTIONS = [
  "Conducted",
  "Conducted, Pending Report",
  "Scheduled",
  "Pending",
  "Not Required",
  "Refused by Family",
];

export const CASE_STEPS = [
  { id: 1, label: "FIR Upload", short: "Upload", icon: "Upload" },
  { id: 2, label: "Case Details", short: "Case", icon: "FileText" },
  { id: 3, label: "Location", short: "Location", icon: "MapPin" },
  { id: 4, label: "Victim(s)", short: "Victim", icon: "User" },
  { id: 5, label: "Suspect(s)", short: "Suspect", icon: "Users" },
  { id: 6, label: "Crime Details", short: "Crime", icon: "Gavel" },
  { id: 7, label: "Evidence", short: "Evidence", icon: "Camera" },
  { id: 8, label: "Witness(s)", short: "Witness", icon: "File" },
  { id: 9, label: "AI Analysis", short: "AI", icon: "Brain" },
  { id: 10, label: "Review & Submit", short: "Submit", icon: "CheckCircle2" },
];

// UPDATE-only extra steps (appended when mode === "update")
export const UPDATE_EXTRA_STEPS = [
  { id: 10, label: "Update Notes", short: "Notes", icon: "FileText" },
];

/**
 * ADDITIONS for: src/pages/form/case-forms/caseFormConstants/page.jsx
 *
 * Add the constants below alongside the existing exports
 * (RELATION_TO_VICTIM, INJURY_TYPES, VICTIM_STATUSES, …).
 */

// ── Witness option lists ────────────────────────────────────────────────────

export const WITNESS_TYPES = [
  "Eyewitness",
  "Earwitness",
  "Character Witness",
  "Expert Witness",
  "Victim-Witness",
  "Hearsay Witness",
  "Other",
];

export const WITNESS_CREDIBILITY = [
  "High — Corroborated",
  "Medium — Unverified",
  "Low — Contradicted",
  "Unknown",
];

export const WITNESS_STATUSES = [
  "Active",
  "Pending",
  "Closed",
  "Hostile",
  "Unavailable",
];

export const WITNESS_RELATIONS = [
  "Neighbor",
  "Resident",
  "Colleague",
  "Friend",
  "Family Member",
  "Security",
  "Bystander",
  "Stranger",
  "Business Associate",
  "Other",
];

// ── Auto-ID generator (mirrors generateSuspectId / generateVictimId) ────────

const _genWitnessId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `WIT-${ts}-${rand}`;
};

export const generateWitnessId = () => _genWitnessId();

// ── Default factory ─────────────────────────────────────────────────────────

export const defaultWitness = () => ({
  // React key (numeric, never displayed)
  id: Date.now() + Math.random(),
  // Display ID (e.g. "WIT-LZ4...-X9K")
  witnessId: _genWitnessId(),

  // Personal
  name: "",
  age: "",
  gender: "",
  contact: "",
  address: "",

  // Classification
  witnessType: "",
  relationToCase: "",
  credibility: "",
  status: "Active",
  caseId: "",

  // Statement
  statementDate: new Date().toISOString().split("T")[0],
  statementRecordedBy: "",
  description: "",

  // Privacy / safety flags
  anonymous: false,
  protectionRequired: false,
  cooperating: true,

  // Auto-stamped on creation; can be overridden when editing
  dateAdded: new Date().toISOString().split("T")[0],
});

const _genSuspectId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SUS-${ts}-${rand}`;
};
 
// ✅ Returns a plain string — NOT an object
export const generateSuspectId = () => _genSuspectId();

export const defaultSuspect = () => ({
  id: _genSuspectId(),
  name: "Aliat",
  age: "",
  gender: "",
  cnic: "",
  address: "",
  contact: "",
  occupation: "",
  physicalDescription: "",
  knownAffiliations: "",
  criminalRecord: false,
  arrested: false,
  arrivalMethod: "",
  vehicleDescription: "",
  status: "At Large",
  notes: "",
  reason: "",
  alibi: "",
  relationToCase: "",
});

const _genVictimId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `VIC-${ts}-${rand}`;
};

export const generateVictimId = () => _genVictimId();

export const defaultVictim = () => ({
  id: Date.now() + Math.random(),
  victimId: _genVictimId(),

  // Personal
  name: "", age: "", gender: "", cnic: "",
  contact: "", address: "", occupation: "",

  // Incident / injury
  status: "Alive",
  injuryType: "",
  natureOfInjuries: "",
  causeOfDeath: "",
  declaredDead: "",
  postmortemAutopsy: "",
  injurySummary: "",
  injuryRecordedBy: "",
  caseType: "",
  primaryLabel: "",
  relation: "",

  // Flags
  medicalReport: false,
  postmortem: false,
  protectionRequired: false,
  cooperative: true,

  // Forensic findings (array of strings)
  forensic: [],

  timeline: [],

  threatLevel: "",
  protectionAssigned: "",
  protectionNotes: "",
  legal: [],
  nextFollowUp: "",
  statement: "",});

export const defaultEvidence = () => ({
  id: Date.now() + Math.random(),
  type: "", description: "", file: null, fileName: "",
  dateCollected: "", collectedBy: "",
});

export const emptyFormData = () => ({
  // Step 1 – FIR Upload
  firFile: null, firFileName: "", firLanguage: "English", firType: "FIR",
  manualEntry: false, extractedEntities: null,
  completeness: 0, confidence: 0, missingFields: [],

  // Step 2 – Case Details
  caseId: "CASE-2026-" + Math.floor(Math.random() * 9000 + 1000),
  firNumber: "", caseTitle: "", incidentDate: "", incidentTime: "",
  reportingDate: "", reportingTime: "", caseType: "", priority: "",
  caseStatus: "Open", ppcSections: "", description: "",
  reportingOfficer: "", assignedInvestigator: "",

  // Step 3 – Location
  province: "", city: "", area: "", policeStation: "", address: "",
  latitude: "", longitude: "", crimeSceneType: "", sceneAccess: "", landmarks: "",

  // Step 4 – Victims
  victims: [defaultVictim()],

  // Step 5 – Suspects
  suspects: [defaultSuspect()],

  // Step 6 – Crime Details
  weaponUsed: "", weaponDescription: "", vehicleUsed: "", numSuspects: "",
  motive: "", modus: "", witnessAvailable: false, cctv: false,
  crimeDescription: "",
  // Murder extras
  causeOfDeath: "", bodyLocation: "", timeOfDeath: "", postmortemDone: false, forensicDone: false,
  // Rape extras
  medicalExam: "", victimCounseling: false, protectionOrder: false,
  // Theft extras
  stolenItems: "", stolenValue: "", recoveryStatus: "", entryPoint: "",

  // Step 7 – Evidence
  evidences: [],

  witnesses: [defaultWitness()],

  // Update-only extras
  remarks: "", progressPercent: "", nextHearingDate: "", investigatorNotes: "",
});
