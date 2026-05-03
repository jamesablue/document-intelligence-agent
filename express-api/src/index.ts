import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from './auth/passport.js';
import authRouter from './auth/routes.js';
import uploadRouter from './upload/routes.js';
import documentsRouter from './documents/routes.js';
import chatRouter from './chat/routes.js';

const app = express();
const PORT = 3000;

app.use(cors({ origin: process.env['CORS_ORIGIN'] }));
app.use(express.json());
app.use(passport.initialize());
app.use(authRouter);
app.use(uploadRouter);
app.use(documentsRouter);
app.use(chatRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
