---
timestamp: 'Wed Oct 22 2025 18:52:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251022_185230.a4786d27.md]]'
content_id: 2f4ca11c8ef4fadb9d69aa1ad2ef68b9449f7880576de7e4fd85dde4b6361e17
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@google/generative-ai": "npm:@google/generative-ai@^0.24.1",
        "@utils/": "./src/utils/",
        "bcryptjs": "npm:bcryptjs@^3.0.2",
        "jsonwebtoken": "npm:jsonwebtoken@^9.0.2"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```
