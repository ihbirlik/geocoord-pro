import React, { useState, useRef, useEffect } from 'react';
import { 
  Project, 
  ProjectStatus, 
  User, 
  ProjectDocument, 
  DrillingWell, 
  BSTStage, 
  BSTMeasurement,
  LithologySegment,
  FlowType,
  ModuleData,
  WellType,
  LabTest,
  LabTestCategory,
  SavedAnalysis,
  RouteGeology,
  TrialPit,
  ObservationPoint,
  SPTMeasurement,
  PressuremeterMeasurement,
  PermeabilityMeasurement
} from '../types';
import { 
  analyzeCorePhotos, 
  analyzeLabResults, 
  generateFullGeologicalReport,
  analyzeSingleLabDocument,
  analyzeMapOrSection,
  analyzeTrialPitPhotos,
  analyzeExperimentData
} from '../services/geminiService';
import { 
  Plus, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  X,
  ChevronLeft, 
  Save,
  FileText,
  Activity,
  Layers,
  Map as MapIcon,
  Trash2,
  Database,
  Camera,
  Info,
  Droplets,
  Upload,
  ArrowDownToLine,
  MapPin,
  Settings2,
  ArrowUp,
  ArrowRightLeft,
  Search,
  FileUp,
  Eye,
  Download,
  Printer,
  FileCheck,
  MapPinIcon,
  Pickaxe,
  Edit2,
  RefreshCcw,
  Construction,
  Zap,
  Table as TableIcon,
  Ruler,
  FileSpreadsheet,
  Gauge,
  Wind,
  Target,
  FileSearch,
  FileDown,
  BookOpen,
  Route as RouteIcon
} from 'lucide-react';

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-4 report-content">
      {lines.map((line, index) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-3xl font-black text-slate-900 border-b-4 border-indigo-600 pb-4 mt-10 mb-6 uppercase tracking-tight leading-tight">
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-bold text-indigo-700 mt-8 mb-4 tracking-wide flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-500 rounded-full" />
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-bold text-slate-800 mt-6 mb-2 underline decoration-indigo-200 decoration-4">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.trim().startsWith('* ')) {
          const content = line.trim().replace('* ', '');
          return (
            <div key={index} className="flex gap-4 ml-6 items-start">
              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2.5 shrink-0" />
              <span className="text-slate-700 text-lg leading-relaxed">{renderBold(content)}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={index} className="h-4" />;
        return (
          <p key={index} className="text-slate-700 text-lg leading-relaxed font-normal text-justify">
            {renderBold(line)}
          </p>
        );
      })}
    </div>
  );
};

const renderBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-900 px-0.5">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const detectFlowType = (measurements: BSTMeasurement[]): FlowType => {
  if (measurements.length < 3) return 'Laminar';
  const lus = measurements.map(m => parseFloat(m.calculatedLugeon || '0')).filter(l => l > 0);
  if (lus.length < 3) return 'Laminar';
  const first = lus[0];
  const max = Math.max(...lus);
  const last = lus[lus.length - 1];
  if (last > first * 1.5) return 'Yıkanma';
  if (max > first * 1.2 && last < max) return 'Dilatasyon';
  if (lus[Math.floor(lus.length/2)] < first * 0.8) return 'Türbülan';
  return 'Laminar';
};

const getPermeabilityStatus = (lugeon: string): string => {
  const lu = parseFloat(lugeon);
  if (isNaN(lu)) return "-";
  if (lu < 1) return "Çok Az Geçirimli / Sızdırmaz";
  if (lu >= 1 && lu < 5) return "Az Geçirimli";
  if (lu >= 5 && lu < 25) return "Orta Geçirimli";
  if (lu >= 25 && lu < 100) return "Çok Geçirimli";
  return "Aşırı Geçirimli / Boşluklu";
};

const WORK_TYPES = [
  { id: "Sondaj Çalışmaları", icon: Activity, description: "Kuyu logları, SPT ve BST verileri." },
  { id: "Doğal Yapı Malzeme Çalışmaları", icon: Layers, description: "Ocak etütleri ve malzeme kalitesi." },
  { id: "Güzergah Jeolojisi Etütleri", icon: MapIcon, description: "Güzergah, Araştırma Çukuru ve Gözlem Noktaları." },
  { id: "Laboratuvar Çalışmaları", icon: Database, description: "Zemin ve kaya mekaniği deneyleri." },
  { id: "Harita ve Kesitler", icon: MapIcon, description: "Jeolojik haritalama enkesitler ve CAD analizleri." },
  { id: "Genel Değerlendirme", icon: Sparkles, description: "Proje final raporu ve AI sentezi." },
];

const INITIAL_WELL_STATE: Partial<DrillingWell> = {
  wellNo: '',
  wellType: 'CORED' as WellType,
  wellDiameter: '76', 
  manometerHeight: '1.0',
  plannedDepth: '20',
  actualDepth: '20',
  coordinateX: '',
  coordinateY: '',
  coordinateZ: '',
  machineType: '',
  drillingFluid: 'Su',
  groundwaterStatus: '0.0', 
  lithologySegments: [],
  hasBST: true,
  bstStages: [],
  hasSPT: false,
  sptMeasurements: [],
  pressuremeterMeasurements: [],
  pressuremeterDocs: [],
  permeabilityMeasurements: [],
  corePhotos: [],
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
};

const INITIAL_PROJECT_STATE: Partial<Project> = {
  name: '',
  location: '',
  leadEngineer: '',
  startDate: new Date().toISOString().split('T')[0],
  description: '',
  selectedWorkTypes: ["Sondaj Çalışmaları", "Laboratuvar Çalışmaları", "Genel Değerlendirme"]
};

const ProjectManagement: React.FC<{ user: User }> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>(INITIAL_PROJECT_STATE);
  
  const [drillingWells, setDrillingWells] = useState<DrillingWell[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [moduleDocs, setModuleDocs] = useState<ProjectDocument[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [routes, setRoutes] = useState<RouteGeology[]>([]);
  
  const [activeRoute, setActiveRoute] = useState<RouteGeology | null>(null);
  const [isTrialPitModalOpen, setIsTrialPitModalOpen] = useState(false);
  const [currentTrialPit, setCurrentTrialPit] = useState<Partial<TrialPit>>({});
  
  const [isWellModalOpen, setIsWellModalOpen] = useState(false);
  const [wellTab, setWellTab] = useState<'genel' | 'litoloji' | 'spt' | 'bst' | 'presiyometre' | 'permabilite' | 'fotograf'>('genel');
  const [labTab, setLabTab] = useState<'sonuclar' | 'arsiv'>('sonuclar');
  
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [previewPhoto, setPreviewPhoto] = useState<ProjectDocument | null>(null);
  const [analysisInterval, setAnalysisInterval] = useState<number>(1.5);
  const [bstIntervalSize, setBstIntervalSize] = useState<string>("5.0");

  const [tabAnalysis, setTabAnalysis] = useState<Record<string, string>>({});
  const [isTabAnalyzing, setIsTabAnalyzing] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const labInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const routePhotoInputRef = useRef<HTMLInputElement>(null);
  const pressuremeterInputRef = useRef<HTMLInputElement>(null);
  const [currentWell, setCurrentWell] = useState<Partial<DrillingWell>>(INITIAL_WELL_STATE);

  const openModule = (type: string) => {
    if (!selectedProject) return;
    setActiveModule(type);
    const data = selectedProject.workData?.[type];
    setDrillingWells(data?.drillingWells || []);
    setLabTests(data?.labTests || []);
    setModuleDocs(data?.documents || []);
    setSavedAnalyses(data?.savedAnalyses || []);
    setRoutes(data?.routes || []);
    setEvaluationResult(null);
    setTabAnalysis({});
  };

  const handleSaveModuleData = () => {
    if (!selectedProject || !activeModule) return;
    const updatedWorkData: Record<string, ModuleData> = { 
      ...(selectedProject.workData || {}), 
      [activeModule]: { 
        notes: "", 
        documents: moduleDocs, 
        drillingWells, 
        labTests, 
        savedAnalyses,
        routes
      } 
    };
    const updatedProject: Project = { ...selectedProject, workData: updatedWorkData };
    setProjects(prev => prev.map(p => p.id === selectedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
    setActiveModule(null);
    setActiveRoute(null);
  };

  const handleEvaluateResults = async () => {
    if (!selectedProject) return;
    setIsEvaluating(true);
    try {
      const projectData = {
        meta: {
          name: selectedProject.name,
          location: selectedProject.location,
          engineer: selectedProject.leadEngineer,
          description: selectedProject.description
        },
        wells: drillingWells,
        lab: { tests: labTests },
        analyses: savedAnalyses,
        routes: routes
      };
      const report = await generateFullGeologicalReport(projectData);
      setEvaluationResult(report);
    } catch (error) {
      console.error("Evaluation error:", error);
      setEvaluationResult("# Hata\nRapor oluşturulurken bir teknik sorun oluştu.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTabAnalysis = async (type: 'SPT' | 'BST' | 'PRESIYOMETRE' | 'PERMABILITE' | 'GENEL_WELL' | 'ROUTE' | 'TRIAL_PIT', data: any) => {
    setIsTabAnalyzing(true);
    try {
      let identifier = "Tanımsız";
      if (type === 'GENEL_WELL' || type === 'SPT' || type === 'BST' || type === 'PRESIYOMETRE' || type === 'PERMABILITE') {
        identifier = currentWell.wellNo || "Kuyu";
      } else if (type === 'ROUTE') {
        identifier = activeRoute?.name || "Güzergah";
      } else if (type === 'TRIAL_PIT') {
        identifier = currentTrialPit.pitNo || "Çukur";
      }
      const result = await analyzeExperimentData(type as any, data, identifier);
      setTabAnalysis(prev => ({ ...prev, [type]: result }));
    } catch (error) {
      alert("Analiz sırasında hata oluştu.");
    } finally {
      setIsTabAnalyzing(false);
    }
  };

  const calculateLugeonAdvanced = (totalLoss: number, pMan: number, L: number, yass: number, manoH: number, centerDepth: number, wellDia: number) => {
    if (isNaN(L) || L <= 0) return { lu: 0, pe: 0 };
    const qMin = totalLoss / 10;
    const hStatic = Math.max(0, centerDepth + manoH - yass);
    const pStatic = hStatic / 10; 
    const frictionFactor = wellDia >= 96 ? 0.0001 : (wellDia >= 76 ? 0.0004 : 0.0012); 
    const pFriction = (qMin * qMin) * frictionFactor * (centerDepth / 30); 
    const Pe = pMan + pStatic - pFriction;
    if (isNaN(Pe) || Pe <= 0) return { lu: 0, pe: Pe > 0 ? Pe : 0 };
    const lu = (10 * qMin) / (Pe * L);
    return { lu: isNaN(lu) ? 0 : lu, pe: Pe };
  };

  const generatePressureSteps = (maxP: number, type: string, reversible: boolean): number[] => {
    const p = parseFloat(maxP.toString()) || 1;
    let baseSteps: number[] = [];

    if (type === 'TIP_A') {
      for (let i = 1; i <= p; i++) baseSteps.push(i);
    } else if (type === 'TIP_B') {
      for (let i = 2; i <= p; i += 2) baseSteps.push(i);
      if (baseSteps.length === 0 || baseSteps[baseSteps.length - 1] !== p) baseSteps.push(p);
    } else if (type === 'TIP_C') {
      const seq = [3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      baseSteps = seq.filter(s => s <= p);
      if (baseSteps.length === 0 || baseSteps[baseSteps.length - 1] !== p) baseSteps.push(p);
    } else {
      baseSteps = [Math.max(1, Math.round(p/3)), Math.max(1, Math.round(2*p/3)), p];
    }

    baseSteps = Array.from(new Set(baseSteps)).sort((a, b) => a - b);

    if (reversible) {
      const reversed = [...baseSteps].reverse().slice(1);
      return [...baseSteps, ...reversed];
    }
    return baseSteps;
  };

  const recalculateAllBST = (well: Partial<DrillingWell>) => {
    if (!well.bstStages) return [];
    const yass = parseFloat(well.groundwaterStatus || '0');
    const manoH = parseFloat(well.manometerHeight || '1.0');
    const wellDia = parseFloat(well.wellDiameter || '76');
    return well.bstStages.map(stage => {
      const sDepth = parseFloat(stage.startDepth) || 0;
      const eDepth = parseFloat(stage.endDepth) || 0;
      const L = Math.abs(eDepth - sDepth);
      const centerDepth = sDepth + (L / 2);
      const measurements = stage.measurements.map(m => {
        const { lu, pe } = calculateLugeonAdvanced(parseFloat(m.totalLoss) || 0, m.appliedPressure, L, yass, manoH, centerDepth, wellDia);
        return { ...m, calculatedLugeon: lu.toFixed(2), effectivePressure: pe.toFixed(2) };
      });
      let fType = detectFlowType(measurements);
      const middleIndex = Math.floor(measurements.length / 2);
      const representativeLu = measurements[middleIndex]?.calculatedLugeon || '0.00';
      return { ...stage, measurements, flowType: fType, representativeLugeon: representativeLu };
    });
  };

  const handleBSTConfigChange = (stageId: string, field: keyof BSTStage, value: any) => {
    setCurrentWell(prev => {
      let stages = [...(prev.bstStages || [])];
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex !== -1) {
        let updatedStage = { ...stages[stageIndex], [field]: value };
        
        if (field === 'maxPressure' || field === 'isReversible' || field === 'pressureType') {
          const newMaxP = field === 'maxPressure' ? parseFloat(value) : parseFloat(updatedStage.maxPressure);
          const isRev = field === 'isReversible' ? value : updatedStage.isReversible;
          const pType = field === 'pressureType' ? value : updatedStage.pressureType;
          const steps = generatePressureSteps(newMaxP, pType, isRev);
          
          updatedStage.measurements = steps.map((p, idx) => ({
            id: Math.random().toString(36).substr(2, 9),
            stepNumber: idx + 1,
            appliedPressure: p,
            first5Min: '0',
            second5Min: '0',
            totalLoss: '0',
            calculatedLugeon: '0.00',
            effectivePressure: '0.00'
          }));
        }
        stages[stageIndex] = updatedStage;
      }
      const wellWithUpdatedStages = { ...prev, bstStages: stages };
      return { ...wellWithUpdatedStages, bstStages: recalculateAllBST(wellWithUpdatedStages) };
    });
  };

  const addBSTStage = () => {
    const deepestPoint = currentWell.bstStages?.length 
      ? Math.max(...currentWell.bstStages.map(s => parseFloat(s.endDepth)))
      : 0;
    
    const interval = parseFloat(bstIntervalSize) || 5.0;
    const startD = deepestPoint.toString();
    const endD = (deepestPoint + interval).toFixed(2);
    const pType = 'TIP_B';
    const maxP = 6;
    const isRev = true;
    
    const newStage: BSTStage = { 
      id: Math.random().toString(36).substr(2, 9), 
      startDepth: startD, 
      endDepth: endD, 
      pressureType: pType as any, 
      maxPressure: maxP.toString(), 
      isReversible: isRev, 
      measurements: [] 
    };

    const steps = generatePressureSteps(maxP, pType, isRev);
    newStage.measurements = steps.map((p, idx) => ({ 
      id: Math.random().toString(36).substr(2, 9), 
      stepNumber: idx + 1, 
      appliedPressure: p, 
      first5Min: '0', 
      second5Min: '0', 
      totalLoss: '0', 
      calculatedLugeon: '0.00', 
      effectivePressure: '0.00' 
    }));

    setCurrentWell(prev => {
        const updatedWell = { ...prev, bstStages: [newStage, ...(prev.bstStages || [])] };
        return { ...updatedWell, bstStages: recalculateAllBST(updatedWell) };
    });
  };

  const addSPTMeasurement = () => {
    const newSpt: SPTMeasurement = {
      id: Math.random().toString(36).substr(2, 9),
      depth: '1.50',
      n1: '0',
      n2: '0',
      n3: '0',
      totalN: 0,
      description: ''
    };
    setCurrentWell(prev => ({ ...prev, sptMeasurements: [newSpt, ...(prev.sptMeasurements || [])] }));
  };

  const updateSPTValue = (id: string, field: keyof SPTMeasurement, value: string) => {
    setCurrentWell(prev => {
      const updated = (prev.sptMeasurements || []).map(m => {
        if (m.id === id) {
          const up = { ...m, [field]: value };
          if (['n1', 'n2', 'n3'].includes(field)) {
            up.totalN = (parseInt(up.n2) || 0) + (parseInt(up.n3) || 0);
          }
          return up;
        }
        return m;
      });
      return { ...prev, sptMeasurements: updated };
    });
  };

  const addPressuremeterMeasurement = () => {
    const newPm: PressuremeterMeasurement = {
      id: Math.random().toString(36).substr(2, 9),
      depth: '1.0',
      modulusE: '0',
      limitPressurePl: '0',
      creepPressurePf: '0',
      notes: ''
    };
    setCurrentWell(prev => ({ ...prev, pressuremeterMeasurements: [newPm, ...(prev.pressuremeterMeasurements || [])] }));
  };

  const addPermeabilityMeasurement = () => {
    const newP: PermeabilityMeasurement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'LEFRANC',
      depthRange: '0.0 - 5.0',
      coefficientK: '0',
      notes: ''
    };
    setCurrentWell(prev => ({ ...prev, permeabilityMeasurements: [newP, ...(prev.permeabilityMeasurements || [])] }));
  };

  const handlePressuremeterFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const newDocs: ProjectDocument[] = [];
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        name: file.name, 
        fileName: file.name, 
        fileType: file.type, 
        uploadDate: new Date().toLocaleDateString('tr-TR'), 
        data: base64,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
    }
    setCurrentWell(prev => ({ ...prev, pressuremeterDocs: [...(prev.pressuremeterDocs || []), ...newDocs] }));
  };

  const analyzePressuremeterDoc = async (doc: ProjectDocument) => {
    if (!doc.data) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSingleLabDocument({ data: doc.data, mimeType: doc.fileType }, "Presiyometre Deney Formu");
      setCurrentWell(prev => ({
        ...prev,
        pressuremeterDocs: (prev.pressuremeterDocs || []).map(d => d.id === doc.id ? { ...d, analysis } : d)
      }));
    } catch (err) {
      alert("Form analizi başarısız.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateBSTMeasurementValue = (stageId: string, mId: string, field: keyof BSTMeasurement, value: string) => {
    setCurrentWell(prev => {
      const stages = (prev.bstStages || []).map(stage => {
        if (stage.id === stageId) {
          const sDepth = parseFloat(stage.startDepth) || 0;
          const eDepth = parseFloat(stage.endDepth) || 0;
          const L = Math.abs(eDepth - sDepth);
          const yass = parseFloat(prev.groundwaterStatus || '0');
          const manoH = parseFloat(prev.manometerHeight || '1.0');
          const centerDepth = sDepth + (L / 2);
          const wellDia = parseFloat(prev.wellDiameter || '76');
          const measurements = stage.measurements.map(m => {
            if (m.id === mId) {
              const updatedM = { ...m, [field]: value };
              const { lu, pe } = calculateLugeonAdvanced(parseFloat(updatedM.totalLoss) || 0, m.appliedPressure, L, yass, manoH, centerDepth, wellDia);
              updatedM.calculatedLugeon = lu.toFixed(2);
              updatedM.effectivePressure = pe.toFixed(2);
              return updatedM;
            }
            return m;
          });
          return { ...stage, measurements };
        }
        return stage;
      });
      const wellWithUpdatedStages = { ...prev, bstStages: stages };
      return { ...wellWithUpdatedStages, bstStages: recalculateAllBST(wellWithUpdatedStages) };
    });
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    const newDocs: ProjectDocument[] = [];
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        name: file.name, 
        fileName: file.name, 
        fileType: file.type, 
        uploadDate: new Date().toLocaleDateString('tr-TR'), 
        data: base64,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
    }
    setCurrentWell(prev => ({ ...prev, corePhotos: [...(prev.corePhotos || []), ...newDocs] }));
  };

  const startAIPhotoAnalysis = async () => {
    if (!currentWell.corePhotos || currentWell.corePhotos.length === 0) {
      alert("Lütfen önce karot fotoğraflarını yükleyin.");
      return;
    }
    const imagesForAI = currentWell.corePhotos
      .filter(p => p.fileType.startsWith('image/'))
      .map(p => ({ data: p.data!, mimeType: p.fileType }));

    setIsAnalyzing(true);
    try {
      const segments = await analyzeCorePhotos(imagesForAI, analysisInterval);
      if (segments && segments.length > 0) {
        setCurrentWell(prev => ({ 
          ...prev, 
          lithologySegments: segments.map((s: any) => ({ ...s, id: Math.random().toString(36).substr(2, 9), formation: "" })) 
        }));
        setWellTab('litoloji');
      } else {
        alert("Görüntü analiz edilemedi.");
      }
    } catch (error) { 
      alert("AI analizi sırasında bir hata oluştu.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const syncBSTToLog = () => {
    if (!currentWell.bstStages || !currentWell.lithologySegments) return;
    setCurrentWell(prev => {
      const updatedSegments = (prev.lithologySegments || []).map(seg => {
        const sDepth = parseFloat(seg.startDepth);
        const eDepth = parseFloat(seg.endDepth);
        const matchingStage = prev.bstStages?.find(stage => {
          const stageStart = parseFloat(stage.startDepth);
          const stageEnd = parseFloat(stage.endDepth);
          return (sDepth >= stageStart && sDepth < stageEnd) || (eDepth > stageStart && eDepth <= stageEnd);
        });
        if (matchingStage) {
          const lu = matchingStage.representativeLugeon || "0.00";
          return { ...seg, lugeon: lu, permeabilityStatus: getPermeabilityStatus(lu) };
        }
        return seg;
      });
      return { ...prev, lithologySegments: updatedSegments };
    });
  };

  const handleMapFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const newDocs: ProjectDocument[] = [];
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        name: file.name, 
        fileName: file.name, 
        fileType: file.type, 
        uploadDate: new Date().toLocaleDateString('tr-TR'), 
        data: base64,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
    }
    setModuleDocs(prev => [...prev, ...newDocs]);
  };

  const analyzeMapWithAI = async (doc: ProjectDocument) => {
    if (!doc.data) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMapOrSection({ data: doc.data, mimeType: doc.fileType }, doc.fileName);
      setModuleDocs(prev => prev.map(d => d.id === doc.id ? { ...d, analysis } : d));
    } catch (err) {
      alert("Harita analizi başarısız.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRoutePhotoUpload = async (files: FileList | null, isPit: boolean) => {
    if (!files) return;
    const newDocs: ProjectDocument[] = [];
    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        name: file.name, 
        fileName: file.name, 
        fileType: file.type, 
        uploadDate: new Date().toLocaleDateString('tr-TR'), 
        data: base64,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
    }
    if (isPit) {
      setCurrentTrialPit(prev => ({ ...prev, photos: [...(prev.photos || []), ...newDocs] }));
    }
  };

  const startAIPitAnalysis = async () => {
    if (!currentTrialPit.photos || currentTrialPit.photos.length === 0) {
      alert("Lütfen önce çukur fotoğraflarını yükleyin.");
      return;
    }
    const imagesForAI = currentTrialPit.photos
      .filter(p => p.fileType.startsWith('image/'))
      .map(p => ({ data: p.data!, mimeType: p.fileType }));

    setIsAnalyzing(true);
    try {
      const segments = await analyzeTrialPitPhotos(imagesForAI);
      if (segments && segments.length > 0) {
        setCurrentTrialPit(prev => ({ 
          ...prev, 
          lithologySegments: segments.map((s: any) => ({ 
            ...s, 
            id: Math.random().toString(36).substr(2, 9),
            rqd: '0',
            weathering: 'W1'
          })) 
        }));
      } else {
        alert("Görüntü analiz edilemedi.");
      }
    } catch (error) { 
      alert("AI analizi sırasında bir hata oluştu.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const saveTrialPit = () => {
    if (!activeRoute) {
      alert("Lütfen önce bir güzergah seçin.");
      return;
    }
    const pit = { 
      ...currentTrialPit, 
      id: currentTrialPit.id || Math.random().toString(36).substr(2, 9),
      photos: currentTrialPit.photos || [],
      lithologySegments: currentTrialPit.lithologySegments || []
    } as TrialPit;
    
    const updatedRoute = {
      ...activeRoute,
      pits: activeRoute.pits.some(p => p.id === pit.id)
        ? activeRoute.pits.map(p => p.id === pit.id ? pit : p)
        : [...activeRoute.pits, pit]
    };
    
    setActiveRoute(updatedRoute);
    setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
    setIsTrialPitModalOpen(false);
  };

  const handleSaveWell = () => {
    if (!currentWell.wellNo) return;
    if (currentWell.id) {
      setDrillingWells(prev => prev.map(w => w.id === currentWell.id ? (currentWell as DrillingWell) : w));
    } else {
      setDrillingWells(prev => [...prev, { ...currentWell, id: Math.random().toString(36).substr(2, 9) } as DrillingWell]);
    }
    setIsWellModalOpen(false);
  };

  const handleExportWord = (text: string, title: string) => {
    let htmlContent = text
      .replace(/^# (.*$)/gim, '<h1 style="color: #1e293b; font-family: Arial; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-top: 30px; text-align: center;">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 style="color: #4338ca; font-family: Arial; margin-top: 25px; border-left: 5px solid #4338ca; padding-left: 10px;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="color: #334155; font-family: Arial; margin-top: 20px;">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li style="margin-left: 30px; margin-bottom: 5px; list-style-type: disc;">$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      .replace(/\n/g, '<br>');

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>
        @page { size: A4; margin: 2.5cm; }
        body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #333; font-size: 11pt; }
        h1 { font-size: 18pt; text-transform: uppercase; margin-bottom: 20pt; }
        h2 { font-size: 14pt; color: #4338ca; margin-top: 25pt; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 15pt; }
        p { text-align: justify; margin-bottom: 10pt; }
        li { margin-left: 30pt; text-align: justify; }
        .report-header { border-bottom: 2px solid #6366f1; margin-bottom: 30pt; padding-bottom: 15pt; text-align: center; }
        .report-footer { margin-top: 50pt; border-top: 1px solid #eee; padding-top: 15pt; font-size: 9pt; color: #777; text-align: right; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30pt; }
        .meta-table td { padding: 8pt; border: 1px solid #ddd; }
        .label { font-weight: bold; background: #f8fafc; width: 35%; color: #475569; }
      </style>
      </head><body>
      <div class="report-header">
        <h1 style="color: #1e293b; margin: 0;">GeoCoord Pro</h1>
        <p style="margin: 5pt 0 0 0; color: #64748b; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">TEKNİK ANALİZ VE DEĞERLENDİRME RAPORU</p>
      </div>

      <table class="meta-table">
        <tr><td class="label">PROJE ADI</td><td>${selectedProject?.name || '-'}</td></tr>
        <tr><td class="label">LOKASYON</td><td>${selectedProject?.location || '-'}</td></tr>
        <tr><td class="label">İLGİLİ BİRİM / KUYU</td><td>${currentWell.wellNo || activeRoute?.name || 'GENEL'}</td></tr>
        <tr><td class="label">RAPOR TARİHİ</td><td>${new Date().toLocaleDateString('tr-TR')}</td></tr>
        <tr><td class="label">SORUMLU MÜHENDİS</td><td>${selectedProject?.leadEngineer || user.name}</td></tr>
      </table>

      <div class="content">
        ${htmlContent}
      </div>

      <div class="report-footer">
        <p>Bu rapor GeoCoord Pro Yapay Zeka (AI) motoru tarafından teknik veriler ışığında otomatik olarak üretilmiştir.</p>
        <p>Tüm teknik değerlendirmelerin yetkili mühendis tarafından onaylanması esastır.</p>
        <p>© ${new Date().getFullYear()} - GeoCoord Pro Engineering Suite</p>
      </div>
    </body></html>
    `;
    const footer = "";
    const sourceHTML = header + htmlContent + footer;

    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_Analiz.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportWellLogToWord = () => {
    if (!currentWell.wellNo) return;
    const well = currentWell;
    const lithology = well.lithologySegments || [];
    
    let rowsHtml = lithology.map(s => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${s.startDepth} - ${s.endDepth}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${s.formation || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${s.description}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align:center;">${s.rqd}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align:center;">${s.weathering}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align:center;">${s.lugeon || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${s.permeabilityStatus || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${well.wellNo} Logu</title>
      <style>
        body { font-family: Arial; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #f2f2f2; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
        h1 { color: #333; font-size: 18pt; }
        .meta { margin-bottom: 20px; font-size: 10pt; }
      </style>
      </head><body>
      <h1>KUYU LİTOLOJİ LOGU: ${well.wellNo}</h1>
      <div class="meta">
        <p><b>Proje:</b> ${selectedProject?.name || '-'}</p>
        <p><b>Lokasyon:</b> ${selectedProject?.location || '-'}</p>
        <p><b>Derinlik:</b> ${well.actualDepth} m | <b>YASS:</b> ${well.groundwaterStatus} m</p>
        <p><b>Koordinatlar:</b> X: ${well.coordinateX} Y: ${well.coordinateY} Z: ${well.coordinateZ}</p>
        <p><b>Makine:</b> ${well.machineType || '-'}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Aralık (m)</th>
            <th>Formasyon</th>
            <th>Tanımlama</th>
            <th>RQD (%)</th>
            <th>Ayrışma</th>
            <th>Lugeon (Lu)</th>
            <th>Geçirimlilik</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      </body></html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${well.wellNo}_Log.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportWellLogToExcel = () => {
    if (!currentWell.wellNo) return;
    const well = currentWell;
    const lithology = well.lithologySegments || [];
    
    let rowsHtml = lithology.map(s => `
      <tr>
        <td>${s.startDepth}</td>
        <td>${s.endDepth}</td>
        <td>${s.formation || '-'}</td>
        <td>${s.description}</td>
        <td>${s.rqd}</td>
        <td>${s.weathering}</td>
        <td>${s.lugeon || '-'}</td>
        <td>${s.permeabilityStatus || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table>
          <tr><th colspan="8" style="font-size:16pt; font-weight:bold;">${well.wellNo} SONDAJ LOG VERİLERİ</th></tr>
          <tr><th>Başlangıç (m)</th><th>Bitiş (m)</th><th>Formasyon</th><th>Litoloji Tanımlama</th><th>RQD (%)</th><th>Ayrışma</th><th>Lugeon</th><th>Durum</th></tr>
          ${rowsHtml}
        </table>
      </body></html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${well.wellNo}_Log.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocument = (doc: ProjectDocument) => {
    if (!doc.data) return;
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTabAnalysisSection = (type: 'SPT' | 'BST' | 'PRESIYOMETRE' | 'PERMABILITE' | 'GENEL_WELL' | 'ROUTE' | 'TRIAL_PIT', data: any, customTitle?: string) => {
    const analysis = tabAnalysis[type];
    const hasData = Array.isArray(data) ? data.length > 0 : !!data;

    return (
      <div className="mt-12 space-y-6 no-print">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Sparkles size={20}/></div>
             <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{customTitle || 'AI TEKNİK ANALİZ VE RAPORLAMA'}</h4>
          </div>
          {hasData && (
            <button 
              onClick={() => handleTabAnalysis(type as any, data)} 
              disabled={isTabAnalyzing}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:bg-slate-300 shadow-xl"
            >
              {isTabAnalyzing ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>}
              ANALİZ RAPORU OLUŞTUR
            </button>
          )}
        </div>

        {analysis ? (
          <div className="bg-white border-2 border-indigo-100 rounded-[32px] overflow-hidden shadow-lg animate-in slide-in-from-bottom-4">
             <div className="p-4 bg-indigo-50 flex justify-end gap-2 border-b border-indigo-100">
                <button onClick={() => window.print()} className="p-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase px-4" title="PDF Yazdır"><Printer size={18}/> PDF</button>
                <button onClick={() => handleExportWord(analysis, `${customTitle || type}_Analizi`)} className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase px-4" title="Word (.doc) İndir"><FileCheck size={18}/> WORD</button>
             </div>
             <div className="p-10 print-area">
                <FormattedText text={analysis} />
             </div>
          </div>
        ) : !hasData ? (
          <div className="p-10 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Analiz oluşturmak için önce veri girişi yapmalısınız.</p>
          </div>
        ) : (
          <div className="p-10 text-center bg-indigo-50/30 rounded-[32px] border-2 border-dashed border-indigo-100">
             <p className="text-indigo-400 font-bold uppercase text-xs tracking-widest">Veriler analiz edilmeye hazır. Rapor oluştur butonuna basın.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proje Yönetimi</h1>
          <p className="text-slate-500 mt-1">Saha ve ofis çalışmalarını koordine edin.</p>
        </div>
        {!activeModule && (
          <button onClick={() => { setNewProject(INITIAL_PROJECT_STATE); setIsCreateModalOpen(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold transition-all hover:bg-slate-800">
            <Plus size={20} /> Yeni Proje
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 no-print">
        {!activeModule && (
          <div className="xl:col-span-7 space-y-4">
            {projects.map((p) => (
              <div key={p.id} onClick={() => setSelectedProject(p)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${selectedProject?.id === p.id ? 'bg-white border-emerald-500 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div><span className="text-xs font-bold text-slate-400">#{p.id}</span><h3 className="text-xl font-bold text-slate-900 mt-1">{p.name}</h3><div className="flex items-center gap-2 mt-2 text-slate-500 text-xs font-medium"><MapPin size={14} /> {p.location}</div></div>
                  <ChevronRight size={24} className={selectedProject?.id === p.id ? 'text-emerald-500' : 'text-slate-300'} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={activeModule ? "xl:col-span-12" : "xl:col-span-5"}>
          {activeModule && selectedProject ? (
            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden min-h-[70vh] flex flex-col animate-in slide-in-from-right-10 no-print">
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <button onClick={() => { setActiveModule(null); setActiveRoute(null); setTabAnalysis({}); }} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold uppercase text-xs"><ChevronLeft size={16} /> Geri</button>
                <div className="text-center"><h2 className="text-lg font-black uppercase tracking-tight">{activeModule}</h2></div>
                <button onClick={handleSaveModuleData} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 rounded-2xl font-black text-xs transition-all shadow-lg uppercase"><Save size={16} /> Kaydet</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {activeModule === "Sondaj Çalışmaları" ? (
                  <div className="p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-lg"><Activity size={32} /></div><div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Sondaj Kuyuları</h3></div></div>
                      <button onClick={() => { setCurrentWell(INITIAL_WELL_STATE); setWellTab('genel'); setIsWellModalOpen(true); }} className="bg-emerald-600 text-white px-8 py-4 rounded-[28px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl"><Plus size={20} /> Yeni Kuyu</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {drillingWells.map(w => (
                        <div key={w.id} onClick={() => { setCurrentWell(w); setWellTab('genel'); setIsWellModalOpen(true); }} className="bg-white border-2 border-slate-100 p-8 rounded-[48px] hover:border-emerald-500 hover:shadow-2xl transition-all cursor-pointer group">
                           <div className="flex justify-between items-start mb-6"><h4 className="text-2xl font-black text-slate-900 uppercase">{w.wellNo}</h4><div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors"><Activity size={20} className="text-slate-400 group-hover:text-emerald-500" /></div></div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-4 rounded-3xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Derinlik</p><p className="text-lg font-black text-slate-900">{w.actualDepth}m</p></div>
                              <div className="bg-blue-50 p-4 rounded-3xl"><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">YASS</p><p className="text-lg font-black text-blue-600">{w.groundwaterStatus}m</p></div>
                           </div>
                           <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t pt-4 text-center">
                             {w.machineType || 'Ekipman Tanımsız'}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeModule === "Güzergah Jeolojisi Etütleri" || activeModule === "Doğal Yapı Malzeme Çalışmaları" ? (
                  <div className="p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg"><RouteIcon size={32} /></div><div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeModule}</h3></div></div>
                      <button onClick={() => { const newRoute: RouteGeology = { id: Math.random().toString(36).substr(2, 9), name: `GÜZERGAH-${routes.length + 1}`, length: '1', pits: [], observations: [] }; setRoutes(prev => [...prev, newRoute]); setActiveRoute(newRoute); }} className="bg-indigo-600 text-white px-8 py-4 rounded-[28px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl"><Plus size={20} /> Yeni Güzergah</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {routes.map(route => (
                        <div key={route.id} className={`bg-white border-2 p-8 rounded-[48px] transition-all cursor-pointer ${activeRoute?.id === route.id ? 'border-indigo-500 shadow-xl scale-[1.02]' : 'border-slate-100 shadow-sm'}`} onClick={() => setActiveRoute(route)}>
                          <div className="flex justify-between items-start mb-6">
                            <h4 className="text-xl font-black text-slate-900 uppercase">{route.name}</h4>
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><MapPinIcon size={20} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-3xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Araştırma Çukuru</p><p className="text-xl font-black text-slate-900">{route.pits.length}</p></div>
                            <div className="bg-slate-50 p-4 rounded-3xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Gözlem Noktası</p><p className="text-xl font-black text-slate-900">{route.observations.length}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeRoute && (
                      <div className="mt-12 bg-white border-2 border-indigo-500 p-10 rounded-[48px] shadow-2xl animate-in slide-in-from-bottom-5 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GÜZERGAH ADI</label>
                            <input 
                              value={activeRoute.name} 
                              onChange={e => {
                                const newName = e.target.value;
                                setRoutes(prev => prev.map(r => r.id === activeRoute.id ? { ...r, name: newName } : r));
                                setActiveRoute(prev => prev ? { ...prev, name: newName } : null);
                              }}
                              className="text-2xl font-black text-indigo-600 uppercase bg-slate-50 px-4 py-2 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none w-full md:w-96"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setCurrentTrialPit({ pitNo: `AÇ-${activeRoute.pits.length+1}`, depth: '2.50', photos: [], lithologySegments: [] }); setIsTrialPitModalOpen(true); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"><Pickaxe size={16}/> YENİ ÇUKUR EKLE</button>
                          </div>
                        </div>

                        <div className="space-y-6">
                           <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> ARAŞTIRMA ÇUKURLARI LİSTESİ</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {activeRoute.pits.map(pit => (
                               <div key={pit.id} onClick={() => { setCurrentTrialPit(pit); setIsTrialPitModalOpen(true); }} className="p-6 bg-slate-50 rounded-[32px] border-2 border-transparent hover:border-emerald-500 transition-all cursor-pointer group shadow-sm">
                                 <div className="flex justify-between items-center mb-4"><span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black text-[10px] uppercase">{pit.pitNo}</span><div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-emerald-500"><Edit2 size={14}/></div></div>
                                 <p className="text-sm font-black text-slate-900">Derinlik: {pit.depth}m</p>
                                 <div className="mt-3 flex gap-1">
                                    {pit.photos.slice(0, 3).map((p, i) => <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200"><img src={p.data} className="w-full h-full object-cover" /></div>)}
                                    {pit.photos.length > 3 && <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[8px] font-bold">+{pit.photos.length - 3}</div>}
                                 </div>
                               </div>
                             ))}
                             {activeRoute.pits.length === 0 && (
                               <div className="col-span-full py-12 text-center border-4 border-dashed border-slate-100 rounded-[40px] text-slate-300 uppercase font-black text-xs tracking-widest">GÜZERGAH ÜZERİNDE HENÜZ ÇUKUR TANIMLANMADI</div>
                             )}
                           </div>
                        </div>

                        {renderTabAnalysisSection('ROUTE', activeRoute, 'GÜZERGAH GENEL JEOTEKNİK RAPORU')}
                      </div>
                    )}
                  </div>
                ) : activeModule === "Harita ve Kesitler" ? (
                  <div className="p-10 space-y-10">
                    <div className="flex flex-col items-center gap-6 py-20 bg-white border-4 border-dashed border-slate-200 rounded-[60px] cursor-pointer hover:border-indigo-500 hover:bg-slate-50 transition-all group" onClick={() => mapInputRef.current?.click()}>
                       <div className="p-6 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform"><FileUp size={48} /></div>
                       <div className="text-center"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Harita ve Kesitleri Yükle</h3><p className="text-sm text-slate-500 font-medium mt-2 max-w-sm">PDF, DWG, DXF veya Görsel dosyalarınızı sürükleyin veya seçin.</p></div>
                       <input type="file" multiple accept=".pdf,.dwg,.dxf,image/*" className="hidden" ref={mapInputRef} onChange={e => handleMapFileUpload(e.target.files)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {moduleDocs.map(doc => (
                        <div key={doc.id} className="bg-white border-2 border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                          <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-3xl ${doc.fileType.includes('pdf') ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}><FileText size={32}/></div>
                            <div className="flex flex-col items-end"><p className="text-[10px] font-black text-slate-400 uppercase">{doc.size}</p><p className="text-[10px] text-slate-300">{doc.uploadDate}</p></div>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 uppercase mb-2 truncate" title={doc.fileName}>{doc.fileName}</h4>
                          <div className="flex gap-2 mt-auto pt-6">
                            <button onClick={() => analyzeMapWithAI(doc)} disabled={isAnalyzing} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg disabled:bg-slate-300 transition-all hover:bg-indigo-600">
                              {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} Analiz
                            </button>
                            <button onClick={() => downloadDocument(doc)} className="p-3 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors" title="Görüntüle / İndir"><Eye size={18}/></button>
                          </div>
                          {doc.analysis && (
                            <div className="mt-6 p-6 bg-indigo-50/50 rounded-[24px] border border-indigo-100 relative group/analysis">
                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/analysis:opacity-100 transition-opacity">
                                <button onClick={() => window.print()} className="p-1.5 bg-white text-slate-600 rounded-lg shadow-sm hover:bg-indigo-50 flex items-center gap-1 font-bold text-[9px] uppercase px-2"><Printer size={12}/> PDF</button>
                                <button onClick={() => handleExportWord(doc.analysis!, `Harita_Analizi_${doc.fileName}`)} className="p-1.5 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50 flex items-center gap-1 font-bold text-[9px] uppercase px-2"><FileCheck size={12}/> WORD</button>
                              </div>
                              <div className="max-h-40 overflow-y-auto no-scrollbar">
                                <p className="text-[11px] text-indigo-700 italic font-medium leading-relaxed">"{doc.analysis.substring(0, 300)}..."</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeModule === "Laboratuvar Çalışmaları" ? (
                  <div className="p-10 space-y-8">
                    <div className="flex bg-slate-100 p-2 rounded-[24px] max-w-fit">
                        {[
                          { id: 'sonuclar', label: 'Sonuçlar', icon: TableIcon },
                          { id: 'arsiv', label: 'Belge Analizi', icon: FileUp }
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setLabTab(tab.id as any)} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${labTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                             <tab.icon size={16} /> {tab.label}
                          </button>
                        ))}
                    </div>
                    {labTab === 'sonuclar' ? (
                      <div className="space-y-6">
                         <div className="flex items-center justify-between"><h3 className="text-xl font-black text-slate-900 uppercase">Numune Deney Sonuçları</h3><button onClick={() => setLabTests([...labTests, { id: Math.random().toString(36).substr(2, 9), category: LabTestCategory.GEOTECHNICAL, name: 'Yeni Deney', sampleId: 'SK-', status: 'PENDING', results: '', date: new Date().toISOString().split('T')[0] }])} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg"><Plus size={16}/> Sonuç Ekle</button></div>
                         <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 bg-white">
                           <table className="w-full text-left">
                             <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <tr><th className="px-6 py-4">Deney Adı</th><th className="px-6 py-4">Numune No</th><th className="px-6 py-4">Sonuçlar / Notlar</th><th className="px-6 py-4 w-12"></th></tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {labTests.map(test => (
                                 <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-6 py-4"><input className="bg-transparent border-0 font-bold text-slate-900 outline-none w-full" value={test.name} onChange={e => setLabTests(labTests.map(t => t.id === test.id ? {...t, name: e.target.value} : t))} /></td>
                                   <td className="px-6 py-4"><input className="bg-transparent border-0 font-medium text-slate-600 outline-none w-full" value={test.sampleId} onChange={e => setLabTests(labTests.map(t => t.id === test.id ? {...t, sampleId: e.target.value} : t))} /></td>
                                   <td className="px-6 py-4"><textarea className="bg-transparent border-0 font-medium text-slate-500 outline-none w-full resize-none h-12" value={test.results} onChange={e => setLabTests(labTests.map(t => t.id === test.id ? {...t, results: e.target.value} : t))} /></td>
                                   <td className="px-6 py-4"><button onClick={() => setLabTests(labTests.filter(t => t.id !== test.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-6 py-20 bg-white border-4 border-dashed border-slate-200 rounded-[60px] cursor-pointer hover:border-emerald-500 hover:bg-slate-50 transition-all" onClick={() => labInputRef.current?.click()}>
                           <div className="p-6 bg-emerald-50 text-emerald-600 rounded-full"><Upload size={48} /></div>
                           <div className="text-center"><h3 className="text-2xl font-black text-slate-900 uppercase">Deney Belgesi Analizi</h3><p className="text-sm text-slate-500 font-medium mt-2">Deney formlarını (PDF/JPG) yükleyerek AI ile verileri ayıklayın.</p></div>
                           <input type="file" multiple accept=".pdf,image/*" className="hidden" ref={labInputRef} onChange={async e => {
                             if (!e.target.files) return;
                             for (const file of Array.from(e.target.files) as File[]) {
                               const base64 = await new Promise<string>(r => { const rd = new FileReader(); rd.onload = () => r(rd.result as string); rd.readAsDataURL(file); });
                               const doc: ProjectDocument = { id: Math.random().toString(36).substr(2, 9), name: file.name, fileName: file.name, fileType: file.type, uploadDate: new Date().toLocaleDateString('tr-TR'), data: base64 };
                               setModuleDocs(prev => [...prev, doc]);
                             }
                           }} />
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                           {moduleDocs.filter(d => d.fileType.includes('image') || d.fileType.includes('pdf')).map(doc => (
                             <div key={doc.id} className="p-8 bg-white border-2 border-slate-100 rounded-[40px] flex flex-col gap-6 shadow-sm hover:shadow-xl transition-all">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-4"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-[20px]"><FileText size={24}/></div><p className="font-black text-slate-900 text-sm uppercase tracking-tight">{doc.fileName}</p></div>
                                 <div className="flex gap-2">
                                   <button onClick={async () => {
                                     if (!doc.data) return;
                                     setIsAnalyzing(true);
                                     const analysis = await analyzeSingleLabDocument({ data: doc.data, mimeType: doc.fileType }, "Laboratuvar Deneyi");
                                     setModuleDocs(moduleDocs.map(d => d.id === doc.id ? {...d, analysis} : d));
                                     setIsAnalyzing(false);
                                   }} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all">
                                     {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} AI ANALİZ ET
                                   </button>
                                   <button onClick={() => downloadDocument(doc)} className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-colors"><Download size={20}/></button>
                                 </div>
                               </div>
                               {doc.analysis && (
                                 <div className="p-8 bg-emerald-50/30 rounded-[32px] border border-emerald-100 relative group/analysis">
                                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover/analysis:opacity-100 transition-opacity">
                                      <button onClick={() => window.print()} className="p-2 bg-white text-slate-600 rounded-xl shadow-sm flex items-center gap-1 font-bold text-[9px] uppercase px-3" title="Yazdır"><Printer size={14}/> PDF</button>
                                      <button onClick={() => handleExportWord(doc.analysis!, `Laboratuvar_Analiz_${doc.fileName}`)} className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm flex items-center gap-1 font-bold text-[9px] uppercase px-3" title="İndir"><FileCheck size={14}/> WORD</button>
                                    </div>
                                    <div className="prose prose-slate max-w-none prose-sm">
                                      <FormattedText text={doc.analysis} />
                                    </div>
                                 </div>
                               )}
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeModule === "Genel Değerlendirme" ? (
                  <div className="p-10 space-y-10">
                      <div className="flex flex-col items-center gap-6 py-20 bg-white border-4 border-dashed border-slate-100 rounded-[60px]">
                         <Sparkles size={64} className="text-amber-500 animate-pulse" />
                         <button onClick={handleEvaluateResults} disabled={isEvaluating} className="bg-slate-900 text-white px-12 py-5 rounded-[28px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-amber-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-300">
                           {isEvaluating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
                           Final Raporu AI ile Oluştur
                         </button>
                      </div>
                      {evaluationResult && (
                        <div className="p-12 md:p-20 bg-white shadow-2xl rounded-[40px] border border-slate-100 print-area">
                           <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100 no-print">
                              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Teknik Rapor Çıktısı</h2>
                              <div className="flex gap-2">
                                 <button onClick={() => window.print()} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 font-bold text-xs uppercase px-6" title="Yazdır (PDF Kaydet)"><Printer size={20} /> PDF OLARAK KAYDET</button>
                                 <button onClick={() => handleExportWord(evaluationResult!, selectedProject?.name || "Rapor")} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 font-bold text-xs uppercase px-6" title="Word (.doc) Olarak İndir"><FileCheck size={20} /> WORD İNDİR</button>
                              </div>
                           </div>
                           <FormattedText text={evaluationResult} />
                        </div>
                      )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : selectedProject ? (
            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-10 sticky top-8 animate-in slide-in-from-right-8 no-print">
              <div className="flex items-center gap-4 mb-10"><div className="w-3 h-10 bg-emerald-500 rounded-full" /><div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedProject.name}</h2><p className="text-sm text-slate-400 font-bold uppercase mt-2 tracking-widest flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {selectedProject.location}</p></div></div>
              <div className="grid grid-cols-1 gap-4">
                {selectedProject.selectedWorkTypes.map((type, i) => (
                    <button key={i} onClick={() => openModule(type)} className="flex items-center gap-6 p-6 rounded-[32px] border-2 border-slate-50 bg-slate-50/50 hover:bg-white hover:border-emerald-500 hover:shadow-xl transition-all group text-left">
                      <div className="p-4 rounded-2xl bg-white shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">{React.createElement(WORK_TYPES.find(w => w.id === type)?.icon || Activity, { size: 24 })}</div>
                      <div className="flex-1"><h4 className="font-black text-slate-900 uppercase tracking-tight">{type}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Modül Verilerini Yönet</p></div>
                      <ChevronRight size={24} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] bg-slate-50 border-4 border-dashed border-slate-200 rounded-[60px] text-slate-300 p-12 text-center group no-print">
               <div className="p-8 bg-white rounded-full shadow-sm mb-6 group-hover:scale-110 transition-transform"><Search size={64} className="opacity-20" /></div>
               <h3 className="text-2xl font-black uppercase tracking-widest opacity-30">PROJE SEÇİLMEDİ</h3>
            </div>
          )}
        </div>
      </div>

      {/* FULL WELL MODAL */}
      {isWellModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in no-print">
           <div className="bg-white w-full max-w-7xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col h-[95vh]">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6"><div className="p-4 bg-emerald-600 rounded-3xl shadow-lg"><Activity size={32} /></div><div><h2 className="text-2xl font-black uppercase tracking-tight">{currentWell.wellNo || 'Yeni Kuyu Tanımı'}</h2></div></div>
                 <div className="flex items-center gap-4"><button onClick={handleSaveWell} className="bg-emerald-600 text-white px-10 py-4 rounded-[28px] font-black uppercase hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-xl text-xs"><Save size={18} /> KAYDET</button><button onClick={() => { setIsWellModalOpen(false); setTabAnalysis({}); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={28} /></button></div>
              </div>
              <div className="flex px-4 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar no-scrollbar">
                {[ 
                  { id: 'genel', label: 'Genel', icon: Info }, 
                  { id: 'litoloji', label: 'Litoloji', icon: Layers }, 
                  { id: 'spt', label: 'SPT Deneyi', icon: Target }, 
                  { id: 'bst', label: 'BST & Lugeon', icon: Droplets }, 
                  { id: 'presiyometre', label: 'Presiyometre', icon: Gauge }, 
                  { id: 'permabilite', label: 'Permeabilite', icon: Wind }, 
                  { id: 'fotograf', label: 'Fotoğraflar', icon: Camera } 
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setWellTab(tab.id as any); setTabAnalysis({}); }} className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all whitespace-nowrap ${wellTab === tab.id ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon size={14} /> {tab.label}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                {wellTab === 'genel' && (
                  <div className="space-y-12 animate-in slide-in-from-bottom-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-6">
                          <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest"><Info size={14}/> Kimlik Bilgileri</div>
                            <div className="space-y-4">
                              <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Kuyu Numarası</label><input type="text" value={currentWell.wellNo} onChange={e => setCurrentWell({...currentWell, wellNo: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-[20px] font-black focus:border-emerald-500 outline-none uppercase" placeholder="SK-1" /></div>
                              <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Sondaj Tipi</label>
                                <select value={currentWell.wellType} onChange={e => setCurrentWell({...currentWell, wellType: e.target.value as WellType})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-[20px] font-black focus:border-emerald-500 outline-none">
                                  <option value="CORED">Karotlu Sondaj</option>
                                  <option value="NON_CORED">Karotsuz Sondaj</option>
                                </select>
                              </div>
                            </div>
                          </div>
                       </div>
                       <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-6">
                          <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
                             <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest"><MapPinIcon size={14}/> Koordinatlar ve Kot (Elevation)</div>
                             <div className="grid grid-cols-3 gap-4">
                                <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">X (Doğu)</label><input type="text" value={currentWell.coordinateX} onChange={e => setCurrentWell({...currentWell, coordinateX: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-[18px] font-black focus:border-emerald-500 outline-none" placeholder="000.000" /></div>
                                <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Y (Kuzey)</label><input type="text" value={currentWell.coordinateY} onChange={e => setCurrentWell({...currentWell, coordinateY: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-[18px] font-black focus:border-emerald-500 outline-none" placeholder="0.000.000" /></div>
                                <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Z (Kot)</label><input type="text" value={currentWell.coordinateZ} onChange={e => setCurrentWell({...currentWell, coordinateZ: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-[18px] font-black focus:border-emerald-500 outline-none" placeholder="00.00" /></div>
                             </div>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
                             <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest"><Settings2 size={14}/> Teknik Özellikler</div>
                             <div className="grid grid-cols-2 gap-6">
                                <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Kuyu Çapı (mm)</label><input type="text" value={currentWell.wellDiameter} onChange={e => { const v = e.target.value; setCurrentWell(prev => ({ ...prev, wellDiameter: v, bstStages: recalculateAllBST({ ...prev, wellDiameter: v }) })); }} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-[18px] font-black outline-none" placeholder="76 / 96 / 121" /></div>
                                <div><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase">Manometre Yük. (m)</label><input type="text" value={currentWell.manometerHeight} onChange={e => { const v = e.target.value; setCurrentWell(prev => ({ ...prev, manometerHeight: v, bstStages: recalculateAllBST({ ...prev, manometerHeight: v }) })); }} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-[18px] font-black outline-none" placeholder="1.0" /></div>
                             </div>
                          </div>
                       </div>
                       <div className="col-span-1 space-y-6">
                          <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl space-y-6">
                             <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest"><Construction size={14}/> Saha Ekipmanı</div>
                             <div><label className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Sondaj Makinesi</label><input type="text" value={currentWell.machineType} onChange={e => setCurrentWell({...currentWell, machineType: e.target.value})} className="w-full px-6 py-4 bg-white/10 border-2 border-white/5 rounded-[20px] font-black focus:border-emerald-500 outline-none text-white mt-1" placeholder="D-2500 / E-150" /></div>
                             <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-2xl">
                               <div className="flex items-center gap-2 text-blue-300 font-black text-[10px] uppercase tracking-widest mb-3"><Droplets size={14}/> Su Seviyesi</div>
                               <div><label className="text-[9px] font-bold text-blue-200 uppercase">YASS Derinliği (m)</label><input type="text" value={currentWell.groundwaterStatus} onChange={e => { const v = e.target.value; setCurrentWell(prev => ({ ...prev, groundwaterStatus: v, bstStages: recalculateAllBST({ ...prev, groundwaterStatus: v }) })); }} className="w-full bg-white/10 border-2 border-white/5 rounded-xl px-4 py-3 font-black text-white outline-none focus:border-blue-400" placeholder="0.0" /></div>
                             </div>
                          </div>
                       </div>
                    </div>
                    {renderTabAnalysisSection('GENEL_WELL', currentWell, 'KUYU GENEL TEKNİK DEĞERLENDİRMESİ')}
                  </div>
                )}

                {wellTab === 'litoloji' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kuyu Litoloji Logu</h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                          <button onClick={exportWellLogToWord} className="p-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm transition-all flex items-center gap-2 font-bold text-[10px] uppercase" title="Word (.doc) İndir">
                             <FileText size={16} /> WORD
                          </button>
                          <button onClick={exportWellLogToExcel} className="p-3 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl shadow-sm transition-all flex items-center gap-2 font-bold text-[10px] uppercase" title="Excel (.xls) İndir">
                             <FileSpreadsheet size={16} /> EXCEL
                          </button>
                        </div>
                        <button onClick={syncBSTToLog} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:bg-blue-700">
                           <RefreshCcw size={16} /> BST AKTAR
                        </button>
                        
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
                          <div className="flex items-center gap-2">
                             <Ruler size={14} className="text-slate-400" />
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI ARALIK (m):</label>
                             <select 
                                value={analysisInterval} 
                                onChange={(e) => setAnalysisInterval(parseFloat(e.target.value))} 
                                className="bg-transparent border-0 font-black text-xs outline-none text-slate-900 cursor-pointer"
                             >
                                <option value="0.5">0.5</option>
                                <option value="1.0">1.0</option>
                                <option value="1.5">1.5</option>
                                <option value="2.0">2.0</option>
                                <option value="3.0">3.0</option>
                                <option value="5.0">5.0</option>
                             </select>
                          </div>
                          <div className="w-px h-6 bg-slate-100" />
                          <button onClick={startAIPhotoAnalysis} disabled={!currentWell.corePhotos?.length || isAnalyzing} className="bg-emerald-600 text-white px-6 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all hover:bg-emerald-700">
                             {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
                             AI LOG ÜRET
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 shadow-sm overflow-x-auto">
                      <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Derinlik (m)</th>
                            <th className="px-6 py-4 w-40">Formasyon Adı</th>
                            <th className="px-6 py-4">Jeolojik Tanımlama</th>
                            <th className="px-4 py-4 w-24 text-center">RQD (%)</th>
                            <th className="px-4 py-4 w-24 text-center">Ayrışma</th>
                            <th className="px-4 py-4 w-28 text-center text-blue-400">Lugeon (Lu)</th>
                            <th className="px-6 py-4 text-center text-indigo-400">Geçirimlilik Durumu</th>
                            <th className="px-6 py-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentWell.lithologySegments?.map(s => (
                            <tr key={s.id} className="text-sm hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-black whitespace-nowrap">{s.startDepth} - {s.endDepth}</td>
                              <td className="px-6 py-4">
                                <input 
                                  value={s.formation || ''} 
                                  onChange={e => setCurrentWell(prev => ({...prev, lithologySegments: prev.lithologySegments?.map(seg => seg.id === s.id ? {...seg, formation: e.target.value} : seg)}))} 
                                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-indigo-400"
                                  placeholder="Formasyon..."
                                />
                              </td>
                              <td className="px-6 py-4"><textarea value={s.description} onChange={e => setCurrentWell(prev => ({...prev, lithologySegments: prev.lithologySegments?.map(seg => seg.id === s.id ? {...seg, description: e.target.value} : seg)}))} className="w-full bg-transparent border-0 font-medium italic text-slate-600 focus:ring-0 resize-none h-12" /></td>
                              <td className="px-4 py-4"><input value={s.rqd} onChange={e => setCurrentWell(prev => ({...prev, lithologySegments: prev.lithologySegments?.map(seg => seg.id === s.id ? {...seg, rqd: e.target.value} : seg)}))} className="w-full text-center bg-emerald-50 rounded-lg p-2 font-bold text-emerald-700" /></td>
                              <td className="px-4 py-4"><input value={s.weathering} onChange={e => setCurrentWell(prev => ({...prev, lithologySegments: prev.lithologySegments?.map(seg => seg.id === s.id ? {...seg, weathering: e.target.value} : seg)}))} className="w-full text-center bg-amber-50 rounded-lg p-2 font-bold text-amber-700 uppercase" /></td>
                              <td className="px-4 py-4"><input value={s.lugeon || ''} onChange={e => {
                                const lu = e.target.value;
                                setCurrentWell(prev => ({
                                  ...prev, 
                                  lithologySegments: prev.lithologySegments?.map(seg => seg.id === s.id ? {...seg, lugeon: lu, permeabilityStatus: getPermeabilityStatus(lu)} : seg)
                                }));
                              }} className="w-full text-center bg-blue-50 rounded-lg p-2 font-black text-blue-700" placeholder="Lu" /></td>
                              <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[10px] uppercase tracking-tight">{s.permeabilityStatus || '-'}</span></td>
                              <td className="px-6 py-4"><button onClick={() => setCurrentWell(prev => ({...prev, lithologySegments: prev.lithologySegments?.filter(seg => seg.id !== s.id)}))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {wellTab === 'spt' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">SPT Deney Verileri (Standart Penetrasyon)</h4>
                      <button onClick={addSPTMeasurement} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:bg-emerald-700">
                         <Plus size={16} /> YENİ SPT EKLE
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 shadow-sm overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Derinlik (m)</th>
                            <th className="px-4 py-4 text-center">N1 (0-15)</th>
                            <th className="px-4 py-4 text-center">N2 (15-30)</th>
                            <th className="px-4 py-4 text-center">N3 (30-45)</th>
                            <th className="px-4 py-4 text-center text-emerald-400 font-black">N_SPT (N2+N3)</th>
                            <th className="px-6 py-4">Açıklama</th>
                            <th className="px-6 py-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentWell.sptMeasurements?.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4"><input value={m.depth} onChange={e => updateSPTValue(m.id, 'depth', e.target.value)} className="w-24 bg-slate-50 p-2 rounded-lg font-black text-center" /></td>
                              <td className="px-4 py-4"><input value={m.n1} onChange={e => updateSPTValue(m.id, 'n1', e.target.value)} className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-center" /></td>
                              <td className="px-4 py-4"><input value={m.n2} onChange={e => updateSPTValue(m.id, 'n2', e.target.value)} className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-center" /></td>
                              <td className="px-4 py-4"><input value={m.n3} onChange={e => updateSPTValue(m.id, 'n3', e.target.value)} className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-center" /></td>
                              <td className="px-4 py-4 text-center font-black text-emerald-600 text-lg">{m.totalN}</td>
                              <td className="px-6 py-4"><input value={m.description} onChange={e => updateSPTValue(m.id, 'description', e.target.value)} className="w-full bg-transparent border-0 font-medium text-slate-500" placeholder="..." /></td>
                              <td className="px-6 py-4"><button onClick={() => setCurrentWell(prev => ({...prev, sptMeasurements: prev.sptMeasurements?.filter(sm => sm.id !== m.id)}))} className="text-slate-200 hover:text-red-500"><Trash2 size={16} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {renderTabAnalysisSection('SPT', currentWell.sptMeasurements)}
                  </div>
                )}

                {wellTab === 'presiyometre' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Presiyometre Deney Verileri (Menard)</h4>
                      <button onClick={addPressuremeterMeasurement} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:bg-amber-700">
                         <Plus size={16} /> YENİ PRES EKLE
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 shadow-sm overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Derinlik (m)</th>
                            <th className="px-4 py-4 text-center">E_m (kg/cm²)</th>
                            <th className="px-4 py-4 text-center">P_l (kg/cm²)</th>
                            <th className="px-4 py-4 text-center">P_f (kg/cm²)</th>
                            <th className="px-6 py-4">Notlar</th>
                            <th className="px-6 py-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentWell.pressuremeterMeasurements?.map(m => (
                            <tr key={m.id} className="hover:bg-amber-50 transition-colors">
                              <td className="px-6 py-4"><input value={m.depth} onChange={e => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.map(pm => pm.id === m.id ? {...pm, depth: e.target.value} : pm)}))} className="w-24 bg-slate-50 p-2 rounded-lg font-black text-center" /></td>
                              <td className="px-4 py-4"><input value={m.modulusE} onChange={e => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.map(pm => pm.id === m.id ? {...pm, modulusE: e.target.value} : pm)}))} className="w-24 bg-white border border-slate-200 p-2 rounded-lg text-center font-bold" /></td>
                              <td className="px-4 py-4"><input value={m.limitPressurePl} onChange={e => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.map(pm => pm.id === m.id ? {...pm, limitPressurePl: e.target.value} : pm)}))} className="w-24 bg-white border border-slate-200 p-2 rounded-lg text-center font-bold" /></td>
                              <td className="px-4 py-4"><input value={m.creepPressurePf} onChange={e => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.map(pm => pm.id === m.id ? {...pm, creepPressurePf: e.target.value} : pm)}))} className="w-24 bg-white border border-slate-200 p-2 rounded-lg text-center" /></td>
                              <td className="px-6 py-4"><input value={m.notes} onChange={e => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.map(pm => pm.id === m.id ? {...pm, notes: e.target.value} : pm)}))} className="w-full bg-transparent border-0" placeholder="..." /></td>
                              <td className="px-6 py-4"><button onClick={() => setCurrentWell(prev => ({...prev, pressuremeterMeasurements: prev.pressuremeterMeasurements?.filter(pm => pm.id !== m.id)}))} className="text-slate-200 hover:text-red-500"><Trash2 size={16} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-12 space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FileText size={20}/></div>
                           <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">PRESİYOMETRE DENEY FORMLARI</h4>
                        </div>
                        <button onClick={() => pressuremeterInputRef.current?.click()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg">
                           <Upload size={16} /> FORM YÜKLE
                        </button>
                        <input type="file" multiple accept=".pdf,image/*" className="hidden" ref={pressuremeterInputRef} onChange={e => handlePressuremeterFileUpload(e.target.files)} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentWell.pressuremeterDocs?.map(doc => (
                          <div key={doc.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm"><FileText size={20}/></div>
                                  <div>
                                    <p className="font-black text-slate-900 text-xs uppercase truncate max-w-[200px]">{doc.fileName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.uploadDate}</p>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => analyzePressuremeterDoc(doc)} disabled={isAnalyzing} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors disabled:bg-slate-300" title="AI Analiz Et">
                                   {isAnalyzing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                                 </button>
                                 <button onClick={() => downloadDocument(doc)} className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-colors" title="İndir">
                                   <Download size={16}/>
                                 </button>
                                 <button onClick={() => setCurrentWell(prev => ({ ...prev, pressuremeterDocs: prev.pressuremeterDocs?.filter(d => d.id !== doc.id) }))} className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-xl shadow-sm transition-colors">
                                   <Trash2 size={16}/>
                                 </button>
                               </div>
                            </div>
                            {doc.analysis && (
                              <div className="p-4 bg-white border border-indigo-100 rounded-2xl relative group/formanalysis shadow-inner">
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/formanalysis:opacity-100 transition-opacity">
                                  <button onClick={() => window.print()} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:text-indigo-600 flex items-center gap-1 font-bold text-[10px] border"><Printer size={10}/> PDF</button>
                                  <button onClick={() => handleExportWord(doc.analysis!, `Form_Analiz_${doc.fileName}`)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:text-indigo-600 flex items-center gap-1 font-bold text-[10px] border"><FileCheck size={10}/> WORD</button>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                   <FileSearch size={12}/> AI FORM ANALİZİ
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">{doc.analysis}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!currentWell.pressuremeterDocs || currentWell.pressuremeterDocs.length === 0) && (
                          <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-200 rounded-[32px]">
                             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Henüz form yüklenmedi.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {renderTabAnalysisSection('PRESIYOMETRE', currentWell.pressuremeterMeasurements)}
                  </div>
                )}

                {wellTab === 'permabilite' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Geçirimlilik (Permeabilite) Deneyleri</h4>
                      <button onClick={addPermeabilityMeasurement} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:bg-indigo-700">
                         <Plus size={16} /> YENİ DENEY EKLE
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 shadow-sm overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Deney Tipi</th>
                            <th className="px-4 py-4">Derinlik Aralığı (m)</th>
                            <th className="px-4 py-4 text-center">K Katsayısı (m/s)</th>
                            <th className="px-6 py-4">Notlar</th>
                            <th className="px-6 py-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentWell.permeabilityMeasurements?.map(m => (
                            <tr key={m.id} className="hover:bg-indigo-50 transition-colors">
                              <td className="px-6 py-4">
                                <select value={m.type} onChange={e => setCurrentWell(prev => ({...prev, permeabilityMeasurements: prev.permeabilityMeasurements?.map(pm => pm.id === m.id ? {...pm, type: e.target.value as any} : pm)}))} className="bg-slate-50 p-2 rounded-lg font-black text-[10px]">
                                  <option value="LEFRANC">LEFRANC</option>
                                  <option value="PACKER">PACKER</option>
                                  <option value="PUMPING">POMPAJ</option>
                                </select>
                              </td>
                              <td className="px-4 py-4"><input value={m.depthRange} onChange={e => setCurrentWell(prev => ({...prev, permeabilityMeasurements: prev.permeabilityMeasurements?.map(pm => pm.id === m.id ? {...pm, depthRange: e.target.value} : pm)}))} className="w-32 bg-white border border-slate-200 p-2 rounded-lg text-center" /></td>
                              <td className="px-4 py-4"><input value={m.coefficientK} onChange={e => setCurrentWell(prev => ({...prev, permeabilityMeasurements: prev.permeabilityMeasurements?.map(pm => pm.id === m.id ? {...pm, coefficientK: e.target.value} : pm)}))} className="w-32 bg-white border border-slate-200 p-2 rounded-lg text-center font-bold" /></td>
                              <td className="px-6 py-4"><input value={m.notes} onChange={e => setCurrentWell(prev => ({...prev, permeabilityMeasurements: prev.permeabilityMeasurements?.map(pm => pm.id === m.id ? {...pm, notes: e.target.value} : pm)}))} className="w-full bg-transparent border-0" placeholder="..." /></td>
                              <td className="px-6 py-4"><button onClick={() => setCurrentWell(prev => ({...prev, permeabilityMeasurements: prev.permeabilityMeasurements?.filter(pm => pm.id !== m.id)}))} className="text-slate-200 hover:text-red-500"><Trash2 size={16} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {renderTabAnalysisSection('PERMABILITE', currentWell.permeabilityMeasurements)}
                  </div>
                )}

                {wellTab === 'bst' && (
                  <div className="space-y-10 animate-in slide-in-from-bottom-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">BST (Basınçlı Su Testi) & Lugeon</h4>
                       <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[28px] border-2 border-slate-100">
                          <div className="flex items-center gap-2 px-4 border-r border-slate-200">
                             <Ruler size={16} className="text-slate-400" />
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KADEME (m):</label>
                             <select 
                                value={bstIntervalSize} 
                                onChange={(e) => setBstIntervalSize(e.target.value)} 
                                className="bg-transparent border-0 font-black text-xs outline-none text-slate-900 cursor-pointer"
                             >
                                <option value="1.0">1.0 m</option>
                                <option value="2.0">2.0 m</option>
                                <option value="3.0">3.0 m</option>
                                <option value="5.0">5.0 m</option>
                                <option value="10.0">10.0 m</option>
                             </select>
                          </div>
                          <button onClick={addBSTStage} className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-all active:scale-95">
                             <Plus size={18} /> YENİ BST KADEMESİ
                          </button>
                       </div>
                    </div>
                    <div className="space-y-12">
                      {currentWell.bstStages?.map((stage, idx) => (
                        <div key={stage.id} className="bg-white rounded-[40px] border-2 border-slate-100 p-8 space-y-8 relative overflow-hidden shadow-md group">
                           <div className="absolute top-0 right-0 px-8 py-4 bg-purple-600 text-white rounded-bl-[32px] font-black text-sm shadow-xl flex items-center gap-3">
                              <span>KADEME #{currentWell.bstStages!.length - idx}</span>
                              <div className="w-px h-6 bg-white/20" />
                              <span className="text-amber-200">LU: {stage.representativeLugeon || '0.00'}</span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6">
                              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Derinlik Aralığı (m)</label>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                                   <input type="text" value={stage.startDepth} onChange={e => handleBSTConfigChange(stage.id, 'startDepth', e.target.value)} className="w-full bg-transparent border-0 text-center font-black text-xs outline-none" />
                                   <ArrowRightLeft size={14} className="text-slate-300 shrink-0" />
                                   <input type="text" value={stage.endDepth} onChange={e => handleBSTConfigChange(stage.id, 'endDepth', e.target.value)} className="w-full bg-transparent border-0 text-center font-black text-xs outline-none" />
                                </div>
                              </div>
                              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Basınç Tipi / Maks P</label>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                                   <select value={stage.pressureType} onChange={e => handleBSTConfigChange(stage.id, 'pressureType', e.target.value)} className="bg-transparent border-0 text-[10px] font-black outline-none uppercase">
                                     <option value="TIP_A">Tip-A (1,2,3...)</option>
                                     <option value="TIP_B">Tip-B (2,4,6...)</option>
                                     <option value="TIP_C">Tip-C (3,6,10...)</option>
                                   </select>
                                   <div className="w-px h-6 bg-slate-200" />
                                   <input type="text" value={stage.maxPressure} onChange={e => handleBSTConfigChange(stage.id, 'maxPressure', e.target.value)} className="w-full bg-transparent border-0 text-center font-black text-xs outline-none" />
                                </div>
                              </div>
                              <div className="flex items-end">
                                 <button onClick={() => handleBSTConfigChange(stage.id, 'isReversible', !stage.isReversible)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${stage.isReversible ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                    {stage.isReversible ? <ArrowDownToLine size={16}/> : <ArrowUp size={16}/>}
                                    {stage.isReversible ? 'DÖNÜŞLÜ' : 'TEK YÖNLÜ'}
                                 </button>
                              </div>
                           </div>
                           <div className="overflow-hidden rounded-[32px] border-2 border-slate-100 shadow-inner">
                             <table className="w-full text-left">
                               <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 <tr>
                                   <th className="px-6 py-5 w-12 text-center">BASAMAK</th>
                                   <th className="px-6 py-5">BASINÇ (P_MAN)</th>
                                   <th className="px-6 py-5">TOPLAM KAYIP (LT / 10 DK)</th>
                                   <th className="px-6 py-5 text-indigo-400">P_EFEKTİF (BAR)</th>
                                   <th className="px-6 py-5 text-purple-400 font-black">LUGEON</th>
                                   <th className="px-6 py-4 w-12"></th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                 {stage.measurements.map((m) => (
                                   <tr key={m.id} className="hover:bg-purple-50/50 transition-colors group/row">
                                     <td className="px-6 py-4 text-xs font-black text-slate-400 text-center">{m.stepNumber}</td>
                                     <td className="px-6 py-4 font-black text-slate-900 text-sm">{m.appliedPressure} Bar</td>
                                     <td className="px-4 py-3">
                                       <input 
                                         type="text" 
                                         value={m.totalLoss} 
                                         onChange={e => updateBSTMeasurementValue(stage.id, m.id, 'totalLoss', e.target.value)} 
                                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs focus:border-purple-400 outline-none" 
                                         placeholder="Toplam Su Kaybı"
                                       />
                                     </td>
                                     <td className="px-6 py-4 font-black text-slate-500 text-sm">{m.effectivePressure}</td>
                                     <td className="px-6 py-4 font-black text-purple-600 text-base">{m.calculatedLugeon}</td>
                                     <td className="px-6 py-4"></td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                           <div className="flex justify-end pt-2">
                             <button onClick={() => setCurrentWell(prev => ({...prev, bstStages: prev.bstStages?.filter(s => s.id !== stage.id)}))} className="text-slate-300 hover:text-red-500 transition-colors flex items-center gap-1 font-bold text-[10px] uppercase">
                               <Trash2 size={14}/> KADEMEYİ SİL
                             </button>
                           </div>
                        </div>
                      ))}
                    </div>
                    {renderTabAnalysisSection('BST', currentWell.bstStages)}
                  </div>
                )}

                {wellTab === 'fotograf' && (
                  <div className="space-y-12 animate-in slide-in-from-bottom-5">
                    <div onClick={() => photoInputRef.current?.click()} className={`border-4 border-dashed rounded-[60px] p-24 text-center cursor-pointer transition-all shadow-inner group bg-slate-50 border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/30`}>
                         <Upload size={64} className="mx-auto mb-6 text-slate-300 group-hover:text-emerald-500 transition-all hover:scale-110" />
                         <h5 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Karot Fotoğraflarını Buraya Sürükleyin</h5>
                         <input type="file" multiple accept="image/*" className="hidden" ref={photoInputRef} onChange={e => handlePhotoUpload(e.target.files)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                         {currentWell.corePhotos?.map(p => (
                            <div key={p.id} className="group relative aspect-square rounded-[40px] overflow-hidden border-2 border-slate-100 shadow-lg transition-all hover:scale-105 cursor-pointer">
                               <img src={p.data} onClick={() => setPreviewPhoto(p)} className="w-full h-full object-cover" />
                               <button onClick={() => setCurrentWell(prev => ({ ...prev, corePhotos: prev.corePhotos?.filter(cp => cp.id !== p.id) }))} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"><Trash2 size={18} /></button>
                            </div>
                         ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Trial Pit Modal */}
      {isTrialPitModalOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-4xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center shrink-0">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Araştırma Çukuru Yönetimi</h2>
                 <button onClick={() => { setIsTrialPitModalOpen(false); setTabAnalysis({}); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2 col-span-2 md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">AÇ No</label><input value={currentTrialPit.pitNo} onChange={e => setCurrentTrialPit({...currentTrialPit, pitNo: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-2 border-slate-100 outline-none focus:border-emerald-500" placeholder="AÇ-01"/></div>
                    <div className="space-y-2 col-span-2 md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Derinlik (m)</label><input value={currentTrialPit.depth} onChange={e => setCurrentTrialPit({...currentTrialPit, depth: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-2 border-slate-100 outline-none focus:border-emerald-500" placeholder="2.50"/></div>
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-900 uppercase">Çukur Fotoğrafları</h4><button onClick={() => routePhotoInputRef.current?.click()} className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-2"><Upload size={16}/> FOTOĞRAF YÜKLE</button></div>
                    <input type="file" multiple className="hidden" ref={routePhotoInputRef} onChange={e => handleRoutePhotoUpload(e.target.files, true)} />
                    <div className="grid grid-cols-4 gap-4">
                       {currentTrialPit.photos?.map(p => (
                          <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm group">
                             <img src={p.data} className="w-full h-full object-cover" />
                             <button onClick={() => setCurrentTrialPit(prev => ({ ...prev, photos: prev.photos?.filter(ph => ph.id !== p.id) }))} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-900 uppercase">Çukur Litoloji Logu</h4><button onClick={startAIPitAnalysis} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md"><Sparkles size={14}/> AI LOG ÜRET</button></div>
                    <div className="overflow-hidden border-2 border-slate-100 rounded-3xl">
                       <table className="w-full text-left">
                          <thead className="bg-slate-900 text-[9px] text-slate-400 font-black uppercase">
                             <tr><th className="p-4">ARALIK (m)</th><th className="p-4">TANIMLAMA</th><th className="p-4 w-12"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {currentTrialPit.lithologySegments?.map(seg => (
                                <tr key={seg.id} className="text-xs group">
                                   <td className="p-2 w-32"><div className="flex gap-1"><input className="w-12 bg-slate-50 p-2 rounded-lg font-bold text-center" value={seg.startDepth} onChange={e => setCurrentTrialPit({...currentTrialPit, lithologySegments: currentTrialPit.lithologySegments?.map(s => s.id === seg.id ? {...s, startDepth: e.target.value} : s)})} /><span className="mt-2">-</span><input className="w-12 bg-slate-50 p-2 rounded-lg font-bold text-center" value={seg.endDepth} onChange={e => setCurrentTrialPit({...currentTrialPit, lithologySegments: currentTrialPit.lithologySegments?.map(s => s.id === seg.id ? {...s, endDepth: e.target.value} : s)})} /></div></td>
                                   <td className="p-2"><textarea className="w-full bg-slate-50 p-2 rounded-xl text-[11px] font-medium min-h-[60px]" value={seg.description} onChange={e => setCurrentTrialPit({...currentTrialPit, lithologySegments: currentTrialPit.lithologySegments?.map(s => s.id === seg.id ? {...s, description: e.target.value} : s)})} /></td>
                                   <td className="p-2 text-center"><button onClick={() => setCurrentTrialPit({...currentTrialPit, lithologySegments: currentTrialPit.lithologySegments?.filter(s => s.id !== seg.id)})} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button></td>
                                </tr>
                             ))}
                             <tr className="bg-slate-50/50"><td colSpan={3} className="p-4"><button onClick={() => setCurrentTrialPit({...currentTrialPit, lithologySegments: [...(currentTrialPit.lithologySegments || []), {id: Math.random().toString(36).substr(2, 9), startDepth: '0', endDepth: '1', description: '', rqd: '0', weathering: 'W1'}]})} className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase rounded-xl hover:bg-white hover:border-emerald-300 transition-all">+ YENİ TABAKA EKLE</button></td></tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
                 {renderTabAnalysisSection('TRIAL_PIT', currentTrialPit, 'ÇUKUR LİTOLOJİK TEKNİK DEĞERLENDİRMESİ')}
              </div>
              <div className="p-8 bg-white border-t border-slate-100 flex justify-between">
                 <button onClick={() => { setIsTrialPitModalOpen(false); setTabAnalysis({}); }} className="px-10 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">İPTAL</button>
                 <button onClick={saveTrialPit} className="px-16 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">KAYDET</button>
              </div>
           </div>
        </div>
      )}

      {/* Preview Photo Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-slate-950/95 backdrop-blur-xl animate-in zoom-in-95">
           <div className="absolute top-8 right-8 flex gap-4">
              <button onClick={() => downloadDocument(previewPhoto)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all shadow-xl"><Download size={24}/></button>
              <button onClick={() => setPreviewPhoto(null)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all shadow-xl"><X size={24}/></button>
           </div>
           <div className="max-w-[90vw] max-h-[80vh] rounded-[40px] overflow-hidden shadow-2xl border-8 border-white/5">
              <img src={previewPhoto.data} className="w-full h-full object-contain" />
           </div>
        </div>
      )}

      {/* Project Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight">Yeni Proje Tanımla</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={28} /></button>
             </div>
             <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Proje Adı</label><input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-2 border-slate-100 outline-none focus:border-emerald-500" placeholder="Ankara Metro Hattı"/></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Lokasyon</label><input value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-2 border-slate-100 outline-none focus:border-emerald-500" placeholder="Ankara"/></div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Çalışma Kapsamı</label>
                  <div className="grid grid-cols-2 gap-3">
                    {WORK_TYPES.map(wt => (
                      <button key={wt.id} onClick={() => {
                        const current = newProject.selectedWorkTypes || [];
                        setNewProject({...newProject, selectedWorkTypes: current.includes(wt.id) ? current.filter(id => id !== wt.id) : [...current, wt.id]});
                      }} className={`p-4 rounded-2xl border-2 text-left transition-all ${newProject.selectedWorkTypes?.includes(wt.id) ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100'}`}>
                        <p className="text-[10px] font-black uppercase truncate">{wt.id}</p>
                      </button>
                    ))}
                  </div>
                </div>
             </div>
             <div className="p-8 bg-white border-t border-slate-100 flex justify-end">
                <button onClick={() => {
                  const project: Project = {
                    ...newProject,
                    id: 'P-' + Math.floor(Math.random()*1000),
                    status: ProjectStatus.PLANNING,
                    tasks: [],
                    projectDocuments: [],
                    workData: {}
                  } as Project;
                  setProjects([...projects, project]);
                  setIsCreateModalOpen(false);
                }} className="px-16 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Projeyi Oluştur</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const mockProjects: Project[] = [
  { id: 'P-101', name: 'Mamak Metro Güzergah Etüdü', location: 'Ankara', status: ProjectStatus.FIELD_WORK, leadEngineer: 'Ahmet Yılmaz', startDate: '2024-01-15', description: 'Tünel ve istasyon lokasyonları için detaylı jeoteknik etüt.', tasks: [], selectedWorkTypes: ["Sondaj Çalışmaları", "Laboratuvar Çalışmaları", "Güzergah Jeolojisi Etütleri", "Harita ve Kesitler", "Genel Değerlendirme"], workData: {}, projectDocuments: [] }
];

export default ProjectManagement;