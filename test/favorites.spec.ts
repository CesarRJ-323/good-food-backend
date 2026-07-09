import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Apunta al backend YA CORRIENDO en :4000 (arrancar con `npm run start:dev`
// o el proceso de producción antes de correr tests).
// Esto usa el backend real (Prisma + SQLite + CSRF + JWT), igual que en producción.
const BASE = process.env.API_BASE || 'http://localhost:4000';

describe('Good Food API — Favoritos (integración contra backend live)', () => {
  let server: any;
  let csrfToken: string;
  let gfCookie: string;
  let authToken: string;
  let dishIds: string[] = [];

  beforeAll(async () => {
    server = request(BASE);
    // 1) CSRF token (setea cookie gf_csrf en el agente)
    const csrfRes = await server.get('/api/auth/csrf-token');
    expect(csrfRes.status).toBe(200);
    csrfToken = csrfRes.body.csrfToken;
    expect(typeof csrfToken).toBe('string');
    // capturar la cookie gf_csrf del set-cookie (supertest no la reenvía sola)
    const setCookie = csrfRes.headers['set-cookie'];
    gfCookie = Array.isArray(setCookie)
      ? setCookie.map((c) => c.split(';')[0]).find((c) => c.startsWith('gf_csrf=')) || ''
      : '';
    // 2) Login demo (GET, eximido de CSRF)
    const demoRes = await server.get('/api/auth/demo-user');
    expect(demoRes.status).toBe(200);
    authToken = demoRes.body.tokens.accessToken;
    expect(typeof authToken).toBe('string');
    // 3) Platos reales de la DB
    const dishesRes = await server.get('/api/dishes?limit=3');
    expect(dishesRes.status).toBe(200);
    dishIds = dishesRes.body.map((d: any) => d.id);
    expect(dishIds.length).toBeGreaterThanOrEqual(3);
  });

  const authHeaders = () => ({
    Authorization: 'Bearer ' + authToken,
    'x-csrf-token': csrfToken,
    Cookie: gfCookie,
  });

  it('GET /api/favorites requiere auth (401 sin token)', async () => {
    const res = await server.get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('GET /api/favorites inicia vacío para el demo user', async () => {
    const res = await server.get('/api/favorites').set(authHeaders());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // limpieza: borra lo que pueda quedar de corridas previas
    for (const f of res.body) {
      await server.delete(`/api/favorites/${f.dishId}`).set(authHeaders());
    }
    const after = await server.get('/api/favorites').set(authHeaders());
    expect(after.body).toEqual([]);
  });

  it('POST /api/favorites guarda un favorito y lo trae con dish.name', async () => {
    const res = await server
      .post('/api/favorites')
      .set(authHeaders())
      .send({ dishId: dishIds[0] });
    expect(res.status).toBe(201);
    expect(res.body.dish).toBeDefined();
    expect(typeof res.body.dish.name).toBe('string');
  });

  it('POST duplicado es idempotente (no crea 2)', async () => {
    await server.post('/api/favorites').set(authHeaders()).send({ dishId: dishIds[0] });
    const res = await server.get('/api/favorites').set(authHeaders());
    expect(res.body.length).toBe(1);
  });

  it('persiste: segundo favorito se suma', async () => {
    const res = await server
      .post('/api/favorites')
      .set(authHeaders())
      .send({ dishId: dishIds[1] });
    expect(res.status).toBe(201);
    const list = await server.get('/api/favorites').set(authHeaders());
    expect(list.body.length).toBe(2);
  });

  it('DELETE /api/favorites/:dishId borra y persiste', async () => {
    const res = await server.delete(`/api/favorites/${dishIds[0]}`).set(authHeaders());
    expect(res.status).toBe(200);
    const list = await server.get('/api/favorites').set(authHeaders());
    expect(list.body.length).toBe(1);
  });

  it('POST con dishId inexistente -> 404', async () => {
    const res = await server
      .post('/api/favorites')
      .set(authHeaders())
      .send({ dishId: 'no-existe-xyz' });
    expect(res.status).toBe(404);
  });

  it('GET /api/reviews/me trae reseñas con dish.name (persistencia)', async () => {
    const res = await server.get('/api/reviews/me').set(authHeaders());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].dish).toBeDefined();
      expect(typeof res.body[0].dish.name).toBe('string');
    }
  });

  it('GET /api/delivery/orders responde 200 (persistencia pedidos)', async () => {
    const res = await server.get('/api/delivery/orders').set(authHeaders());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // limpieza final
  afterAll(async () => {
    if (!authToken || !csrfToken) return;
    const list = await server.get('/api/favorites').set(authHeaders());
    for (const f of list.body) {
      await server.delete(`/api/favorites/${f.dishId}`).set(authHeaders());
    }
  });
});
