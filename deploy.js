/** @param {NS} ns */
export async function main(ns) {
	let payloads = ["weaken", "grow", "hack"];

	for (var i in payloads) {
		let payload = payloads[i] + ".js";
		ns.scp(payload, ns.args[0]);
	}
}