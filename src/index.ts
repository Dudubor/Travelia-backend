import { configDotenv } from 'dotenv';
import {sql} from './database/connection';
import express from 'express';
import authRoutes from "./routes/auth";
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express();
configDotenv();

const port = process.env.PORT_DEV;


//Verificacao de conexao com o banco de dados
sql;


app.use(cors({
  origin: process.env.CLIENT_ORIGIN_LOCAL || process.env.CLIENT_ORIGIN_NET,
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization"], 
  exposedHeaders: ["set-cookie"]
}));
app.use(express.json());
app.use(cookieParser());

//Rotas
app.use("/auth", authRoutes);






app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});