# Security policy

## Supported version

Security fixes apply to the latest commit on `main`. BoardBot includes a local browser solo playtest build, game-data imports and local save/recovery. See the [README](README.md) for current support and remaining acceptance/content-publication gates.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/joshuawyadao/BoardBot/security/advisories/new). Do not include exploit details or sensitive information in a public issue.

Include the affected commit and component, the likely impact, and minimal reproduction steps with invented data. Exclude credentials, personal saves, private prototypes, device identifiers, and private paths. If private reporting is unavailable, open a sanitized issue asking for a private contact channel without disclosing vulnerability details.

## Scope

Credential exposure, unsafe file handling, unintended data sharing, dependency compromise, and unauthorized repository changes are in scope. This includes untrusted game imports and save files, exposure of hidden game information, and unexpected network activity.

Gameplay defects without a security impact and general feature requests belong in ordinary issues. Local verification catches selected repository hygiene problems; it is not a complete secret scanner or security audit.
