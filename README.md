# Trivyo — frontend

Interface for live MCQ rooms, built on [trivyo-online/backend](https://github.com/trivyo-online/backend).

The look is monochrome retro: a near-black background, warm off-white type and a particle field that changes shape for each section (ring, loops, wave, grid, orbit). It also uses a high-contrast serif for display text, monospace labels, dashed chips and a film-grain overlay.

## Run

```bash
npm install
cp .env.example .env   # point VITE_API_URL at the Go server (default http://localhost:8080)
npm run dev
```

`npm run build` type-checks and builds to `dist/`.

## Sections

| Step | Route         | What it does |
|------|---------------|--------------|
| A    | `#/intro`     | Landing page. The particle field changes shape as you scroll |
| B    | `#/join`      | Enter the room code, host ID and your name, then go to `#/play` |
| —    | `#/play`      | Player screen. Opens `GET /api/connect` (WebSocket), shows questions as they arrive and sends answers |
| C    | `#/host`      | Host console. **01** `POST /api/create-event` · **02** `POST /api/add-question` · **03** go live over `GET /api/host` (WebSocket) |
| D    | `#/practice`  | Offline timed practice set (8 questions, 20 s each, 50 pts per correct answer) |
| E    | `#/about`     | How the system fits together |

Keyboard: in any question, press `1`–`4` or `A`–`D` to answer.
The wave button in the bottom-right corner pauses the background motion. The app also respects `prefers-reduced-motion`.

## Socket protocol used

- **Player → server**, answer: `{ "roomid", "userid", "questionno", "ans" }`. `ans` is the option *text*, which `HReadPump` compares to the correct option.
- **Host → server**, question: `{ "type": "question", "roomid", "questionno", "question": { Question, Options, Correctoption, Eachquestiontime } }`
- The player screen shows any relayed frame that contains `Question` + `Options`, whether at the top level or under `question`.
- When the host console receives an answer frame, it sends that frame back on the host socket, because that is the channel the backend grades.

## Backend gaps to close

The UI is ready for the following, but the current backend does not support it yet:

1. `POST /api/create-event` returns the Mongo `id`, not the generated 8-character `RoomId`, so for now the host has to type the room code in.
2. Frames the host sends are graded but never broadcast to players, so **Push a question** has no effect until `HReadPump` forwards `type: "question"` frames to `room.Broadcast`.
3. `HostConnection` / `ConnecttoRoom` query Mongo with `"RoomId"` / `"HostID"`, but the event is stored with the bson key `roomid`, so lookups can miss.
4. `HReadPump` reads the quiz from `event:<userid>` rather than `event:<roomid>`.
