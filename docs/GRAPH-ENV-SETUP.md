# Graph & Azure Functions – Env Keys Setup

To get the **graph** (and agentic RAG, scenario modeling, impact queries) working, the app and scripts need the right environment variables. This doc explains **what** you need and **how to get each key**.

---

## 1. Frontend / local dev (project root `.env`)

These are used by the Vite app when you run `npm run dev`. They must start with `VITE_` to be exposed to the browser.

| Variable | Purpose | How to get it |
|----------|---------|----------------|
| **VITE_AZURE_GRAPH_QUERY_URL** | URL of the graph-query Azure Function | Usually `https://<your-function-app>.azurewebsites.net/api/graph-query`. You may already have this. |
| **VITE_AZURE_FUNCTION_KEY** | Key sent as `x-functions-key` when calling graph-query (and other Azure Functions) | **See “How to get the function key” below.** |

Other Vite URLs (optional but needed for full intelligence):

- `VITE_AZURE_AGENTIC_PLANNER_URL` → `.../api/agentic-planner`
- `VITE_AZURE_INTERSECTION_REASONING_URL` → `.../api/intersection-reasoning`
- `VITE_AZURE_ENTITY_EXTRACTION_URL` → `.../api/entity-extraction`

Same **key** is used for all of them: **VITE_AZURE_FUNCTION_KEY**.

---

## 2. How to get the function key (env key for the graph)

This is the key the frontend sends so Azure allows the request. You can get it in two ways.

### Option A: Azure CLI (recommended)

1. Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) and log in:
   ```bash
   az login
   ```
2. From the project root, run the helper script (it uses your Function App name and resource group):
   ```powershell
   .\infrastructure\scripts\get-function-key.ps1
   ```
3. The script prints the key and can update your **project root** `.env` with:
   - `VITE_AZURE_FUNCTION_KEY=<key>`
   If it only added `VITE_AZURE_FUNCTIONS_KEY`, copy that value into `VITE_AZURE_FUNCTION_KEY` in `.env`.

### Option B: Azure Portal

1. Go to [Azure Portal](https://portal.azure.com).
2. Open your **Function App** (e.g. `careercraft-functions-dev`).
3. In the left menu: **App keys** (under “Functions” or “Settings”).
4. Under **Host keys**, copy the **default** key (long string).
5. In your **project root** `.env` add:
   ```env
   VITE_AZURE_FUNCTION_KEY=<paste-the-key-here>
   ```
6. Restart the dev server (`npm run dev`) so Vite picks up the new variable.

---

## 3. Backend (Azure Function App settings)

The **graph-query** and **entity-extraction** functions run in Azure and need these in the Function App’s **Application settings** (not in your local `.env`):

| Variable | Purpose |
|----------|---------|
| **COSMOS_GREMLIN_ENDPOINT** | Cosmos DB Gremlin endpoint, e.g. `wss://<account>.gremlin.cosmos.azure.com:443/` |
| **COSMOS_DATABASE** | Database name, e.g. `graphdb` |
| **COSMOS_GRAPH** | Graph container name, e.g. `career-graph` |
| **COSMOS_PRIMARY_KEY** | Cosmos DB primary key (from Cosmos account → Keys) |
| **ADMIN_KEY** | (Optional) Secret you choose; required only for the **clear graph** action. Set the same value in Azure Function App **Configuration > Application settings** and in your local **.env** (project root or `infrastructure/.env`) when running `check-graph-status.ps1 -ClearGraph`. |

**Where to get Cosmos keys:** Azure Portal → your Cosmos DB account → **Keys** → copy **Primary Key**.

---

## 4. Scripts (graph status, populate graph)

Scripts under `infrastructure/scripts/` (e.g. `check-graph-status.ps1`, `populate-graph.ps1`) load env from a **`.env`** file. They look for it in the **infrastructure** folder (or project root, depending on script).

So either:

- Put the same variables in **`infrastructure/.env`**, or  
- Run the scripts after loading your **project root** `.env` (e.g. `dotenv` or manually exporting).

Scripts need:

- **VITE_AZURE_FUNCTION_KEY** – for calling graph-query and entity-extraction.
- **VITE_AZURE_FUNCTIONS_URL** or **VITE_AZURE_ENTITY_EXTRACTION_URL** – for entity extraction URL.
- **COSMOS_*** and **ADMIN_KEY** – only for check/clear graph (and only **ADMIN_KEY** for clear).

---

## 5. Quick checklist to get the graph up

1. **Get the function key** (Option A or B above) and set in **project root** `.env`:
   ```env
   VITE_AZURE_FUNCTION_KEY=<your-master-or-function-key>
   ```
2. Ensure **VITE_AZURE_GRAPH_QUERY_URL** is set in the same `.env` (e.g. `https://careercraft-functions-dev.azurewebsites.net/api/graph-query`).
3. Restart dev server: `npm run dev`.
4. Open Intelligence → the graph and impact features will use the key to call the graph-query function.

For **populate-graph** and **check-graph-status**, ensure the same key (and URLs/Cosmos vars if used) are in the env loaded by those scripts (e.g. `infrastructure/.env` or project root `.env` — the script now loads both).

### Clearing the graph

To run `check-graph-status.ps1 -ClearGraph` you must set **ADMIN_KEY**:

1. Choose a secret string (e.g. a long random password).
2. In **Azure Portal** → your Function App → **Configuration** → **Application settings** → add **ADMIN_KEY** = that secret.
3. In your **project root `.env`** (or `infrastructure/.env`) add: **ADMIN_KEY** = the same secret.
4. Run: `.\infrastructure\scripts\check-graph-status.ps1 -ClearGraph` and type `YES` when prompted.

---

## 6. Security

- **Never commit** `.env` or any file containing these keys.
- **VITE_*** variables are bundled into the frontend; anyone can see them in the browser. So use **function key** auth only to restrict anonymous abuse, not as a sole secret. For production, use proper auth (e.g. Azure AD, API management).
- Prefer **Azure Function App** settings (or Key Vault) for backend secrets (Cosmos, ADMIN_KEY), not repo or frontend.
