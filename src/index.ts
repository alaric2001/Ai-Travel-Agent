import 'dotenv/config';        // HARUS baris pertama — load .env sebelum module lain dibuat
import 'express-async-errors';
import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import path       from 'path';
import fs         from 'fs';
import bookingRoutes from './routes/booking.routes';
import auditRoutes   from './routes/audit.routes';
import fuelRoutes    from './routes/fuel.routes';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/booking', bookingRoutes);
app.use('/api/audit',   auditRoutes);
app.use('/api/fuel',    fuelRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[API] Server berjalan di http://localhost:${PORT}`);
});

export default app;
