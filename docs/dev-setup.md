# Developer setup

Prerequisites: Git, Node (LTS), pnpm, uv (https://docs.astral.sh/uv/).

Steps:

    pnpm install
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    (copy the output into a file named .env in the repo root as one line: VMI_SERVICE_TOKEN=<paste here>)
    pnpm dev

`pnpm dev` starts web-ui (5173), node-api (4000) and python-ai (8001).

Checks: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm e2e.

Never commit .env, .data/ or .venv/.
