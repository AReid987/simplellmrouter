# OpenClaw Integration Guide

**Purpose:** Run SimpleLLMRouter alongside OpenClaw for 24/7 operation with expanded quota  
**Use Case:** Combine multiple free-tier providers to avoid rate limits and quota exhaustion

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Server                                  │
│                                                                      │
│  ┌──────────────┐     HTTP Request     ┌──────────────────────┐     │
│  │              │ ───────────────────▶ │                      │     │
│  │   OpenClaw   │                      │  SimpleLLMRouter     │     │
│  │   (Port:     │ ◀─────────────────── │  (Port: 8402)        │     │
│  │    8080)     │     LLM Response     │                      │     │
│  │              │                      │  ┌───────────────┐   │     │
│  └──────────────┘                      │  │  Mistral      │   │     │
│                                        │  │  Groq         │   │     │
│                                        │  │  Gemini       │   │     │
│                                        │  │  (9 providers)│   │     │
│                                        │  └───────────────┘   │     │
│                                        └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

**How it works:**
1. OpenClaw sends requests to SimpleLLMRouter (localhost:8402)
2. SimpleLLMRouter classifies requests and selects best provider
3. If provider fails or rate-limited, automatic fallback occurs
4. Response returned to OpenClaw transparently

---

## Installation on OpenClaw Server

### Option 1: Direct Clone & Install (Recommended for Development)

```bash
# SSH into your OpenClaw server
ssh your-server

# Clone the repository
git clone https://github.com/AReid987/simplellmrouter.git
cd simplellmrouter

# Install dependencies
npm install

# Build the project
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your API keys
nano .env

# Start the router
npm start
# or for background operation
npm start &
```

### Option 2: Global NPM Install (Recommended for Production)

For easier installation without cloning:

```bash
# Install globally from GitHub
npm install -g github:AReid987/simplellmrouter

# This adds 'simplellmrouter' command to PATH
simplellmrouter --version

# Create config directory
mkdir -p ~/.config/simplellmrouter
cd ~/.config/simplellmrouter

# Copy example config
cp $(npm root -g)/simplellmrouter/config/providers.yaml .
cp $(npm root -g)/simplellmrouter/.env.example .env

# Configure
nano .env

# Run
simplellmrouter
```

### Option 3: Docker (Future - Not Yet Available)

```bash
# When Docker support is added:
docker run -d \
  -p 8402:8402 \
  -e PROVIDER_MISTRAL_API_KEY=your-key \
  -e PROVIDER_GROQ_API_KEY=your-key \
  -v $(pwd)/config:/app/config \
  areid987/simplellmrouter:latest
```

---

## Configuration

### 1. Environment Variables

Create `.env` file in the simplellmrouter directory:

```bash
# Required: At least one provider API key
PROVIDER_MISTRAL_API_KEY=your-mistral-key-here
PROVIDER_GROQ_API_KEY=your-groq-key-here
PROVIDER_GEMINI_API_KEY=your-google-key-here
# ... add more as needed

# Optional: Server configuration
PORT=8402
HOST=127.0.0.1
LOG_LEVEL=info
```

**Getting API Keys:**
- [Mistral](https://console.mistral.ai/) - 1B requests/month (essentially unlimited)
- [Groq](https://console.groq.com/) - 14,400 requests/day
- [Google AI Studio](https://aistudio.google.com/) - 1,500 requests/day
- [Cerebras](https://cloud.cerebras.ai/) - ~2,000 requests/day
- [OpenRouter](https://openrouter.ai/) - ~1,000 requests/day
- [VoidAI](https://voidai.com/) - ~500 requests/day

### 2. Provider Configuration

Edit `config/providers.yaml` to customize:

```yaml
server:
  port: 8402
  host: 127.0.0.1

logging:
  level: info
  format: pretty

providers:
  mistral:
    id: mistral
    name: Mistral AI
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large
        # ...
```

### 3. Create Systemd Service (For 24/7 Operation)

Create a systemd service to run SimpleLLMRouter automatically:

```bash
# Create service file
sudo nano /etc/systemd/system/simplellmrouter.service
```

```ini
[Unit]
Description=SimpleLLMRouter - LLM Load Balancer
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/simplellmrouter
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable simplellmrouter
sudo systemctl start simplellmrouter

# Check status
sudo systemctl status simplellmrouter

# View logs
sudo journalctl -u simplellmrouter -f
```

---

## OpenClaw Configuration

### Method 1: OpenClaw Config Command

```bash
# Set SimpleLLMRouter as primary model
openclaw config set agents.defaults.model.primary "http://localhost:8402/v1"

# Set dummy API key (SimpleLLMRouter handles real authentication)
openclaw config set agents.defaults.model.apiKey "not-used"

# Verify
openclaw config get agents.defaults.model
```

### Method 2: Direct Config File Edit

Edit `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "http://localhost:8402/v1",
        "apiKey": "not-used"
      }
    }
  }
}
```

### Method 3: Environment Variable

```bash
export OPENCLAW_MODEL_PRIMARY="http://localhost:8402/v1"
export OPENCLAW_MODEL_API_KEY="not-used"
```

---

## Testing the Integration

### 1. Verify SimpleLLMRouter is Running

```bash
# Health check
curl http://localhost:8402/health

# Expected response:
{
  "status": "healthy",
  "providers": 9,
  "models": 15,
  "uptime": 3600
}
```

### 2. Test Through SimpleLLMRouter Directly

```bash
curl -X POST http://localhost:8402/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, test message"}
    ]
  }'
```

### 3. Test Through OpenClaw

```bash
# OpenClaw should now route through SimpleLLMRouter
openclaw chat "What's the weather like?"

# Check SimpleLLMRouter logs to see the request
```

---

## Monitoring

### View Router Logs

```bash
# If running directly
npm start 2>&1 | tee router.log

# If running as systemd service
sudo journalctl -u simplellmrouter -f

# View quota usage
curl http://localhost:8402/quota
```

### Monitor Quota Usage

```bash
# Check quota status
curl -s http://localhost:8402/quota | jq

# Watch quota in real-time
watch -n 5 'curl -s http://localhost:8402/quota'
```

---

## Troubleshooting

### Issue: OpenClaw can't connect to SimpleLLMRouter

**Symptoms:** OpenClaw errors about connection refused

**Solutions:**
1. Check if SimpleLLMRouter is running:
   ```bash
   curl http://localhost:8402/health
   ```

2. Check firewall rules:
   ```bash
   # SimpleLLMRouter binds to 127.0.0.1 by default (localhost only)
   # If OpenClaw is in Docker, you may need to bind to 0.0.0.0
   # Edit config/providers.yaml:
   # server:
   #   host: 0.0.0.0  # Allow external connections
   ```

3. Check port availability:
   ```bash
   lsof -i :8402
   ```

### Issue: No providers available

**Symptoms:** "No providers configured" error

**Solutions:**
1. Check environment variables:
   ```bash
   cat .env | grep API_KEY
   ```

2. Verify at least one provider has API key set
3. Check SimpleLLMRouter logs for validation errors

### Issue: All requests failing

**Symptoms:** Every request returns error

**Solutions:**
1. Check provider API keys are valid:
   ```bash
   # Test Mistral directly
   curl https://api.mistral.ai/v1/models \
     -H "Authorization: Bearer $PROVIDER_MISTRAL_API_KEY"
   ```

2. Check rate limits:
   ```bash
   curl http://localhost:8402/rate-limits
   ```

3. Review SimpleLLMRouter logs for specific errors

### Issue: OpenClaw using wrong model endpoint

**Symptoms:** OpenClaw bypassing SimpleLLMRouter

**Solutions:**
1. Verify OpenClaw config:
   ```bash
   openclaw config get agents.defaults.model.primary
   # Should output: http://localhost:8402/v1
   ```

2. Check for agent-specific overrides:
   ```bash
   openclaw config get agents.<agent-name>.model.primary
   ```

---

## Performance Optimization

### For 24/7 Operation

1. **Use Process Manager**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start with PM2
   pm2 start dist/cli.js --name simplellmrouter
   
   # Auto-start on boot
   pm2 startup
   pm2 save
   ```

2. **Enable Log Rotation**
   ```bash
   # SimpleLLMRouter uses pino for logging
   # Add to your logrotate config
   /var/log/simplellmrouter/*.log {
     daily
     rotate 7
     compress
     delaycompress
     missingok
     notifempty
   }
   ```

3. **Monitor with TUI Dashboard** (when available)
   ```bash
   # From the project root
   cd dashboard
   pip install -e .
   simplellmrouter-dashboard
   ```

---

## Security Considerations

### API Key Storage

- Store API keys in `.env` file (not in git)
- Set restrictive permissions:
  ```bash
  chmod 600 .env
  ```
- Use environment-specific configs for production

### Network Security

- By default, SimpleLLMRouter binds to `127.0.0.1` (localhost only)
- Only expose to external network if necessary
- If exposing externally, use reverse proxy with authentication:
  ```nginx
  # Example nginx config
  server {
    listen 80;
    server_name router.yourdomain.com;
    
    location / {
      auth_basic "Restricted";
      auth_basic_user_file /etc/nginx/.htpasswd;
      proxy_pass http://localhost:8402;
    }
  }
  ```

---

## Updating SimpleLLMRouter

### Update to Latest Version

```bash
cd simplellmrouter

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart service
sudo systemctl restart simplellmrouter
```

### Backup Before Update

```bash
# Backup config
cp -r config config.backup.$(date +%Y%m%d)
cp .env .env.backup.$(date +%Y%m%d)

# Update
git pull
npm install
npm run build
```

---

## Summary

### What You Need

1. **SimpleLLMRouter installed** on same machine as OpenClaw (or network-accessible)
2. **API keys** for at least one provider (Mistral recommended - huge quota)
3. **OpenClaw configured** to use `http://localhost:8402/v1` as primary model
4. **Process manager** (systemd/PM2) for 24/7 operation

### Quick Start Checklist

- [ ] Clone repo: `git clone https://github.com/AReid987/simplellmrouter.git`
- [ ] Install: `cd simplellmrouter && npm install && npm run build`
- [ ] Configure: `cp .env.example .env && nano .env` (add API keys)
- [ ] Start: `npm start` (or use systemd/PM2)
- [ ] Configure OpenClaw: `openclaw config set agents.defaults.model.primary "http://localhost:8402/v1"`
- [ ] Test: `openclaw chat "Hello"`
- [ ] Monitor: `curl http://localhost:8402/quota`

---

**Questions?** Open an issue on GitHub: https://github.com/AReid987/simplellmrouter/issues
