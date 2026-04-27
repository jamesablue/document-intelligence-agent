import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from './auth/passport.js';
import authRouter from './auth/routes.js';
import uploadRouter from './upload/routes.js';

const app = express();
const PORT = 3000;

app.use(cors({ origin: process.env['CORS_ORIGIN'] }));
app.use(passport.initialize());
app.use(authRouter);
app.use(uploadRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
