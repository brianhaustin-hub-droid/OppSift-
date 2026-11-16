# OppSift object storage setup

## Current state

Neon has two observed private buckets: inherited `assets` and
`oppsift-private-files`. Both were empty when checked. No application upload,
download, deletion, signed-URL, or authorization flow has been tested. The
`hello` Function and `assets` bucket are inherited scaffolding; do not remove
them as part of routine setup.

## Security requirements

- Keep opportunity documents and user uploads private by default.
- Do not put database, object-storage, or management credentials in the
  browser, a `VITE_*` setting, a committed file, or chat.
- Authorize every operation against the authenticated user and owning
  organization on the server/storage policy boundary. Hiding UI controls is
  not access control.
- Validate file size, content type, and permitted extensions; generate
  non-guessable object keys and avoid using user-provided paths directly.
- Do not create public buckets or public URLs for private customer documents.

## Planned object-key and metadata model

Use one private bucket, `oppsift-private-files`, with these logical prefixes:

- `avatars/`
- `organizations/`
- `workspace-documents/`
- `opportunity-attachments/`
- `generated-reports/`
- `quarantine/`

Store metadata in PostgreSQL, not large document binaries. The planned record
includes an object UUID, unique object key, original filename, MIME type,
positive file size, SHA-256 checksum, owner user UUID, optional organization
and opportunity UUIDs, visibility, processing status, and creation/update
timestamps. A metadata migration and upload/download API have not yet been
implemented.

Uploads and downloads must go through a trusted server operation that checks
the signed-in user, organization membership, ownership, file limits, and
visibility before issuing a short-lived presigned URL. Do not let the browser
sign arbitrary object keys or trust caller-supplied metadata.

## Validation before application use

On the development branch only, use a disposable account and a non-sensitive
test file to verify upload, authorized download, rejection for a second
unrelated account, and cleanup of that exact test object. Record the bucket,
policy, and test result without recording credentials or object contents.
Repeat after any policy or authorization change. No such test has been
completed yet, so the app must not claim storage is operational.

See [infrastructure architecture](./INFRASTRUCTURE_ARCHITECTURE.md) and
[backend setup](./BACKEND_SETUP.md).
