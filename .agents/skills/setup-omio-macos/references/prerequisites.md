# macOS prerequisites

Use this checklist on a current macOS release. Commands are written for zsh. Compatibility is determined by the required commands and versions below, not by a hardcoded macOS version. Prefer current patch releases within the supported ranges instead of copying versions from another Mac.

## Xcode Command Line Tools

Check first:

```sh
xcode-select -p
git --version
```

If missing, run `xcode-select --install`. Apple displays a native dialog that the human must accept. Wait for installation to finish, then rerun both checks. Do not treat the dialog as a failed unattended setup.

## Homebrew on Apple Silicon and Intel

Use `command -v brew` first. If Homebrew exists but the current shell cannot find it, load the matching standard installation without assuming the CPU:

```sh
case "$(uname -m)" in
  arm64) eval "$(/opt/homebrew/bin/brew shellenv)" ;;
  x86_64) eval "$(/usr/local/bin/brew shellenv)" ;;
  *) echo "Unsupported macOS architecture: $(uname -m)" >&2; return 1 ;;
esac
```

Add the same `shellenv` line to `~/.zprofile` only when it is absent. On a Mac without Homebrew, use the current official installer from [brew.sh](https://brew.sh/), then apply the installer-provided shell instruction:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Homebrew installs under `/opt/homebrew` on Apple Silicon and `/usr/local` on Intel.

## Runtime versions

Install the preferred runtimes when compatible versions are absent:

```sh
brew install node@22 python@3.12 uv
brew install --cask google-chrome
```

After installing these versioned formulas, put their commands first in the current shell:

```sh
export PATH="$(brew --prefix node@22)/bin:$(brew --prefix python@3.12)/libexec/bin:$PATH"
rehash
```

Homebrew's `python@3.12/bin` contains `python3.12`; the unversioned `python3` command is in `libexec/bin`. Using only `bin` can leave Apple's unsupported Python first on `PATH`. Add the same export to `~/.zprofile`, after `brew shellenv`, only when absent so new Terminal and Finder launcher sessions use the same runtimes. Reopen Terminal and verify the versions below. Derive both prefixes on the current Mac.

- Vite 7.3.1 requires Node `^20.19.0 || >=22.12.0`; Node 22 LTS is the preferred clean setup.
- The Python backend imports `typing.Never`, so it requires Python 3.11 or newer; Python 3.12 is the preferred clean setup.
- `npm` must accompany Node. Dependencies install with `npm ci` from `package-lock.json`.
- Browser automation uses the stable Google Chrome channel. Chromium alone does not satisfy that check.

Verify with:

```sh
node --version
npm --version
python3 --version
uv --version
git --version
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

## Signed-in Codex runtime

The planner invokes the local Codex app server and uses the signed-in account. It does not read an OpenAI API key. Install the current Codex CLI through one official route:

```sh
npm install -g @openai/codex
# or
brew install --cask codex
```

Then run:

```sh
codex --version
codex login status
```

If signed out, run `codex login` and finish the interactive browser flow. The application resolves Codex in this order: executable `CODEX_BINARY`, `codex` on `PATH`, then standard Codex binaries shipped inside `/Applications/ChatGPT.app`. Use an override only for an unusual valid installation:

```sh
export CODEX_BINARY="$(command -v codex)"
```

The provider is fixed to `gpt-6.1-sol` with high reasoning effort. Do not invent a model override: the source has none. A signed-in account without access to that model can run the classic fare app but cannot pass full planner verification.

## Disk and time budget

The generated 50,000,000-row SQLite database measured about 8.27 GB (7.71 GiB) in this repository. Installed JavaScript dependencies measured about 337 MiB and `dist/` about 1.7 MiB. These are observations, not fixed guarantees.

- Require at least 10 GiB free to reuse an already valid database.
- Require at least 18 GiB free before generation so the temporary database and final database can coexist during atomic replacement.
- `npm ci` downloads and reconstructs `node_modules` unless a usable local npm cache is available.
- Database generation writes 10,000-row batches and prints progress every 2,000,000 rows. Do not promise a duration until a clean run on comparable hardware provides one; record the observed `time npm run seed` result in the completion receipt.

Use `df -Pk .` before deciding whether generation is safe. `.agents/skills/setup-omio-macos/scripts/preflight.sh --before-seed` applies the 18 GiB threshold.
