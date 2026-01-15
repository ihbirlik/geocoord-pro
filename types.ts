
export enum UserRole {
  ADMIN = 'ADMIN',
  GEOLOGICAL_ENGINEER = 'GEOLOGICAL_ENGINEER',
  GEOPHYSICAL_ENGINEER = 'GEOPHYSICAL_ENGINEER',
  OFFICE_PERSONNEL = 'OFFICE_PERSONNEL',
  TECHNICIAN = 'TECHNICIAN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  FIELD_WORK = 'FIELD_WORK',
  OFFICE_ANALYSIS = 'OFFICE_ANALYSIS',
  REPORTING = 'REPORTING',
  COMPLETED = 'COMPLETED'
}

export interface ProjectDocument {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  size?: string;
  url?: string;
  data?: string; // base64 data for images
  scope?: string; // Purpose of the document (e.g., "Compaction Test Results")
  analysis?: string; // AI generated analysis for this specific document
}

export interface BSTMeasurement {
  id: string;
  stepNumber: number;
  appliedPressure: number; // P_man (Bar)
  first5Min: string;
  second5Min: string;
  totalLoss: string;
  calculatedLugeon?: string;
  effectivePressure?: string; // P_e
}

export interface SPTMeasurement {
  id: string;
  depth: string;
  n1: string; // 0-15cm
  n2: string; // 15-30cm
  n3: string; // 30-45cm
  totalN: number;
  description: string;
}

export interface PressuremeterMeasurement {
  id: string;
  depth: string;
  modulusE: string; // Menard Modulus (kg/cm2 or MPa)
  limitPressurePl: string; // Limit Pressure (kg/cm2 or MPa)
  creepPressurePf: string; // Creep Pressure
  notes: string;
}

export interface PermeabilityMeasurement {
  id: string;
  type: 'LEFRANC' | 'PACKER' | 'PUMPING';
  depthRange: string;
  coefficientK: string; // cm/s or m/s
  notes: string;
}

export type FlowType = 'Laminar' | 'Türbülan' | 'Dilatasyon' | 'Yıkanma' | 'Boşluk Dolumu' | 'Manuel';
export type BSTPressureType = 'TIP_A' | 'TIP_B' | 'TIP_C' | 'TIP_D';

export interface BSTStage {
  id: string;
  startDepth: string;
  endDepth: string;
  pressureType: BSTPressureType;
  maxPressure: string;
  packerType?: 'SINGLE' | 'DOUBLE';
  packerDepth?: string;
  isReversible: boolean;
  measurements: BSTMeasurement[];
  representativeLugeon?: string;
  flowType?: FlowType;
  isFlowTypeManual?: boolean;
}

export interface LithologySegment {
  id: string;
  startDepth: string;
  endDepth: string;
  formation?: string; // Manually entered formation name (e.g., "Ankara Kil")
  description: string;
  rqd: string;
  weathering: string;
  lugeon?: string;
  permeabilityStatus?: string;
  udMarker?: boolean;
}

export type WellType = 'CORED' | 'NON_CORED';

export interface DrillingWell {
  id: string;
  wellNo: string;
  wellType: WellType;
  wellDiameter: string; // mm
  manometerHeight: string; // m
  plannedDepth: string;
  actualDepth: string;
  startDate: string;
  endDate: string;
  coordinateX: string;
  coordinateY: string;
  coordinateZ: string; // Elevation
  machineType?: string;
  drillingFluid?: string;
  casingInfo?: string;
  structureName?: string;
  lithologySegments: LithologySegment[];
  groundwaterStatus: string; // YASS (m)
  hasBST: boolean;
  bstStages: BSTStage[];
  hasSPT: boolean;
  sptMeasurements: SPTMeasurement[];
  pressuremeterMeasurements: PressuremeterMeasurement[];
  pressuremeterDocs?: ProjectDocument[];
  permeabilityMeasurements: PermeabilityMeasurement[];
  corePhotos: ProjectDocument[];
}

export interface TrialPit {
  id: string;
  pitNo: string;
  depth: string;
  coordinateX: string;
  coordinateY: string;
  photos: ProjectDocument[];
  lithologySegments: LithologySegment[];
}

export interface ObservationPoint {
  id: string;
  name: string;
  coordinateX: string;
  coordinateY: string;
  notes: string;
  photos: ProjectDocument[];
}

export interface RouteGeology {
  id: string;
  name: string;
  length: string;
  pits: TrialPit[];
  observations: ObservationPoint[];
}

export enum LabTestCategory {
  GEOTECHNICAL = 'GEOTECHNICAL',
  MATERIAL = 'MATERIAL'
}

export interface LabTest {
  id: string;
  category: LabTestCategory;
  name: string;
  sampleId: string;
  depth?: string;
  location?: string;
  status: 'PENDING' | 'COMPLETED';
  results: string;
  date: string;
  dynamicFields?: Record<string, string>;
}

export interface DynamicLabTable {
  id: string;
  sourceFileName: string;
  headers: string[];
  rows: string[][];
  manualNotes: string;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface ModuleData {
  notes: string;
  documents: ProjectDocument[];
  drillingWells?: DrillingWell[];
  labTests?: LabTest[];
  dynamicTables?: DynamicLabTable[];
  savedAnalyses?: SavedAnalysis[];
  labCustomHeaders?: string[];
  routes?: RouteGeology[];
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: ProjectStatus;
  leadEngineer: string;
  startDate: string;
  description: string;
  tasks: ProjectTask[];
  selectedWorkTypes: string[];
  workData?: Record<string, ModuleData>;
  projectDocuments: ProjectDocument[];
}

export interface ProjectTask {
  id: string;
  title: string;
  assignedTo: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  type: 'FIELD' | 'OFFICE';
}
