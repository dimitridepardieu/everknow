# Tailscale — Test on Physical Devices

> Goal: access the dev stack from your iPhone (or any device) with valid HTTPS,
> **anywhere with internet** — no LAN/WiFi requirement.

## Concept

Tailscale is a mesh VPN. Your Mac and iPhone join a private "tailnet"; each
device gets a stable hostname like `dimitris-mbp.tail-XXXX.ts.net`. Tailscale
can also expose this hostname **publicly** via Funnel, with an automatic
Let's Encrypt certificate.

For dev testing, **Funnel is the simplest path**: one command, no Caddy
config changes, and the iPhone doesn't even need Tailscale installed (the
URL is just a public HTTPS endpoint).

## One-time setup

1. Install Tailscale on the Mac:
   ```bash
   brew install --cask tailscale
   ```
   Launch the app, sign in with Google/Microsoft/GitHub.

2. Enable HTTPS provisioning on the admin panel:
   - Visit https://login.tailscale.com/admin/dns
   - Enable **MagicDNS**
   - Enable **HTTPS Certificates**

3. Find your Mac's Tailscale hostname:
   ```bash
   tailscale status --self --json | jq -r '.Self.DNSName' | sed 's/\.$//'
   # → dimitris-mbp.tail-XXXX.ts.net
   ```

## Usage

### Funnel — public URL, simplest (recommended for personal testing)

```bash
make up
tailscale funnel --bg 443
```

The stack is now reachable from anywhere:

```
https://dimitris-mbp.tail-XXXX.ts.net
```

Valid Let's Encrypt cert → Service Workers, Secure cookies, install prompt
— everything works as in production.

Stop exposing:
```bash
tailscale funnel --bg 443 off
```

⚠️ Funnel URL is **public**. Anyone with the URL can access. Use only for
your own testing, never share for sensitive data.

### Private mesh — only your own devices

If you want to restrict access to devices in your own tailnet:

1. Install Tailscale on the iPhone too (App Store), sign in with the same
   account.
2. Use `tailscale serve` to proxy HTTPS via Tailscale's cert:
   ```bash
   tailscale serve --bg https / 127.0.0.1:443 +insecure
   ```
3. Access from the iPhone (with Tailscale running) at
   `https://dimitris-mbp.tail-XXXX.ts.net`.

The `+insecure` flag is needed because Caddy serves its own HTTPS with an
internal CA cert; Tailscale terminates the outer TLS layer with its valid
Let's Encrypt cert.

## Caveats

- **Funnel certs** auto-renew via Let's Encrypt — nothing to do.
- **Stop Tailscale when not testing**: `tailscale down`. Otherwise the
  tailnet stays connected (low overhead, but still).
- **Don't enable Funnel permanently** — it's meant for short testing
  sessions, not as a production endpoint.

## When to use this

- Validating mobile UX on a real iPhone/iPad (touch interactions, viewport,
  scroll behavior).
- Testing PWA features that require HTTPS on a real device (Service
  Workers, Add to Home Screen, push notifications, geolocation with
  permissions, WebAuthn).
- Sharing a quick preview with a beta tester (via Funnel) without
  deploying to staging.

For routine mobile UX iteration during dev, browser DevTools mobile
emulation on the Mac is usually faster and sufficient.
