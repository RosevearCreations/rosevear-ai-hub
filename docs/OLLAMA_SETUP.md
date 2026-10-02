# Ollama Local Runtime Setup

## Why Ollama is needed

Rosevear AI Hub uses Ollama as the first local-model runtime. Build 006 can discover:
- whether Ollama is reachable
- the installed Ollama version
- locally installed models
- basic model generation health

The Hub talks to the local Ollama API at `http://127.0.0.1:11434` by default.

## Windows installation

Official download page:

https://ollama.com/download/windows

Ollama currently supports Windows 10 or later. The official page offers a Windows download and a PowerShell installer.

PowerShell option published by Ollama:

```powershell
irm https://ollama.com/install.ps1 | iex
```

Using the graphical installer is equally acceptable.

After installation, open PowerShell and verify:

```powershell
ollama --version
ollama list
```

An empty model list is fine for Build 006 discovery.

## Do not choose a large model yet

Model selection should be based on the machine's:
- RAM
- GPU model
- GPU VRAM
- available disk space

The Hub can detect Ollama before a model is downloaded. We will choose a suitable default model after the hardware inventory is known.

## Local API

Ollama documents the local API base as:

```text
http://localhost:11434/api
```

The Hub defaults to `http://127.0.0.1:11434` so it stays explicitly local.

Relevant Build 006 endpoints used by the Hub:
- `GET /api/version`
- `GET /api/tags`
- `POST /api/generate`

Official API documentation:

https://docs.ollama.com/api/introduction

## Running Ollama on another household computer

Do not expose Ollama directly to the public internet.

A LAN-hosted or dedicated AI machine can be supported later by changing `OLLAMA_BASE_URL`, but the remote-host firewall and Ollama listening configuration must be reviewed before enabling it.
