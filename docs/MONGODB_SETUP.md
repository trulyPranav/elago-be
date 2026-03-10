# MongoDB Atlas Setup Guide

Step-by-step guide to create a free Atlas cluster and connect the Elago backend to it.

---

## 1. Create an Atlas Account

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up (free).
2. Choose **"Deploy your first cluster"** after email verification.

---

## 2. Create a Free Cluster (M0)

1. Select **"M0 Free"** tier.
2. Choose a cloud provider and a region close to you (e.g. AWS / Mumbai or AWS / Singapore for India).
3. Name your cluster — e.g. `elago-cluster`.
4. Click **Create Deployment**.

> The cluster takes ~2 minutes to provision.

---

## 3. Create a Database User

1. In the left sidebar → **Security → Database Access**.
2. Click **"+ Add New Database User"**.
3. Choose **Password** authentication.
4. Username: `elago_admin` (or any name you prefer).
5. Password: generate a strong password and **save it** — you will not see it again.
6. Under **Built-in Role** select **"Atlas admin"** (or restrict to your specific DB later).
7. Click **Add User**.

---

## 4. Whitelist Your IP Address

1. Left sidebar → **Security → Network Access**.
2. Click **"+ Add IP Address"**.
3. For development: click **"Add Current IP Address"**.  
   For production (Vercel / Railway / etc.): add `0.0.0.0/0` (allow all) — then lock it down to your host's egress IPs later.
4. Click **Confirm**.

---

## 5. Get Your Connection String

1. Left sidebar → **Deployment → Database**.
2. Click **Connect** on your cluster.
3. Choose **"Drivers"**.
4. Select **Node.js** and version **5.x or later**.
5. Copy the connection string — it looks like:

```
mongodb+srv://<username>:<password>@elago-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=elago-cluster
```

---

## 6. Configure the `.env` File

In the `elago_be` root, copy the example file and fill it in:

```bash
copy .env.example .env
```

Open `.env` and set `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://elago_admin:YOUR_PASSWORD@elago-cluster.xxxxx.mongodb.net/elago?retryWrites=true&w=majority&appName=elago-cluster
```

**Important substitutions:**

| Placeholder | Replace with |
|---|---|
| `elago_admin` | The database username you created in step 3 |
| `YOUR_PASSWORD` | The password from step 3 (URL-encode special chars: `@` → `%40`, `#` → `%23`) |
| `elago-cluster.xxxxx` | Your actual cluster subdomain from the copied string |
| `elago` | The database name (Atlas creates it automatically on first write) |

---

## 7. Seed the Database

With `.env` configured, run the seed script to populate the 6 sample properties:

```bash
npm run seed
```

Expected output:

```
Connected to MongoDB Atlas
Cleared existing properties.

Seeded 6 properties:
  • [685...] Prestige Lakeside Habitat
  • [685...] Sobha Dream Acres
  • [685...] Embassy Springs
  • [685...] Brigade Meadows
  • [685...] Adarsh Palm Retreat
  • [685...] Mahindra Windchimes

Disconnected from MongoDB.
```

---

## 8. Verify in Atlas UI

1. Atlas → **Deployment → Database → Browse Collections**.
2. You should see a database called `elago` with a `properties` collection containing 6 documents.

---

## 9. Start the Server

```bash
# Development (auto-restarts on file change)
npm run dev

# Production
npm start
```

---

## Atlas Collections Reference

| Collection | Managed by | Notes |
|---|---|---|
| `properties` | Mongoose `Property` model | Main data collection |

### Indexes created automatically by Mongoose

| Index | Type | Purpose |
|---|---|---|
| `system.is_active` | Single | Filter active listings |
| `propertyType` | Single | Filter by type |
| `status` | Single | Filter by status |
| `builder` | Single | Filter by builder |
| `high_appreciation` | Single | Filter flag |
| `pricing.price_from + price_to` | Compound | Price range queries |
| `location.city + location.area` | Compound | Location queries |
| `name, builder, details.description` | Text (weighted) | Full-text search (`?q=`) |

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `MongoServerSelectionError: connection timed out` | IP not whitelisted | Add your IP in Network Access |
| `Authentication failed` | Wrong username/password in URI | Double-check `.env` credentials |
| `querySrv ENOTFOUND` | Wrong cluster host in URI | Copy connection string again from Atlas |
| `querySrv ECONNREFUSED` | Node.js c-ares DNS bug on Windows with SRV records | Use the standard (non-SRV) connection string format with direct shard hosts — see note below |
| `MONGODB_URI is not set` | `.env` file missing or not in project root | Run `copy .env.example .env` and fill it |
| Special chars in password fail | URL encoding issue | Encode `@` → `%40`, `#` → `%23`, `$` → `%24` in the password portion of the URI |

> **Windows / Node.js SRV workaround:** If you see `querySrv ECONNREFUSED`, your `mongodb+srv://` URI triggers a DNS SRV lookup that Node's c-ares resolver refuses on some Windows setups even when TCP connectivity is fine. Replace the URI with the standard format using direct shard hostnames:
> ```
> mongodb://USER:PASS@ac-XXXXX-shard-00-00.CLUSTER.mongodb.net:27017,ac-XXXXX-shard-00-01.CLUSTER.mongodb.net:27017,ac-XXXXX-shard-00-02.CLUSTER.mongodb.net:27017/elago?ssl=true&replicaSet=atlas-XXXXX-shard-0&authSource=admin&retryWrites=true&w=majority
> ```
> Get exact shard hostnames from Atlas → Connect → Shell, or run `Resolve-DnsName -Name "_mongodb._tcp.YOUR-CLUSTER.mongodb.net" -Type SRV` in PowerShell.
