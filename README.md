# Study Hub — a 3D virtual office in your browser

**Live site:** https://study-hub-3d.onrender.com (free tier: the first visit after a quiet period takes ~30–60 s to wake up)

Walk around a cozy 3D office with your friends, see each other's webcams floating above your avatars, study together with a shared Pomodoro timer, and present on a big screen.

- **Frontend:** Three.js (plain ES modules, no build step)
- **Realtime:** Node.js + Express + Socket.IO (presence, movement, chat, room state, WebRTC signaling)
- **Video/audio:** WebRTC peer-to-peer mesh (best for up to ~8 people), public Google STUN servers
- **Works in:** Chrome and Edge on laptops/desktops. Phones and tablets can watch and tap to walk.

---

## Features

| | |
|---|---|
| **Lobby** | Display name, role (Manager, Team Lead, Employee, Intern, HR, Designer, Developer, Secretary, Student, Teacher, Guest) shown on your name tag, avatar preview, create a room or join with a 5-letter code, camera/mic preview with level meter and device pickers |
| **Avatar editor** | Live rotating 3D preview (drag to spin). Skin tone, body type, height, face shape, eyes, expression, 8 hairstyles + color, top/bottom style + colors, shoes, glasses, cap, headphones, backpack, lanyard. Randomize / Reset. Saved in your browser and synced live to everyone, even mid-session |
| **Office** | Top floor of a high-rise at night: lit city towers, stars and a moon outside the windows. Study pods (8 desks), lounge with couches, meeting room with a big screen and 12 seats, café corner, plants, windows, warm lights and soft shadows. All built from simple shapes, with no model downloads |
| **Movement** | WASD / arrow keys (Shift to run), click the floor to walk there, drag to look, scroll to zoom. Third-person camera that won't clip through walls |
| **Webcams** | Rounded live video panel above each avatar, always facing you. Initials when the camera is off. Green ring while someone talks |
| **Proximity audio** | People sound louder when they're close and fade with distance, and come from their direction (left/right). Voices are muffled through the meeting-room glass. Avatars' mouths move while they talk on the mic |
| **Actions & expressions** | *Actions* button (or `E`): wave, clap, cheer, dance, nod, shake, shrug, facepalm, bow, point, raise hand, stretch, **thinking** (loading bubble), **got an idea** (light bulb), write notes, sign papers, read, type, listen, phone call, coffee, nap (Zzz), **hand item** to the person next to you. **Items** tab: hold papers, a documents folder, book, notebook, clipboard, pen, laptop, tablet, phone, mug, water bottle, sticky notes, calculator, stapler, envelope, ID card or a file box, and hand it to someone. 13 facial expressions. Click the coffee machine, bookshelf or printer to use them |
| **Questions** | *Ask a question* puts a card with options A/B/C/D above your head. Others click it (or the chat line) to vote, and counts update live |
| **Talking** | Chat messages appear as a speech bubble over the sender, their mouth moves, and their face matches the message (laughing, surprised, thinking…) |
| **Presenting** | *Present* claims the stage. Share your screen (with its sound: tick *Share tab audio*) **or** upload slide images / a PDF and click Prev/Next (or PageUp/PageDown or a presentation clicker) for everyone at once. Presenter voice can be heard by everyone at full volume. Everyone else gets **Take a seat** (teleports to a seat facing the screen) and **View screen** (full-screen 2D view of the slides or screen) |
| **Study** | Click a desk, chair or couch to sit (Space or WASD to stand). Shared Pomodoro timer at the top and on the wall board, with a chime when phases change. Status: Available / Studying / On break / Presenting / Busy / Away (switches to "Studying" automatically when you sit at a desk) |
| **Social** | Text chat with unread badge, emoji reactions 👏 😂 ❤️ 👍 🎉 🤔 (keys 1–6) that float up from your avatar, people list with "Go to" teleport |
| **Reliability** | Clean join/leave (avatars, videos and peer connections are removed), automatic ICE restart if a call drops, automatic rejoin of the same room if the server restarts, 15 Hz position updates with smooth interpolation |

### Keyboard shortcuts
`WASD`/arrows move · `Shift` run · `Space` stand up · `Enter` chat · `M` mute · `V` camera · `1–6` reactions · `E` actions · `X` stop action · `PageUp/PageDown` change slides (presenter) · `Esc` close dialogs

---

## Run it locally

Requires **Node.js 18 or newer** (https://nodejs.org).

```bash
npm install
npm start
```

Open **http://localhost:3000** in Chrome or Edge.

**Try it with yourself first:** open a second tab (or a second browser window), enter a different name, and join with the room code shown at the top-left (or paste the 🔗 Invite link). You'll see both avatars and both webcams. Use headphones, or mute one tab, to avoid echo.

> Cameras and microphones only work on **https://** pages or **localhost**. Friends on your Wi-Fi can't use `http://192.168.x.x:3000` with a camera, so deploy it (below) to use it with other people.

### Project layout

```
server.js            Express + Socket.IO server (rooms, presence, chat, presenter, slides, Pomodoro, signaling)
public/index.html    Page layout: lobby, HUD, dialogs
public/css/style.css All styling
public/js/main.js    App logic: lobby, movement, camera, networking, presenting, chat, timer
public/js/office.js  The 3D office (furniture, walls, lights, seats, colliders, big screen)
public/js/avatar.js  Avatar builder + animation (walk, sit, type)
public/js/editor.js  "Edit Avatar" dialog with the live 3D preview
public/js/labels.js  Video panels, name labels, floating emoji
public/js/rtc.js     WebRTC mesh ("perfect negotiation")
public/js/slides.js  Image/PDF → slides conversion, chime sound
render.yaml          Optional one-click Render Blueprint
```

---

## Deploy for free on Render (step by step)

Render's free web services support WebSockets and give you HTTPS automatically, which the camera needs.

### 1. Put the code on GitHub
1. Create a free account at https://github.com and click **New repository** (e.g. `study-hub`). Leave it empty (no README).
2. In this project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Study Hub 3D office"
   git branch -M main
   git remote add origin https://github.com/<your-username>/study-hub.git
   git push -u origin main
   ```
   (`node_modules` is excluded by `.gitignore`. Render installs it for you.)

### 2. Create the web service
1. Sign up at https://render.com (signing in with GitHub is easiest).
2. Click **New +** → **Web Service** → connect your GitHub account → pick the `study-hub` repository.
3. Fill in:
   - **Name:** `study-hub` (this becomes `https://study-hub.onrender.com`, or similar if taken)
   - **Language / Runtime:** Node
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. Click **Create Web Service**. The first build takes 1–3 minutes. When the log shows `Study Office 3D running on …` and the status is **Live**, open the URL at the top of the page.

*Alternative:* **New +** → **Blueprint** → pick the repo. Render reads `render.yaml` and sets everything up for you.

### 3. Updating
Every `git push` to `main` redeploys automatically. Anyone in a room during a redeploy sees "Reconnecting…" for a few seconds and then rejoins the same room code automatically.

### Things to know about the free tier
- **It sleeps after ~15 minutes with no visitors.** The next visit takes ~30–60 seconds to wake it up. **Open the site 2–3 minutes before your class presentation.**
- Rooms live in server memory. A restart clears chat and slides (people rejoin automatically, but the presenter should re-upload slides).

### Optional: TURN server for strict networks
Video and audio go directly between browsers. On most home and phone networks that works with the built-in STUN servers. Some school or company Wi-Fi blocks direct connections. Then avatars, chat, slides and the timer still work, but someone's video stays on their initials. To fix that, add a TURN server (several providers have free tiers, e.g. Metered or ExpressTURN) and set these **Environment Variables** in Render → your service → **Environment**:

| Key | Example |
|---|---|
| `TURN_URL` | `turn:global.relay.example.com:80,turns:global.relay.example.com:443?transport=tcp` |
| `TURN_USERNAME` | *(from your provider)* |
| `TURN_CREDENTIAL` | *(from your provider)* |

Other optional variables: `MAX_PLAYERS` (default `8`), `PORT` (Render sets this automatically).

---

## Presentation-day checklist

1. Open the Render URL a few minutes early so it's awake. Create the room and share the 🔗 Invite link.
2. **Upload your slides as a PDF** (Present → Upload slides). Slides travel through the server, so they work even on networks that block video. Screen sharing is great for live demos.
3. Ask everyone to click **Take a seat**. They'll face the big screen, and **View screen** gives them a sharp full-screen view.
4. Keep "Everyone hears me at full volume" ticked so the back row can hear you.
5. Use **PageUp/PageDown** or a presentation clicker to change slides.
6. Wear headphones to avoid echo.

## Troubleshooting

- **"Camera/mic blocked":** click the 🔒 icon in the address bar → allow Camera and Microphone → reload.
- **Can't hear someone:** walk closer (audio fades with distance), check they aren't muted (🔇 on their name tag), or click anywhere on the page once (browsers block audio until you interact).
- **Someone's video stays on their initials although their camera is on:** their network is blocking peer-to-peer video. See *TURN server* above.
- **"Room not found":** codes are 5 characters. Rooms are deleted 10 minutes after the last person leaves.
- **Low frame rate on an old laptop:** close other tabs and make sure hardware acceleration is on in your browser settings.
