# Production deployment

This guide describes the infrastructure requirements for deploying the application. The public demo at `https://patronhill.ru` is not a production payment environment: it uses `EXECUTOR=stub` and performs no real transfers.

## Docker deployment

Build and run the image with production settings supplied outside source control:

```bash
docker build -t aipay:latest .

docker run -d \
  --name aipay \
  --restart unless-stopped \
  --env-file /etc/aipay/aipay.env \
  -p 127.0.0.1:3000:3000 \
  aipay:latest
```

Keep `/etc/aipay/aipay.env` readable only by the deployment account. Supply production database, session, provider, callback, and application-secret variables there according to the application's configuration reference. Do not use demo credentials or commit `.env` files.

Set `EXECUTOR=stub` only for demos, development, and explicitly non-financial test environments. Before enabling a real executor, complete provider onboarding, webhook signature validation, idempotency, reconciliation, and operational approval. A real executor must be configured deliberately; it is not implied by this guide.

## Reverse proxy and HTTPS

Terminate TLS at a reverse proxy and expose only ports `80` and `443` publicly. Bind the application container to loopback or a private network, as in the example above.

Example Nginx server block after obtaining a valid certificate:

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Replace `example.com` and certificate paths. Configure application trust for forwarded headers only when traffic can reach it exclusively through the trusted proxy; otherwise clients can forge forwarding headers.

## Security checklist

- Use a supported OS, Docker runtime, base image, and reverse proxy; patch them regularly.
- Store secrets in a secret manager or protected environment file; rotate them on suspected exposure.
- Use unique, high-entropy application and session secrets per environment.
- Restrict firewall ingress to `80`/`443` and administration access to trusted networks.
- Enforce HTTPS, secure cookies, CSRF protections where cookie authentication is used, and server-side authorization.
- Back up databases and test restore procedures; encrypt backups and restrict access.
- Centralize logs with redaction, monitor errors and authentication anomalies, and define incident response contacts.
- Validate all provider webhooks cryptographically and use idempotency for every financial side effect.
- Do not expose Docker sockets, database ports, debug endpoints, dashboards, or admin interfaces to the public internet.
- Perform a security review and provider-required compliance review before processing real payments.
