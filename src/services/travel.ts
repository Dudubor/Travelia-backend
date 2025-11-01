import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import tmp from "tmp";
import crypto from "node:crypto"
import { sql } from "../database/connection";
import path from "path";
import OpenAI from 'openai';
import { console } from "inspector";
import { v4 } from "uuid";


dotenv.config();


type Itinerary = {
    id: string;
    destination: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
};

export class TravelService {

    async getWeatherInfo(data: { destination: string; startDate: string; endDate: string }, userId: string) {
        try {
            const url = `${process.env.WEATHER_VISUAL_CROSSING_URL}${data.destination}/${data.startDate}/${data.endDate}`
            const response = await axios.get(url, {
                params: {
                    key: process.env.WEATHER_VISUAL_CROSSING_API_KEY,
                    unitGroup: "metric",
                    include: "days",
                    elements: "datetime,temp,humidity,precip,windspeed,conditions",
                    contentType: "json",
                },
            });

            const tempDir = path.join(process.cwd(), "temp");

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const tempFile = path.join(tempDir, `${userId}weather.json`);

            fs.writeFileSync(tempFile, JSON.stringify(response.data, null, 2));

            return;

        } catch (err: any) {


            throw err;


        }
    }


    async createItinerary(system: string, user: string, wheatherInfo: string) {
        try {

            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


            const response = await client.chat.completions.create({
                model: 'gpt-5-mini',
                messages: [
                    {
                        role: 'system',
                        content: system
                    },
                    {
                        role: 'user',
                        content: `${user}\n\nARQUIVO CLIMA (JSON):\n${wheatherInfo}\n\nUse este JSON para inferir clima diário do período.`
                    }
                ]
                /*  max_output_tokens: 2500, */
            });

            // `output_text` costuma trazer o texto pronto
            const texto = (response as any).output_text ?? JSON.stringify(response, null, 2);
            return ({
                itinerary_parsed: texto,
                response: response
            });

        } catch (err: any) {

            console.error(err)
            throw err;


        }
    }

    async buildSystemPrompt(startDate: string, endDate: string) {

        const systemPrompt = [
            "Você é um planner de viagens sênior especializado em criar roteiros detalhados e realistas com base em previsões climáticas e preferências do viajante.",
            "",
            "Regras fundamentais:",
            `- Considere rigorosamente o período de ${startDate} a ${endDate}.`,
            "- Use o CLIMA fornecido apenas como base de inferência (não cite termos técnicos como 'JSON').",
            "- Respeite as preferências do usuário (quando informadas).",
            "- Gere um **roteiro diário** com horários sugeridos, deslocamentos, nome de restaurantes, tempo médio de visita e plano B em caso de chuva.",
            "- Balanceie atividades pagas e gratuitas, otimizando deslocamentos por região/bairro.",
            "- **A saída final deve seguir exatamente o modelo Markdown fornecido.**",
            "- **Não altere títulos, subtítulos, nem a ordem das seções do modelo.md.**",
            "- **A saída deve ser exclusivamente o texto Markdown.**",
        ].join("\n");

        return systemPrompt
    }

    async buildUserPrompt(destino: string, dataInicio: string, dataFim: string, preferencias?: string) {

        const modeloPath = path.resolve("modelo.md");
        const modeloMD = fs.readFileSync(modeloPath, "utf-8");

        const userPrompt = [
            `Gere um roteiro de viagem preenchendo o modelo abaixo.`,
            "",
            "### Contexto da viagem:",
            `- **Destino:** ${destino}`,
            `- **Período:** ${dataInicio} a ${dataFim}`,
            `- **Preferências:** ${preferencias || "não informadas"}`,
            "",
            "### Instruções obrigatórias:",
            "- Use **somente o modelo Markdown fornecido abaixo** como estrutura-base.",
            "- **Mantenha todos os títulos, subtítulos, marcadores e hierarquias exatamente como estão.**",
            "- Substitua apenas o conteúdo descritivo (textos, horários, atrações, custos, etc.).",
            "- Se alguma informação não se aplicar, mantenha a seção e escreva `N/A`.",
            "- **Não crie novas seções nem remova existentes.**",
            "- Use linguagem natural e descritiva, sem mencionar 'modelo', 'JSON' ou termos técnicos.",
            "- A previsão do tempo deve sempre começar com 'Com base nas nossas previsões do tempo...'.",
            "",
            "### Template a ser seguido (copie exatamente a estrutura e apenas preencha o conteúdo):",
            "```markdown",
            modeloMD,
            "```",
        ].join("\n");
        return userPrompt
    }

    async readWheatherJson(userId: string) {

        const weatherPath = path.resolve(process.cwd(), 'temp', `${userId}weather.json`);
        if (!fs.existsSync(weatherPath)) {
            throw new Error(`Arquivo /temp/${userId}weather.json não encontrado.`)
        }
        const weatherRaw = fs.readFileSync(weatherPath, 'utf-8');

        return weatherRaw
    }

    async createItineraryMarkdown(text: string, userId: string) {

        if (!text) throw new Error("Sem conteúdo para salvar (output_text vazio).");
        const baseDir = path.resolve(process.cwd(), "temp/itinerary")


        const idItineraryMd = v4()
        // gera nome único
        const now = new Date();
        const nameItineraryMD = `itinerary-${idItineraryMd}.md`;

        // garante pasta
        fs.mkdirSync(baseDir, { recursive: true });

        // escreve arquivo .md
        const filePath = path.join(baseDir, nameItineraryMD);
        await fs.promises.writeFile(filePath, text, { encoding: "utf8" });

        // metadados
        const size = Buffer.byteLength(text, "utf8");
        const sha256 = crypto.createHash("sha256").update(text).digest("hex");

        return { filePath, size, sha256, nameItineraryMD };



    }

    async saveTravelData(userId: any, nameItineraryMD: any, destination: any, startDate: any, endDate: any,) {

        const exists = await sql/*sql*/`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1`;

        if (exists.length === 0) throw new Error("Não foi possivel encontrar o usuário");

        try {
            await sql/*sql*/`
        INSERT INTO travel_info (user_id, md_uid, start_date, end_date, destination)
        VALUES (${userId}, ${nameItineraryMD}, ${startDate}, ${endDate}, ${destination})`

            return true;
        } catch (err: any) {

            throw err;
        }



    }

    async getTravels(userId: any) {

        const travels = [];
        try {
            const exists = await sql/*sql*/`
             SELECT id FROM users WHERE id = ${userId} LIMIT 1`;

            if (exists.length === 0) throw new Error("Não foi possivel encontrar o usuário");


            const fetched_travels = await sql/*sql*/
                `SELECT user_id, md_uid, start_date, end_date, destination FROM travel_info WHERE user_id = ${userId}`

            travels.push(fetched_travels)
            return travels;
        } catch (err: any) {

            throw err;
        }
    }
    async getItineraryMd(userId: string, md_uid: string) {
        try {


            const text = fs.readFileSync(`temp/itinerary/${md_uid}`, "utf-8");
            return text
        } catch (err: any) {
            console.log("err ==> ", err);

            throw err;
        }
    }
    async fetchItineraryInfo(userId: string, md_uid: string) {
        try {
            const exists = await sql/*sql*/`
             SELECT id FROM users WHERE id = ${userId} LIMIT 1`;

            if (exists.length === 0) throw new Error("Não foi possivel encontrar o usuário");


            const fetched_travels = await sql/*sql*/
                `SELECT user_id, md_uid, start_date, end_date, destination FROM travel_info WHERE user_id = ${userId} AND md_uid = ${md_uid}`

            return fetched_travels;
        } catch (err: any) {
            console.log("err ==> ", err);

            throw err;
        }
    }

}

export const travelService = new TravelService();