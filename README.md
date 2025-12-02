# HexaGate
A better web browser

## Name

**Name:** **HexaGate**
**Tagline:** *One browser, every network, your agents at the wheel.*

---

## 1. Design goals

HexaGate is a:

1. **Network-agnostic browser**
   Clearnet, Tor, I2P, GNUnet, dVPNs, whatever — all just “routes” to HexaGate.

2. **Agent-native browser**
   Browsing is not just “user + pages” but “user + agents + pages + tools”. Hexstrike MCP is first-class, not bolted on.

3. **Security-first browser**
   Designed from a penetration tester / DFIR / OPSEC mindset:

   * Anti-downgrade by design
   * First-class self-signed / private PKI handling
   * Strong isolation, profiles, forensic logging, easy lab mode.

4. **URL-minimising browser**
   Humans mostly use *names* and *spaces*, machines use URIs and DNS. HexaGate exposes the first, manages the second.

5. **Money-native browser**
   Crypto + DeFi + “traditional” accounts via integrated wallet layer, standard payment intents, strong consent.

---

## 2. Core concepts

Instead of “tabs and URLs”, HexaGate thinks in these primitives:

1. **Route Profiles**

   * Encapsulate *where and how* traffic goes:

     * `clearnet-strict` (TCP/QUIC via DoH/DoT, no plaintext)
     * `tor-anon` (.onion + clearnet via Tor)
     * `i2p`, `gnunet`, `lokinet`, etc.
     * `corp-vpn`, `research-lab`, `dvpn-X`
   * Each route profile defines:

     * Transport stack (TCP/UDP/QUIC, proxies, SOCKS, etc.)
     * DNS/resolution strategy (system, DoH/DoT, local override, custom)
     * TLS policy (versions, ciphers, cert policies)
     * Fingerprint/OPSEC posture (user agent, JS features, font exposure, etc.)

2. **Spaces**

   * A **Space** is a contextual container:
     “All my banking stuff”, “Threat hunting”, “Tor research”, “Dev work”, etc.
   * Each space has:

     * One or more route profiles
     * Isolation rules (cookies, storage, identity, agents, permissions)
     * Security posture (paranoid / strict / relaxed)

3. **Resource Handles**

   * Human-facing identifiers like:

     * `@kingston.intranet/portal`
     * `@personal/bank`
     * `@recon/target-foo`
   * These resolve via:

     * Local “Address Book”
     * Custom resolvers (Cloudflare-style, internal DNS, a distributed registrar)
   * Under the hood they map to URIs (`https://foo.bar`, `http://abc.onion`, `gnunet://xyz`).

4. **Agent Workspaces**

   * Each Space has one or more **Agents** connected via Hexstrike MCP:

     * `Navigator`: browsing + filling + summarising
     * `Analyst`: scraping + correlating + storing data
     * `Ops`: running workflows/tools (nmap, whois, OSINT APIs, etc.)
   * Agents:

     * Have their own permissions and tools
     * Can persist context *per space*, not “per chat session”
     * Operate through a strict “Agent Bridge” API, not arbitrary system access.

5. **Wallets**

   * Crypto + DeFi + traditional accounts abstracted as **Wallets**:

     * `wallet:personal-eth`
     * `wallet:btc-cold`
     * `wallet:bank-lloyds`
   * Browser exposes a **Payment Intent API** to sites and agents:

     * “Pay 0.05 ETH to X”
     * “Approve DEX swap of token A → token B”
     * “Initiate bank transfer of £Y”

---

## 3. High-level architecture

### 3.1 Components

* **Shell / UI Layer**

  * Written in something like Rust + Tauri / Electron / native toolkit.
  * Manages windows, spaces, route profiles, settings, logs.

* **Rendering Engine**

  * Either:

    * Use a hardened Chromium/Gecko/WebKit fork, **or**
    * Wrap a system engine via CEF/WebView with extra sandboxing.
  * Isolated at process level from the Shell and Agent subsystems.

* **Network Stack**

  * A standalone daemon or library:

    * Exposes an internal API: `open_url(route_profile_id, uri, options) -> stream`
    * Has pluggable transports (clearnet/Tor/I2P/etc.).
    * Handles DNS, TLS, ALPN, HTTP/2/3, etc.

* **Security & Policy Engine**

  * Central authority for:

    * TLS policies
    * Mixed content
    * Permission prompts (camera, mic, clipboard, FS, wallet, agents)
    * Cert pinning and TOFU
    * Network downgrade detection.

* **Agent Bridge & MCP Client**

  * Integrated MCP client for hexstrike and other MCP servers.
  * Agent Bridge exposes:

    * DOM view APIs (structured page data, not raw JS injection)
    * Form and navigation APIs
    * Limited file I/O (downloads, uploads, session storage)
    * Network APIs (via the same route profile policies).

* **Data Storage Layer**

  * Encrypted on-disk store:

    * Spaces, route profiles, agent memories, logs, address book, wallets.
  * Per-space encryption keys, with a master key unlocked at login.

* **Wallet & Payment Layer**

  * Key management (software and hardware wallets)
  * On-device secure enclave integration where available
  * Payment intent handling and signing.

---

## 4. Networking & resolution spec

### 4.1 Transport abstraction

Define a `TransportAdapter` interface:

* `connect(host, port, options) -> stream`
* `dns_resolve(name, rrtype) -> records`
* Optional: `supports(uri_scheme)` and `route_metadata()`.

Adapters:

* `ClearnetAdapter`

  * TCP/QUIC via system or custom stack
  * DoH / DoT resolvers (Cloudflare, custom, internal)
  * Enforces TLS min version, cipher suites, HSTS/H2/H3 only policies.

* `TorAdapter`

  * Connects via a Tor daemon / embedded Tor.
  * `.onion` resolution is direct; normal DNS is sent through Tor or blocked according to profile.
  * Stream isolation per tab/space.

* `I2PAdapter`, `GNUnetAdapter`, `LokinetAdapter`, `FreenetAdapter`, `ZeroNetAdapter`, etc.

  * Each adapter:

    * Implements its own name resolution.
    * Maps its network’s primitives into a “HTTP-like” stream if needed or uses its own protocol handlers.

* `dVPNAdapter`

  * General interface to dVPN clients (e.g., Sentinel, Mysterium style)
  * Exposes an endpoint as a regular outbound.

Each **Route Profile** chooses:

* Primary `TransportAdapter`
* Optional fallback / chained adapters (e.g. Clearnet over Tor, dVPN inside Tor for weirdos).

### 4.2 Resolution & “URL” simplification

User types:

* `bank` or `@bank` or `@personal/bank`

Resolution steps:

1. **Local Address Book**

   * Check user’s local mapping:

     * `@bank` -> `https://secure.hsbc.co.uk` via `clearnet-strict`
2. **Configured Naming Service**

   * Could be:

     * Internal DNS
     * A Cloudflare-style resolver with custom records
     * ENS/UD-like naming for crypto/web3
3. **Fallback to “classic” URL parsing**

   * If user actually enters `https://example.com`, treat it as canonical URI.

This gives you human-friendly handles but still supports raw URLs for power use.

---

## 5. Security & trust model

### 5.1 TLS & downgrade protection

* **Global policy**:

  * Min TLS version (e.g. 1.2) per Route Profile.
  * Disallow non-TLS for “secure” spaces.
  * Strict HSTS-style rules, but configurable:

* **Downgrade prevention**:

  * If a host is known to support TLS1.3/HTTP3, refuse 1.0/1.1/HTTP1 downgrade.
  * Cache “capabilities” per host (protocols allowed).

* **Cipher & feature policy**:

  * Per-space profile for:

    * Ciphers allowed
    * Compression disabled (CRIME/BREACH style mitigations)
    * ALPN selection (prefer H3/H2).

### 5.2 Self-signed & private PKI

Self-certs are a feature, not a crime:

* **Trust modes** for a certificate:

  * One-shot exception (session only).
  * Persistent pin for:

    * Hostname
    * IP
    * Space or Route Profile level.

* **TOFU (Trust On First Use)**:

  * For internal/self-hosted services, first visit prompts:

    * Show cert fingerprint
    * Option to pin cert or CA.
  * On mismatch:

    * Hard block with loud warning, logs entry for audit.

* **Private PKI support**:

  * Import internal CA or certificate bundles per Space.
  * Mark these as “internal-only” so they never get used for public internet.

### 5.3 Isolation & sandboxing

* **Per-Space isolation**:

  * Cookies, localStorage, IndexedDB, service workers, cache all isolated.
  * Optional ephemeral spaces with automatic wipe on close.

* **Per-Site process isolation**:

  * Each origin in its own renderer process.
  * Route Profile and Space attached to those processes.

* **Downloads & file access**:

  * Download sandbox directories per Space.
  * Optional “research mode” where file interaction is highly constrained.

### 5.4 Privacy & fingerprinting

* **Browser fingerprint buckets**:

  * `low-fingerprint` profile:

    * Unified user-agent string
    * Font and canvas anti-fingerprinting
    * Randomised or blocked high-entropy APIs.
  * `normal` profile:

    * Slightly less strict for sites that break easily.
  * `lab` profile:

    * Fully transparent and debuggable, for testing.

* **Network privacy**:

  * First-class support for Tor / I2P etc.
  * Traffic padding, optional timing jitter for high-paranoia spaces.

---

## 6. Agent system (Hexstrike MCP integration)

### 6.1 Agent types & scopes

* **Per-Space agents**:

  * Persist memory and tools just for that Space.
  * Example:

    * `ReconAgent` for OSINT + network recon
    * `ResearchAgent` for academic browsing
    * `AutofillAgent` for forms/social media.

* **Global agents**:

  * System-wide tasks:

    * Bookmarks organisation
    * History analysis
    * Threat detection across Spaces (optional; careful with privacy).

### 6.2 Agent Bridge API

Agents never poke the DOM directly; they call an API like:

* `get_page_structure()`
  Returns:

  * Main headings
  * Links
  * Forms and fields
  * Visible text segments.

* `click_element(selector_or_stable_id)`

* `fill_form(form_id, field_values)`

* `navigate_to(handle_or_uri)`

* `download_resource(uri)` with Space-controlled permissions.

* `run_tool(tool_id, params)` mapped to hexstrike MCP tools.

Permissions:

* Each agent has a capability descriptor:

  * Can/can’t navigate
  * Can/can’t click
  * Can/can’t read full content vs summaries
  * Can/can’t access wallet/payment APIs.

### 6.3 MCP integration

* HexaGate includes:

  * MCP client configured to talk to your Hexstrike server.
  * A schema for browser-specific tools:

    * `browser.read_page`
    * `browser.act_on_page`
    * `browser.search_history`
    * `browser.open_space`
  * Agents can chain into external tools:

    * OSINT, scanners, threat intel feeds, etc.

* Agent context persistence:

  * Stored in encrypted DB, scoped by Space and Agent.
  * You can “snapshot” an Agent state for forensic replay.

---

## 7. Payments & finance layer

### 7.1 Wallet module

* **Key management**:

  * Support:

    * Software wallets (encrypted keystore)
    * Hardware wallets (Ledger, Trezor, etc.)
    * OS keychains / secure enclaves where available.

* **Supported backends**:

  * Crypto:

    * EVM chains (ETH, L2s)
    * BTC (via descriptors)
    * Other chains via modular connectors.
  * Traditional:

    * OpenBanking / PSD2 connectors
    * Card payment tokenisation (via third-party APIs, but with strong sandboxing).

### 7.2 Payment Intent API

Websites and agents use a standard API:

* `requestPayment({
    fromWallet: "personal-eth",
    to: "0xabc...",
    amount: "0.01",
    asset: "ETH",
    memo: "Pay for X"
  })`

User sees:

* Clear prompt:

  * Who requested it
  * Network and asset
  * Route profile security level
* Must explicitly approve, possibly with hardware confirmation.

DeFi flows:

* `requestDeFiAction({ protocol, action, details })`

  * Swap, stake, LP, etc.
  * Browser decodes and presents human-readable summary and risk.

Logs:

* All signed transactions logged with:

  * Space
  * Route profile
  * Referring site
  * Agent (if any) that initiated.

---

## 8. UI & UX

### 8.1 Main concepts in UI

* **Space bar** (left side):

  * List of Spaces: Banking, Research, Tor Lab, Dev, etc.
  * Each has icons for:

    * Route profile(s)
    * Security level indicator
    * Agent status.

* **Top bar**:

  * Input field that accepts:

    * Resource Handles (`@recon/target-foo`)
    * Search queries
    * Raw URLs if you’re in that mood.
  * Route selector pill (e.g. “Clearnet-Strict”, “Tor-Anon”).

* **Agent panel**:

  * Collapsible drawer per tab:

    * Chat with agents
    * See actions taken
    * Approve/deny suggested actions.

* **Wallet panel**:

  * Shows balances & recent actions per wallet.
  * One-click “disconnect from current site” like modern wallet extensions, but at browser core level.

### 8.2 Special modes for security work

* **Lab Mode Space**

  * Traffic recording (PCAP/save replays).
  * Forced isolation (no cross-space cookies, DNS, or caches).
  * Easy “reproduce this flow” with an agent for automation.

* **Evidence Mode**

  * Hashes downloads
  * Recorded browsing path and timestamps
  * Exportable as a case bundle (with redactions).

---

## 9. Admin & policy features

For your cyber-security mindset and multi-user environments:

* **Policy packs**:

  * JSON / YAML configs:

    * Allowed Route Profiles
    * Cert policies
    * Network restrictions
    * Allowed Agents/tools.
  * Good for lab setups, classrooms, enterprises.

* **Audit logging**:

  * Per Space and per user:

    * Connections made (domains, IPs, route profiles)
    * Security events (downgrade blocked, bad cert, mixed-content blocked)
    * Agent actions affecting navigation or wallet operations.

* **Profiles & multi-user**:

  * Multiple user profiles (like Chrome) but with:

    * Strong OS-level separation where possible
    * Distinct master passwords / keyrings.

---

## 10. Example flows

### 10.1 Visiting a Tor and clearnet site in same UI

1. You create a **Space**: `Tor Research`.
2. Route profile: `tor-anon`:

   * Transport: `TorAdapter`
   * DNS through Tor, network fingerprint hardened.
3. You open `hidden-service` (handle) → resolves to `abc123.onion`.
4. New tab spins up renderer process bound to `tor-anon`.
5. Agent `ReconAgent` summarises the page for you, logs interesting links.

Parallel:

1. Another Space: `Banking`.
2. Route profile: `clearnet-strict`:

   * Clearnet only, no Tor, no alt-nets.
   * Private PKI disabled, strict CA list.
3. You open `@bank` → `https://secure.bank.com`.
4. Wallet API locked to specific whitelisted sites.

They never mix.

### 10.2 Using agents for “infinite context” browsing

1. In `Research` Space, you open 20 tabs on a topic.
2. `ResearchAgent`:

   * Reads all 20 via Agent Bridge
   * Stores extracted knowledge graph in the Space storage.
3. Later, you open new pages; agent cross-references older material:

   * Finds contradictions
   * Flags duplicated content
   * Suggests further sources.

Context isn’t “this chat session” but the **Space’s entire history**, subject to storage limits you control.

---

## 11. Implementation notes (for later)

When you actually build:

* Language for core: Rust (for network + security correctness) is a strong candidate.
* Render engine: start with wrapping Chromium via CEF, add your hardened network and security layers underneath, then later decide if you want a custom engine.
* Tor/I2P/GNUnet: initial implementation via existing daemons/clients (SOCKS, SAM, etc.), then consider embedded options.
* Hexstrike MCP: treat as a system service that HexaGate connects to via a local endpoint, with Spaces mapping to MCP “projects” or “tenants”.

---
