# Reflection — Job Application Tracker MCP

## Wins (what shipped)

- Built a working **Model Context Protocol (MCP) server** from scratch in TypeScript, with four real tools an MCP client (Claude Desktop, MCP Inspector) can call: `add_application`, `list_applications`, `update_status`, and `get_next_actions`.
- Every tool input is validated with **Zod schemas** before it touches data — required fields, character limits, and allowlisted values (status, source) so bad input gets rejected with a clear error instead of corrupting the data file.
- Did a dedicated **security pass**: restricted file access to `./data/applications.json`, capped how many records a tool can return, kept error messages short (no raw stack traces), and made sure no secrets or API keys are needed at all — the whole thing runs locally.
- Wrote real docs, not just code: a design doc, a threat model, a data plan, a test plan, and a peer review checklist — plus a demo script for presenting it.
- Got it actually connected to **Claude Desktop** end-to-end, so you can type a normal sentence like "add a job application for Google" and watch it call the tool and write to the file.
- Went beyond the core requirement and built a small **React/Vite dashboard** on top of the same data.
- Did this as a 4-person team — coordinating schemas, tool contracts, and reviews across people, not just solo code.

## Blockers (what was genuinely hard)

- Understanding how MCP actually talks to a client — the stdio transport, why the server "hangs" with no terminal output when it's actually just listening, and getting the Claude Desktop config (absolute paths, `cwd`, the right `npx`/`tsx` command) right.
- Designing the Zod schemas so they were strict enough to catch bad input (empty strings, wrong date format, invalid enum values) but not so strict they rejected valid edge cases.
- Debugging tool failures with barely any information, on purpose — the security requirement to keep error messages short meant we had to reproduce and log issues carefully during development instead of leaning on stack traces.
- Keeping four people's schemas and tool contracts consistent as the design evolved, so `add_application` and `list_applications` didn't quietly drift apart.

## Resume bullet

> Built a Model Context Protocol (MCP) server in **TypeScript** with **Zod**-validated schemas, shipping **4 working tools** (add/list/update job applications, next-action suggestions) that connect to Claude Desktop over stdio. Led/contributed to a security pass (input validation, allowlisting, output limits) and full documentation (design, threat model, test plan). Published to a **public GitHub repo** with a working demo and test suite.

_(Trim to 2–3 sentences on the resume itself — the version above is the "everything" draft to cut down from.)_

## LinkedIn draft (publishing optional)

> Just wrapped a 6-week cohort project: my team and I built an MCP (Model Context Protocol) server from scratch in TypeScript — a Job Application Tracker that plugs directly into Claude Desktop.
>
> You can just tell it "add my Google application, applied today, from LinkedIn" and it validates the input with Zod, stores it locally, and can tell you what to follow up on next.
>
> The technical part was fun, but the real learning curve was the stuff around the code: designing schemas that reject bad input without being annoying, building a threat model, and figuring out how a local server actually talks to an AI client over stdio.
>
> Proud of what we shipped — 4 working tools, a public repo, tests, and a live demo. Grateful to our mentor for the guidance along the way.
>
> #MCP #TypeScript #buildinpublic

## One improvement for the next two weeks

Swap the flat `applications.json` file for a proper local database (e.g., SQLite) so the tools scale past a few dozen records and support real querying — right now `list_applications` just reads and caps a single JSON file, which won't hold up as the tracker grows.

---

**Repo:** https://github.com/JHT127/job-tracker-mcp
