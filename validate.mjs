// Validates tokenlist.json and restricted-jurisdictions.json.
// Zero dependencies: `node validate.mjs`.
import { readFileSync } from "node:fs";

const errors = [];
const check = (cond, msg) => cond || errors.push(msg);

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));

// --- tokenlist.json -------------------------------------------------------
const list = read("./tokenlist.json");

check(typeof list.name === "string" && list.name, "tokenlist: missing name");
check(!Number.isNaN(Date.parse(list.timestamp)), "tokenlist: timestamp is not an ISO date");
for (const part of ["major", "minor", "patch"]) {
	check(Number.isInteger(list.version?.[part]), `tokenlist: version.${part} must be an integer`);
}
check(Array.isArray(list.tokens) && list.tokens.length > 0, "tokenlist: tokens must be a non-empty array");

const knownTags = new Set(Object.keys(list.tags ?? {}));
// ponytail: format + uniqueness only. A true EIP-55 checksum test needs keccak256,
// which Node's crypto does not ship (sha3-256 != keccak256) — not worth a dependency.
const addr = /^0x[0-9a-fA-F]{40}$/;
const seen = new Map();
const byAddress = new Map();

for (const t of list.tokens ?? []) {
	const at = `tokenlist: ${t.symbol ?? t.address}`;
	check(Number.isInteger(t.chainId), `${at}: chainId must be an integer`);
	check(addr.test(t.address ?? ""), `${at}: address is not a 20-byte hex address`);
	check(typeof t.name === "string" && t.name, `${at}: missing name`);
	check(typeof t.symbol === "string" && t.symbol, `${at}: missing symbol`);
	check(Number.isInteger(t.decimals) && t.decimals >= 0 && t.decimals <= 255, `${at}: decimals out of range`);

	const key = `${t.chainId}:${String(t.address).toLowerCase()}`;
	check(!seen.has(key), `${at}: duplicate entry for ${key}`);
	seen.set(key, t);
	byAddress.set(String(t.address).toLowerCase(), t);

	for (const tag of t.tags ?? []) {
		check(knownTags.has(tag), `${at}: tag "${tag}" is not declared in the top-level tags object`);
	}
}

// Staked/base pointers must resolve inside the list, or integrators follow them into nothing.
for (const t of list.tokens ?? []) {
	for (const field of ["stakedToken", "baseToken"]) {
		const ref = t.extensions?.[field];
		if (ref === undefined) continue;
		check(
			byAddress.has(String(ref).toLowerCase()),
			`tokenlist: ${t.symbol} extensions.${field} points at ${ref}, which is not in the list`,
		);
	}
}

// --- restricted-jurisdictions.json ---------------------------------------
const geo = read("./restricted-jurisdictions.json");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const bases = new Set(Object.keys(geo.basisDefinitions ?? {}));

check(!Number.isNaN(Date.parse(geo.timestamp)), "restricted: timestamp is not an ISO date");
check(Array.isArray(geo.countries) && geo.countries.length > 0, "restricted: countries must be a non-empty array");

const codes = new Set();
for (const c of geo.countries ?? []) {
	const at = `restricted: ${c.code ?? c.name}`;
	check(/^[A-Z]{2}$/.test(c.code ?? ""), `${at}: code must be an uppercase ISO 3166-1 alpha-2 code`);
	// Intl echoes the input back when the region is unknown.
	check(regionNames.of(c.code) !== c.code, `${at}: "${c.code}" is not an assigned ISO 3166-1 region`);
	check(typeof c.name === "string" && c.name, `${at}: missing name`);
	check(bases.has(c.basis), `${at}: basis "${c.basis}" is not declared in basisDefinitions`);
	check(!codes.has(c.code), `${at}: duplicate country`);
	codes.add(c.code);
}

const regionCodes = new Set();
for (const r of geo.regions ?? []) {
	const at = `restricted: region ${r.code ?? r.name}`;
	check(/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(r.code ?? ""), `${at}: code must be an ISO 3166-2 code`);
	check(r.code?.startsWith(`${r.country}-`), `${at}: code does not sit under country "${r.country}"`);
	check(bases.has(r.basis), `${at}: basis "${r.basis}" is not declared in basisDefinitions`);
	check(!regionCodes.has(r.code), `${at}: duplicate region`);
	regionCodes.add(r.code);
}

if (errors.length > 0) {
	console.error(errors.map((e) => `  ${e}`).join("\n"));
	console.error(`\n${errors.length} problem(s) found.`);
	process.exit(1);
}
console.log(`OK: ${list.tokens.length} tokens, ${geo.countries.length} countries, ${geo.regions.length} regions.`);
