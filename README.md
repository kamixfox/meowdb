# 📦 MeowDB

> The server for an account-based storage extension for TurboWarp

## 🌟 Highlights

- **SQLite:** No additional server is required to run MeowDB's database.
- **Lightweight:** A single Node.js process backed by a single database file. Nothing else to install.
- **Secure:** Passwords are hashed with bcrypt and sessions use signed JWT tokens, not plain text.
- **Zero-config:** Just set a secret and run it, either locally or in a container.

## ℹ️ Overview

MeowDB is an account-based storage server, meant for use in TurboWarp extensions. Store key-value data (like LocalStorage) on an account. Create accounts and new tokens.

### ✍️ Authors

- **Main Developer:** [@kx1xit](https://github.com/kx1xit)

## 🚀 Usage

Either run with `npm`:

```bash
npm start
```

or with Docker:

```bash
docker build -t meowdb .
docker run -d --name meowdb \
  -e JWT_SECRET=CHANGE-ME-NOW-PLS \
  -v meowdb-data:/usr/src/app \
  -p 4090:4090 meowdb
```

## ⬇️ Installation

You'll need [Node.js](https://nodejs.org) **22+** (24 recommended) and npm. MeowDB bundles its own SQLite, so no database server is required.

1. If there's no prebuilt binary for your platform, `better-sqlite3` compiles from source and needs a few build tools:
   - **Debian/Ubuntu:**
     ```bash
     sudo apt install build-essential python3
     ```
   - **Fedora:**
     ```bash
     sudo dnf install gcc-c++ make python3
     ```
   - **macOS:**
     ```bash
     xcode-select --install
     ```
   - **Windows:** Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) (with "Desktop development with C++") and Python 3.

2. Now install with `npm`:

```bash
npm ci
```

3. Set a secret and start the server:

```bash
export JWT_SECRET=CHANGE-ME-NOW-PLS   # set -x JWT_SECRET=... on Windows
npm start
```

The server listens on port `4090`. Set `DB_FILE` to change where the database file is created.

## 💭 Feedback and Contributing

Discussions are turned off here, just open an issue if you have a question, or if you find a bug/a new feature to add.

If you want to contribute to this project, feel free! People like you make smaller projects like this thrive.
