// dotenv must load before ./app.js, whose modules read env vars at import time.
import 'dotenv/config';
import app from './app.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
