setup:
    @echo "  Installing Python dependencies (uv sync)..."
    cd helpers/python && uv sync
    @echo "  Configuring git hooks..."
    git config core.hookspath .githooks
    chmod +x .githooks/pre-commit .githooks/pre-push
    @echo "  Setup complete — run 'just ci' to validate"
