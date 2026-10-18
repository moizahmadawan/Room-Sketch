# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Accounts & data (Firebase)

- **Sign up / Log in / Forgot password** use Firebase Authentication (email + password). Firebase keeps the account and the
  hashed password on Google's servers; this app never stores passwords.
- **Designs** are saved in Cloud Firestore at `users/<uid>/designs/<designId>`, so they follow the user to any device.
- `firestore.rules` makes each user able to read/write **only** their own designs.
- **Guests can design without an account** (home -> "Start designing"). Saving, exporting a PNG and printing need a login: a
  dialog offers log in / sign up, keeps the draft, and saves it automatically afterwards. My Designs and Settings also need a login.
- The editor is cleared when a signed-in user logs out or the account switches.
- Designs saved in this browser by older versions can be moved to your account from the My Designs page.
- Every page has a Home button; the RoomSketch logo also goes to `/`.

### Setup (one time)

1. [Firebase console](https://console.firebase.google.com) -> create a project.
2. Build -> **Authentication** -> Get started -> enable **Email/Password**.
3. Build -> **Firestore Database** -> Create database (production mode).
4. Firestore -> **Rules** -> paste the contents of `firestore.rules` -> Publish.
5. Project settings -> Your apps -> add a **Web app** -> copy the config into `.env` (see `.env.example`).
6. Authentication -> Settings -> **Authorized domains**: add your deployed domain (localhost is allowed by default).
7. `npm install` then `npm run dev`.

## Shortcuts

`Ctrl/Cmd+S` save · `Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` redo · `R` rotate · `Delete` remove
