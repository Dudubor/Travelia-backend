import { Request, Response, NextFunction } from "express";
import { travelService } from "../services/travel";

interface DaySection {
  id: string;
  title: string;
  dateLabel?: string;
  items: DayItem[];
  notes: string[];
}

interface DayItem {
  startTime?: string;
  endTime?: string;
  text: string;
  raw?: string;
}

export const createItinerary = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { travelData, userId } = req.body;
    const { destination, startDate, endDate, preferences } = travelData

    const weatherData = { destination, startDate, endDate };
    await travelService.getWeatherInfo(weatherData, userId);


    const system = await travelService.buildSystemPrompt(startDate, endDate)
    const user = await travelService.buildUserPrompt(destination, startDate, endDate, preferences)
    const wheatherInfo = await travelService.readWheatherJson(userId)

    const result = await travelService.createItinerary(system, user, wheatherInfo);

    const { response } = result
    const text = response.choices[0].message.content ? response.choices[0].message.content : ""

    const mdInfo = await travelService.createItineraryMarkdown(text, userId)
    const { nameItineraryMD } = mdInfo
    await travelService.saveTravelData(userId, nameItineraryMD, destination, startDate, endDate)

    return res.status(201).json(result);

  } catch (err: any) {

    return res.status(409).json({ message: err.message });

  }
};


export const getTravels = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { userId } = req.body;

    const result = await travelService.getTravels(userId);


    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(409).json({ message: err.message });

  }
};

export const getTravelByMd = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { userId, md_uid } = req.body;

    const result = await travelService.getItineraryMd(userId, md_uid);


    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(409).json({ message: err.message });

  }
};

export const getItineraryMd = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { userId, md_uid } = req.body;

    const result = await travelService.getItineraryMd(userId, md_uid);
    const result_md = parseItineraryMarkdown(result);
    const { checklistFinal, estimativaGeralOrcamento, sections } = result_md

    return res.status(201).json({ md_uid, checklistFinal, estimativaGeralOrcamento, days: sections, result });
  } catch (err: any) {
    console.log("err ==> ", err);
    return res.status(409).json({ message: err.message });

  }
};
export const fetchItineraryInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { userId, md_uid } = req.body;

    const result = await travelService.fetchItineraryInfo(userId, md_uid);

    return res.status(201).json(result);
  } catch (err: any) {
    console.log("err ==> ", err);
    return res.status(409).json({ message: err.message });

  }
};



//-------------------------------------------------------------------Funções para auxiliar na leitura do Markdown--------------------------------------------------------------------------

const normalizeTime = (t: string) =>
  t.replace("h", ":").padStart(5, "0").slice(0, 5);

const slugify = (s: string) =>
  s.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);


const fold = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const isSectionLabel = (s: string) => {
  let x = s.replace(/[*_`~]/g, "");
  x = x.replace(/^\s*[-*•]\s*/, "");
  x = x.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+/u, "").trim();

  const y = fold(x);
  const labels = [
    "manha",
    "tarde",
    "noite",
    "almoco",
    "jantar",
    "plano b",
    "tempo",
    "custo",
    "deslocamento",
    "deseja",
    "checklist",
  ];

  const startsWithAny = labels.some(
    (lbl) => y.startsWith(lbl) || y.startsWith(lbl.replace("-", " "))
  );
  return startsWithAny;
};

function pickDateLabelFromTitle(title: string): string | undefined {
  const iso = title.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {
    try {
      return new Date(iso[1]).toLocaleDateString("pt-BR", {
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch { }
  }
  const br = title.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (br) return br[1];
  return undefined;
}

const dayHeaderRegex =
  /^\s*(?:#{1,3}\s*)?(?:Dia|D)\s*\d+\b.*$|^\s*(?:#{1,3}\s*)?(?:\d{2}\/\d{2}\/\d{4})\b.*$/i;

const rangeItemRegex =
  /^\s*[-*•]\s*(\d{1,2}[:h]\d{2})\s*[–—-]\s*(\d{1,2}[:h]\d{2})\s*(?:–|—|-|:)\s*(.+)\s*$/u;

const singleItemRegex =
  /^\s*[-*•]\s*(\d{1,2}[:h]\d{2})\s*(?:–|—|-|:)\s*(.+)\s*$/u;



export function parseItineraryMarkdown(md: string): {
  sections: DaySection[];
  checklistFinal: string[];
  estimativaGeralOrcamento: string[];
} {
  const lines = md.split(/\r?\n/);

  const sections: DaySection[] = [];
  const checklistFinal: string[] = [];
  const estimativaGeralOrcamento: string[] = [];

  let current: DaySection | null = null;
  let seenFirstDay = false as boolean;

  // Controle de captura das seções extras
  type CaptureMode = "none" | "checklist" | "orcamento";
  let capture: CaptureMode = "none";

  const startNewSection = (title: string) => {
    const section: DaySection = {
      id: slugify(title || `dia-${sections.length + 1}`) || `dia-${sections.length + 1}`,
      title: title.trim(),
      dateLabel: pickDateLabelFromTitle(title),
      items: [],
      notes: [],
    };
    sections.push(section);
    current = section;
  };

  for (const raw of lines) {
    const line = raw.trim();

    // 1) Quebra/fechamento da captura ao encontrar QUALQUER heading novo
    if (capture !== "none" && /^#{1,6}\s+/.test(raw)) {
      capture = "none";
      // não damos continue aqui: deixamos o heading ser processado abaixo
    }

    // 2) Detecta headings e liga captura quando forem os alvos
    const h = raw.match(/^\s*#{1,6}\s*(.+?)\s*$/);
    if (h) {
      const title = h[1];
      const f = fold(title);

      // Aceita "Checklist final" (variações) e "Estimativa geral de orçamento" (sem/with acento)
      if (/^checklist(\s+final)?$/.test(f)) {
        capture = "checklist";
        continue; // pula a linha do título
      }
      if (f.includes("estimativa") && (f.includes("orcamento") || f.includes("orçamento"))) {
        capture = "orcamento";
        continue; // pula a linha do título
      }
      // Não é um dos alvos => segue o fluxo normal (pode ser "Dia X", etc.)
    }

    // 3) Se estamos em captura, empilha as linhas e segue
    if (capture === "checklist") {
      if (line.length > 0) checklistFinal.push(raw);
      continue;
    }
    if (capture === "orcamento") {
      if (line.length > 0) estimativaGeralOrcamento.push(raw);
      continue;
    }

    // 4) Daqui pra baixo é o parser dos "Dias"
    if (dayHeaderRegex.test(line)) {
      seenFirstDay = true;
      const titleText = line.replace(/^#{1,3}\s*/, "").trim();
      startNewSection(titleText || `Dia ${sections.length + 1}`);
      continue;
    }

    if (!seenFirstDay) continue;

    let m = raw.match(rangeItemRegex);
    if (m) {
      const startTime = normalizeTime(m[1]);
      const endTime = normalizeTime(m[2]);
      const text = m[3].trim();
      current!.items.push({ startTime, endTime, text, raw });
      continue;
    }

    m = raw.match(singleItemRegex);
    if (m) {
      const startTime = normalizeTime(m[1]);
      const text = m[2].trim();
      current!.items.push({ startTime, text, raw });
      continue;
    }

    if (line.length > 0) {
      if (isSectionLabel(line)) continue;
      current!.notes.push(line);
    }
  }

  if (sections.length > 0) {
    sections.forEach((s) => {
      const withTime = s.items.filter((it) => !!it.startTime).length;
      if (withTime >= Math.max(2, Math.floor(s.items.length * 0.6))) {
        s.items.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      }
    });
  }

  return { sections, checklistFinal, estimativaGeralOrcamento };
}
