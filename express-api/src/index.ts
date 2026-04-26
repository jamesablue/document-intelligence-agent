import 'dotenv/config';
import express from 'express';
import passport from './auth/passport.js';
import authRouter from './auth/routes.js';

const app = express();
const PORT = 3000;

app.use(passport.initialize());
app.use(authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
