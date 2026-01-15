import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeExperimentData = async (type: 'SPT' | 'BST' | 'PRESIYOMETRE' | 'PERMABILITE' | 'ROUTE' | 'TRIAL_PIT' | 'GENEL_WELL', data: any, identifier: string) => {
  const ai = getAI();
  try {
    let prompt = "";
    if (type === 'ROUTE') {
      prompt = `Sen uzman bir Jeoloji Mühendisisin. "${identifier}" isimli güzergah etüdü verilerini (araştırma çukurları, gözlemler vb.) teknik olarak sentezle ve bir güzergah jeolojisi raporu oluştur.
      Veriler: ${JSON.stringify(data)}
      Rapor Yapısı:
      1. # GÜZERGAH JEOLOJİSİ VE ŞEV STABİLİTESİ DEĞERLENDİRMESİ
      2. ## GÜZERGAH GENEL JEOLOJİSİ
      3. ## ARAŞTIRMA ÇUKURLARININ SENTEZİ
      4. ## MÜHENDİSLİK JEOLOJİSİ VE RİSK ANALİZİ (Heyelan, stabilite vb.)
      5. ## SONUÇ VE ÖNERİLER`;
    } else if (type === 'TRIAL_PIT') {
      prompt = `Sen uzman bir Jeoloji Mühendisisin. "${identifier}" nolu araştırma çukuru verilerini analiz et.
      Veriler: ${JSON.stringify(data)}
      Rapor Yapısı:
      1. # ARAŞTIRMA ÇUKURU TEKNİK ANALİZİ
      2. ## LİTOLOJİK İSTİF
      3. ## ZEMİN/KAYA SINIFLAMASI VE YORUMU
      4. ## TEMEL TASARIMI VE KAZILABİLİRLİK YORUMU`;
    } else {
      prompt = `Sen uzman bir Geoteknik Mühendisisin. ${identifier} nolu sondaj kuyusuna ait aşağıdaki ${type} deneyi verilerini teknik olarak analiz et ve bir rapor oluştur.
      
      Veriler: ${JSON.stringify(data)}
      
      Rapor şu yapıda olmalıdır (Markdown formatında):
      1. # ${type} DENEYİ TEKNİK ANALİZ RAPORU
      2. ## VERİ ÖZETİ (Derinlikler ve temel değerler)
      3. ## MÜHENDİSLİK DEĞERLENDİRMESİ (Zemin/Kaya davranışı, sertlik/sıkılık/geçirimlilik yorumu)
      4. ## PARAMETRİK TAHMİNLER (Varsa ampirik formüllere göre emniyetli gerilme, elastisite modülü vb. tahminleri)
      5. ## SONUÇ VE ÖNERİLER (Proje tasarımı için kritik uyarılar)
      
      Dil: Türkçe. Teknik terimleri doğru kullan. Önemli değerleri **kalın** yaz.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.4,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error(`${type} Analysis Error:`, error);
    return "# Hata\nAnaliz oluşturulurken bir teknik sorun oluştu.";
  }
};

export const generateProjectSummary = async (projectDetails: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Aşağıdaki jeoloji projesi detaylarına dayanarak teknik bir yönetici özeti ve arazi çalışma önerileri hazırla (Türkçe): ${projectDetails}`,
      config: {
        temperature: 0.7,
        topP: 0.8,
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Özet oluşturulurken bir hata oluştu.";
  }
};

export const generateFullGeologicalReport = async (projectData: any) => {
  const ai = getAI();
  try {
    const prompt = `Sen kıdemli bir Jeoloji Mühendisisin. Aşağıda sağlanan tüm verileri kullanarak profesyonel, kapsamlı ve teknik bir "Jeolojik-Jeoteknik Etüt Raporu" oluştur.
    
    Proje Bilgileri: ${JSON.stringify(projectData.meta)}
    Sondaj Verileri: ${JSON.stringify(projectData.wells)}
    Laboratuvar Verileri: ${JSON.stringify(projectData.lab)}
    Önceki Analiz Notları: ${JSON.stringify(projectData.analyses)}
    Güzergah Verileri: ${JSON.stringify(projectData.routes)}
    
    Rapor şu bölümlerden oluşmalı ve profesyonel bir akademik üslupla yazılmalı:
    1. # PROJE ÖZETİ VE AMAÇ
    2. # SAHA ÇALIŞMALARI (Sondaj lokasyonları, derinlikler, koordinatlar)
    3. # LİTOLOJİK VE STRATİGRAFİK DEĞERLENDİRME (Karot verileri baz alınarak)
    4. # JEOTEKNİK PARAMETRELER VE LABORATUVAR ANALİZİ (Deney sonuçlarının detaylı yorumlanması)
    5. # MÜHENDİSLİK DEĞERLENDİRMESİ VE ÖNERİLER (Sıvılaşma riski, taşıma gücü, temel tipi önerileri vb.)
    
    Format: Markdown kullan. Önemli terimleri **bold** yap.
    Dil: Türkçe.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Report Generation Error:", error);
    return "# Hata\nRapor oluşturulurken teknik bir sorun oluştu.";
  }
};

export const analyzeSingleLabDocument = async (photo: { data: string, mimeType: string }, scope: string) => {
  const ai = getAI();
  try {
    const prompt = `Bu belge bir laboratuvar deney sonucudur. Kapsamı: "${scope}".
    Lütfen bu belgeyi teknik olarak analiz et. Önemli bulguları, deneyin geçerliliğini ve sonuçların jeoteknik açıdan ne anlama geldiğini özetle.
    Yanıt dili: Türkçe. Teknik ve profesyonel ol.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ 
        inlineData: { 
          data: photo.data.split(',')[1] || photo.data, 
          mimeType: photo.mimeType 
        } 
      }, { text: prompt }] }
    });
    return response.text;
  } catch (error) {
    return "Doküman analizi yapılamadı.";
  }
};

export const analyzeMapOrSection = async (file: { data: string, mimeType: string }, fileName: string) => {
  const ai = getAI();
  try {
    const prompt = `Sen uzman bir jeoloji mühendisisin. Ekli belge bir jeolojik harita veya enkesittir. (Dosya adı: ${fileName}).
    Lütfen bu görseli/belgeyi analiz et ve şu bilgileri içeren teknik bir özet raporu hazırla:
    1. Harita/Kesit üzerindeki temel jeolojik birimler.
    2. Varsa yapısal unsurlar (faylar, kıvrımlar, doğrultu/eğim).
    3. Mühendislik jeolojisi açısından riskli alanlar (heyelan, sıvılaşma potansiyeli vb.).
    4. Kesit ise, tabakalaşma düzeni ve birimlerin düşey ilişkisi.
    
    Not: Eğer dosya bir CAD çıktısı veya teknik çizim ise lejant bilgilerini ve birim sembollerini öncelikle analiz et.
    Yanıt dili: Türkçe. Markdown formatında teknik bir dille yaz.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ 
        inlineData: { 
          data: file.data.split(',')[1] || file.data, 
          mimeType: file.mimeType 
        } 
      }, { text: prompt }] }
    });
    return response.text;
  } catch (error) {
    console.error("Map Analysis Error:", error);
    return "Harita analizi yapılamadı.";
  }
};

export const analyzeCorePhotos = async (photos: { data: string, mimeType: string }[], interval: number) => {
  const ai = getAI();
  try {
    const parts = photos.map(p => ({
      inlineData: {
        data: p.data.split(',')[1] || p.data,
        mimeType: p.mimeType
      }
    }));

    const prompt = `Bu jeolojik karot fotoğraflarını incele. 
    Fotoğraftaki karotları analiz ederek, her bir derinlik kademesi için ${interval}'er metrelik aralıklarla (0-${interval}, ${interval}-${interval * 2}, ...) bir litoloji logu oluştur. 
    Her ${interval} metrelik aralık için şu bilgileri tahmin et:
    1. Litoloji Tanımlaması (Örn: Boz-kahve renkli, orta ayrışmış, killi kireçtaşı)
    2. Tahmini RQD (%) değeri (0-100 arası sayısal değer)
    3. Ayrışma (Weathering) durumu (W1-W5 arası)
    
    Yanıtı şu JSON formatında ver: 
    [{"startDepth": "0", "endDepth": "${interval}", "description": "...", "rqd": "...", "weathering": "..."}]
    Sadece JSON döndür. Tüm derinlik boyunca tam olarak ${interval}m aralıkları koru.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startDepth: { type: Type.STRING },
              endDepth: { type: Type.STRING },
              description: { type: Type.STRING },
              rqd: { type: Type.STRING },
              weathering: { type: Type.STRING },
            },
            required: ["startDepth", "endDepth", "description", "rqd", "weathering"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Core Photo Analysis Error:", error);
    return [];
  }
};

export const analyzeTrialPitPhotos = async (photos: { data: string, mimeType: string }[]) => {
  const ai = getAI();
  try {
    const parts = photos.map(p => ({
      inlineData: {
        data: p.data.split(',')[1] || p.data,
        mimeType: p.mimeType
      }
    }));

    const prompt = `Bu araştırma çukuru fotoğraflarını incele. 
    Fotoğraftaki tabakaları analiz ederek bir litoloji logu oluştur. 
    Her tabaka için şu bilgileri tahmin et:
    1. startDepth (m)
    2. endDepth (m)
    3. description (Litoloji Tanımlaması)
    
    Yanıtı şu JSON formatında ver: 
    [{"startDepth": "0", "endDepth": "1.2", "description": "..."}]
    Sadece JSON döndür.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startDepth: { type: Type.STRING },
              endDepth: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["startDepth", "endDepth", "description"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Trial Pit Analysis Error:", error);
    return [];
  }
};

export const analyzeLabForm = async (photo: { data: string, mimeType: string }) => {
  const ai = getAI();
  try {
    const prompt = `Bu laboratuvar deney sonuç formunu incele ve içindeki tüm deneyleri ayıkla.
    Her deney için şu bilgileri yakala:
    - category: "GEOTECHNICAL" veya "MATERIAL"
    - name: Deneyin adı (Örn: Elek Analizi)
    - sampleId: Numune numarası (Örn: BH-1)
    - depth: Numune derinliği
    - results: Deney sonucu veya özeti
    - date: Deney tarihi (YYYY-MM-DD formatında)
    - status: Her zaman "COMPLETED"
    
    Yanıtı şu JSON formatında bir dizi olarak döndür. Sadece JSON döndür.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ 
        inlineData: { 
          data: photo.data.split(',')[1] || photo.data, 
          mimeType: photo.mimeType 
        } 
      }, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};

export const analyzeGenericLabTable = async (photo: { data: string, mimeType: string }) => {
  const ai = getAI();
  try {
    const prompt = `Bu laboratuvar sonuç formundaki ana veri tablosunu bul ve satır-sütun yapısını bozmadan ayıkla.
    Headers ve data rows olarak ayır. Yanıtı JSON formatında döndür.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ 
        inlineData: { 
          data: photo.data.split(',')[1] || photo.data, 
          mimeType: photo.mimeType 
        } 
      }, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{"headers":[], "rows":[]}');
  } catch (error) {
    return { headers: [], rows: [] };
  }
};

export const analyzeLabResults = async (tests: any[]) => {
  const ai = getAI();
  try {
    const testsSummary = tests.map(t => `${t.name} (Numune: ${t.sampleId}, Derinlik: ${t.depth}m): ${t.results}`).join('\n');
    const prompt = `Aşağıdaki laboratuvar deney sonuçlarını bir jeoloji mühendisi gözüyle teknik olarak değerlendir:

${testsSummary}

    Analizini Markdown formatında hazırla. Zemin/kaya sınıflaması, mühendislik parametreleri ve önerileri mutlaka ekle.
    Dil: Türkçe.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.4,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    return "# Hata\nAnaliz sırasında bir hata oluştu.";
  }
};

export const analyzeFieldNotes = async (notes: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Bu arazi notlarını profesyonel bir jeolojik rapor formatına dönüştür: ${notes}`,
    });
    return response.text;
  } catch (error) {
    return "Notlar analiz edilemedi.";
  }
};