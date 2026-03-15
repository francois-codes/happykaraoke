# Prerequisites for Tauri + Rust backend (HappiKaraoke)

Install the following locally so you can build and run the app with the Tauri + full Rust backend.

---

## 1. Rust

Tauri is built with Rust. Install via **rustup**:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Restart your terminal (and in some cases your machine) after installation. Verify:

```bash
rustc --version
cargo --version
```

---

## 2. System dependencies (by OS)

### macOS (Catalina 10.15+)

- **Xcode** (full IDE)  
  - [Apple Developer](https://developer.apple.com/xcode/resources/) or Mac App Store  
  - Launch Xcode once after installing so it can finish setup.

- **Or** Xcode Command Line Tools only (enough for desktop builds):

  ```bash
  xcode-select --install
  ```

### Windows (7+)

- **Microsoft C++ Build Tools**  
  - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)  
  - During install, select **“Desktop development with C++”**.

- **WebView2**  
  - [WebView2 download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section)  
  - Install the **“Evergreen Bootstrapper”**.

- **VBSCRIPT** (only if you build MSI installers)  
  - Settings → Apps → Optional features → More Windows features  
  - Enable VBSCRIPT if you see `failed to run light.exe` when building MSI.

### Linux

Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Other distros: see [Tauri – Prerequisites](https://v2.tauri.app/start/prerequisites) (Fedora, Arch, Alpine, etc.).

---

## 3. Node.js

You already use Node for the frontend (Vite, React). Ensure a recent LTS is installed (e.g. Node 20+):

```bash
node -v   # e.g. v20.x or v24.x
npm -v
```

---

## 4. Summary checklist

| Requirement   | macOS              | Windows              | Linux                    |
|---------------|--------------------|----------------------|--------------------------|
| Rust (rustup) | ✅ Same            | ✅ Same              | ✅ Same                  |
| C++ / build   | Xcode or CLT       | MSVC Build Tools     | build-essential, etc.    |
| WebView       | (system)           | WebView2             | libwebkit2gtk-4.1-dev    |
| Node.js       | ✅ For frontend    | ✅ For frontend      | ✅ For frontend          |

---

## 5. App icons (optional)

To generate app icons for development and release builds:

```bash
npm run tauri icon path/to/your/1024x1024.png
```

This populates `src-tauri/icons/`. If you skip this, Tauri uses default icons (empty `bundle.icon` in config).

---

## 6. After installing

From the project root:

```bash
npm install
npm run dev
```

(`npm run dev` runs Tauri; it starts Vite and the Rust backend.)

- **First run:** Tauri will compile the Rust backend (can take several minutes). Later runs are much faster.
- **Dev mode:** The Vite dev server runs on port 5173; the Rust API server runs on port 8081. The Tauri window loads the Vite URL.
- **Build:** `npm run build` builds the client and then the Tauri app.

---

## References

- [Tauri v2 – Prerequisites](https://v2.tauri.app/start/prerequisites)
- [Rust – Install](https://www.rust-lang.org/tools/install)
