import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "../db/prisma";

const execAsync = promisify(exec);
const NGINX_CONF_PATH = "/etc/nginx/sites-available/travel-crm";

/**
 * Regenerates the Nginx server_name block with all active client subdomains
 * and reloads Nginx dynamically without dropping connections.
 */
export async function syncNginxSubdomains() {
  // Only execute on Linux server
  if (process.platform !== "linux" || !fs.existsSync(NGINX_CONF_PATH)) {
    return;
  }

  try {
    const clients = await prisma.client.findMany({
      where: {
        subscriptionStatus: { in: ["ACTIVE", "EXPIRING_SOON", "GRACE", "LOCKED"] },
        deletedAt: null,
      },
      select: { subdomain: true },
    });

    const activeSubdomains = clients
      .map((c) => c.subdomain?.trim().toLowerCase())
      .filter((s): s is string => Boolean(s))
      .map((s) => `${s}.digiinksolutions.com`);

    // Always include the root portal domains
    const serverNames = Array.from(new Set([
      "travel-crm.digiinksolutions.com",
      "travel-akash.digiinksolutions.com",
      ...activeSubdomains,
    ])).join(" ");

    const configContent = `server {
    listen 443 ssl;
    server_name ${serverNames};

    ssl_certificate /etc/letsencrypt/live/diassignments.digiinksolutions.com-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/diassignments.digiinksolutions.com-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 25M;

    # Backend API Proxy
    location /api {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # Uploads
    location /uploads {
        alias /var/www/travel-crm/backend/uploads;
    }

    # Frontend Static Files
    location / {
        root /var/www/travel-crm/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}

server {
    listen 80;
    server_name ${serverNames};
    return 301 https://$host$request_uri;
}
`;

    fs.writeFileSync(NGINX_CONF_PATH, configContent, "utf8");
    await execAsync("nginx -t && systemctl reload nginx");
    console.log("[nginx-sync] Reloaded Nginx with subdomains:", serverNames);
  } catch (err) {
    console.error("[nginx-sync:error]", err);
  }
}
