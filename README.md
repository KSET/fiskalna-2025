Npm install i sve oko toga

Moze se i dici preko docker compose up (najvj, meni je radilo)

## Docker

Za pokretanje svega u jednom koraku:

```bash
docker compose up --build --remove-orphans --pull always
```

Ako treba postaviti neke vrijednosti (tipa exposeat portove, postaviti mountpointove, etc.) treba napraviti override file `compose.override.yaml` i postaviti vrijednosti u njemu.

npr.

```yaml
# compose.override.yaml
services:
  db:
    volumes:
      - ./docker-data/postgres/data:/var/lib/postgresql/data

  backend:
    ports:
      - 3001:3000

  frontend:
    ports:
      - 8011:80
```

## Deploy

Deploy bi trebao biti automatski kad se pushne na `main` branch.

Potrebno je osigurati da postoji `PUBLIC_BACKEND_URL` varijabla u [GitHub Actions varijablama](./settings/variables/actions) i da je ispravna.
