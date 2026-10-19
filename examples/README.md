# Examples

These are local demos that use the published component APIs. None of them is part of the npm packages, and none of them is production ready: there is no real authentication, and state lives in memory or in a temporary folder.

Run `pnpm build` from the repository root before any of them.

## consumer

A plain React and Vite app that imports the packages the way an outside project would. It also holds the [Relay template](consumer/src/relay/README.md), a customer dashboard with a simulated assistant.

```sh
pnpm template:dev
```

Then open http://127.0.0.1:4184/relay.html.

The voice capture demo lives here too (`src/voice-host`). Preview the built consumer on port 4178:

```sh
pnpm --filter @unseen-ui/consumer exec vite preview --host 127.0.0.1 --port 4178 --strictPort
```

It records from a microphone you pick or from a generated test tone. Nothing is uploaded or transcribed.

## file-host

A read-only file browser backed by the sample files in `file-host/workspace`.

```sh
pnpm files:demo
```

Open http://127.0.0.1:4176/ and choose Connect sample file host.

## pty-host

A terminal connected to a small fixed Node program (not a shell). It accepts `help`, `colors`, `size` and `exit`, plus Ctrl+C.

```sh
pnpm terminal:serve
```

Open http://127.0.0.1:4177/, connect, then start the process. `pnpm terminal:demo` runs the same host without a browser.

## upload-host

Resumable uploads to a local folder, with checkpoints and receipts you can look up after a dropped connection.

```sh
pnpm uploads:serve
```

Open http://127.0.0.1:4179/, connect and pick a file. `pnpm uploads:demo` runs a scripted check that disconnects mid-upload, restarts the server and resumes.
