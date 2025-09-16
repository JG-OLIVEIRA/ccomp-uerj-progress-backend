import express from 'express';
import 'dotenv/config';
import { initMongo } from './db/mongo.js';
import disciplinesRouter from './routes/disciplines.js';
import studentsRouter from './routes/students.js';
import swaggerRouter from './routes/swagger.js';

const app = express();

app.use(express.json());
app.use('/api-docs', swaggerRouter);
app.use('/disciplines', disciplinesRouter);
app.use('/students', studentsRouter);

initMongo().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log("🚀 Server rodando");
    });
}).catch(err => {
    console.error("❌ Falha ao conectar no MongoDB:", err);
});