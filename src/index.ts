import { configDotenv } from 'dotenv';
import {sql} from './database/connection';
import express from 'express';
import authRoutes from "./routes/auth";
import travelRoutes from "./routes/travel";
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express();
configDotenv();

const port = process.env.PORT_DEV || 3000;

sql;


app.use(cors({
  origin: ["https://<swa>.azurestaticapps.net", 'http://localhost:8080', 'http://192.168.100.166:8080/'],
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization"], 
  exposedHeaders: ["set-cookie"]
}));
app.use(express.json());
app.use(cookieParser());

//Rotas
app.use("/auth", authRoutes);
app.use("/travel", travelRoutes);

app.get('/', (req, res) => {
  res.send('Requisicao feita com sucesso');
});
app.get('/healthz', (_,res)=>res.send('ok'));


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});