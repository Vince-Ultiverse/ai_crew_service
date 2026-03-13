#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────
RUNNER_USER="github-runner"
RUNNER_HOME="/home/${RUNNER_USER}"
RUNNER_DIR="${RUNNER_HOME}/actions-runner"
RUNNER_VERSION="2.322.0"

# ─── Args ────────────────────────────────────────────────────────────
if [ $# -lt 2 ]; then
  echo "Usage: sudo $0 <GITHUB_REPO_URL> <RUNNER_TOKEN>"
  echo ""
  echo "  GITHUB_REPO_URL  e.g. https://github.com/yourname/ai-crew"
  echo "  RUNNER_TOKEN     from Settings → Actions → Runners → New self-hosted runner"
  exit 1
fi

REPO_URL="$1"
RUNNER_TOKEN="$2"

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: run with sudo"
  exit 1
fi

# ─── 1. Install Docker (if missing) ─────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo ">>> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

# ─── 2. Create runner user ──────────────────────────────────────────
if ! id "$RUNNER_USER" &>/dev/null; then
  echo ">>> Creating user: ${RUNNER_USER}"
  useradd -m -s /bin/bash "$RUNNER_USER"
fi

echo ">>> Adding ${RUNNER_USER} to docker group"
usermod -aG docker "$RUNNER_USER"

# ─── 3. Download & extract runner ───────────────────────────────────
echo ">>> Setting up runner in ${RUNNER_DIR}"
mkdir -p "$RUNNER_DIR"
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR"

TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
if [ ! -f "${RUNNER_DIR}/${TARBALL}" ]; then
  echo ">>> Downloading runner v${RUNNER_VERSION}..."
  su - "$RUNNER_USER" -c "
    cd ${RUNNER_DIR}
    curl -sL -o ${TARBALL} https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TARBALL}
    tar xzf ${TARBALL}
  "
fi

# ─── 4. Configure runner ────────────────────────────────────────────
echo ">>> Configuring runner..."
su - "$RUNNER_USER" -c "
  cd ${RUNNER_DIR}
  ./config.sh --unattended \
    --url '${REPO_URL}' \
    --token '${RUNNER_TOKEN}' \
    --name '$(hostname)' \
    --labels 'self-hosted,linux' \
    --replace
"

# ─── 5. Install & start as system service ────────────────────────────
echo ">>> Installing systemd service..."
cd "$RUNNER_DIR"
./svc.sh install "$RUNNER_USER"
./svc.sh start

echo ""
echo "Done! Runner is active. Verify at:"
echo "  ${REPO_URL}/settings/actions/runners"
