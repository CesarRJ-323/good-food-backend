#!/usr/bin/env python3
"""
Test E2E de la API Good Food (favoritos, reseñas, pedidos).
Reproduce el flujo real del frontend en el navegador:
  1) GET /csrf-token  -> setea cookie gf_csrf (httpOnly) + devuelve token
  2) el JS agrega header x-csrf-token en cada mutación
  3) el navegador reenvía la cookie gf_csrf automáticamente (header Cookie)
requests NO reenvía la cookie sola a /api en localhost, así que la inyectamos
en el header Cookie de cada mutación (réplica 1:1 de lo que hace el browser).
NO imprime tokens/JWT.
"""
import sys, os
import requests

BASE = os.environ.get("API_BASE", "http://localhost:4000")
passed, failed = 0, 0

def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [OK]  {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}  {detail}")

def main():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})

    print("== 1. CSRF + demo login ==")
    r = s.get(f"{BASE}/api/auth/csrf-token")
    check("GET /csrf-token 200", r.status_code == 200, r.text[:120])
    csrf = r.json().get("csrfToken", "")
    gf_cookie = s.cookies.get_dict().get("gf_csrf", "")
    check("csrf cookie gf_csrf presente", bool(gf_cookie), str(s.cookies.get_dict().keys()))
    # Header que el JS del frontend agrega en cada mutación:
    s.headers.update({"x-csrf-token": csrf})
    # Cookie que el navegador reenvía sola (lo inyectamos en header Cookie):
    s.headers.update({"Cookie": f"gf_csrf={gf_cookie}"})

    r = s.get(f"{BASE}/api/auth/demo-user")
    check("GET /demo-user 200", r.status_code == 200, r.text[:120])
    auth = r.json()
    token = auth.get("tokens", {}).get("accessToken", "")
    uid = auth.get("user", {}).get("id", "")
    check("demo user tiene id", bool(uid), f"uid={uid}")
    check("demo user tiene accessToken", bool(token))
    s.headers.update({"Authorization": f"Bearer {token}"})

    print("== 2. Carga de platos (ids reales DB) ==")
    r = s.get(f"{BASE}/api/dishes?limit=3")
    check("GET /dishes 200", r.status_code == 200, r.text[:120])
    dishes = r.json()
    check("hay >=3 platos", len(dishes) >= 3, f"len={len(dishes)}")
    dish_ids = [d["id"] for d in dishes]

    print("== 3. Favoritos (vacío inicial) ==")
    r = s.get(f"{BASE}/api/favorites")
    check("GET /favorites 200", r.status_code == 200, r.text[:120])
    check("favoritos inicia vacío", r.json() == [], r.text[:120])

    print("== 4. POST favorito ==")
    r = s.post(f"{BASE}/api/favorites", json={"dishId": dish_ids[0]})
    check("POST /favorites 201", r.status_code in (200, 201), r.text[:160])
    fav = r.json()
    check("favorito trae dish.name", bool(fav.get("dish", {}).get("name")), str(fav)[:160])

    print("== 5. POST favorito duplicado (idempotente) ==")
    r = s.post(f"{BASE}/api/favorites", json={"dishId": dish_ids[0]})
    check("POST dup no rompe (200/201)", r.status_code in (200, 201), r.text[:160])
    r = s.get(f"{BASE}/api/favorites")
    check("GET /favorites tiene 1", len(r.json()) == 1, r.text[:160])

    print("== 6. Persistencia: segundo favorito ==")
    r = s.post(f"{BASE}/api/favorites", json={"dishId": dish_ids[1]})
    check("POST 2do favorito 201", r.status_code in (200, 201), r.text[:160])
    r = s.get(f"{BASE}/api/favorites")
    favs = r.json()
    check("GET /favorites tiene 2", len(favs) == 2, f"len={len(favs)}")

    print("== 7. DELETE favorito ==")
    r = s.delete(f"{BASE}/api/favorites/{dish_ids[0]}")
    check("DELETE /favorites/:id 200", r.status_code == 200, r.text[:160])
    r = s.get(f"{BASE}/api/favorites")
    check("tras DELETE queda 1", len(r.json()) == 1, f"len={len(r.json())}")

    print("== 8. POST plato inexistente -> 404 ==")
    r = s.post(f"{BASE}/api/favorites", json={"dishId": "no-existe-xyz"})
    check("POST plato inexistente 404", r.status_code == 404, r.text[:160])

    print("== 9. Reseñas del usuario (persistencia) ==")
    r = s.get(f"{BASE}/api/reviews/me")
    check("GET /reviews/me 200", r.status_code == 200, r.text[:160])
    check("reseñas incluyen dish.name",
          all(rev.get("dish", {}).get("name") for rev in r.json()), r.text[:200])

    print("== 10. Pedidos del usuario ==")
    r = s.get(f"{BASE}/api/delivery/orders")
    check("GET /delivery/orders 200", r.status_code == 200, r.text[:160])

    print("== 11. Auth requerida en /favorites ==")
    s2 = requests.Session()
    r = s2.get(f"{BASE}/api/favorites")
    check("GET /favorites sin auth 401", r.status_code == 401, f"status={r.status_code}")

    print(f"\nRESULTADO: {passed} OK, {failed} FAIL")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
