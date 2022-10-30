/** @param {NS} ns */
export async function main(ns) {
	let file = ns.args[0];
	let hosts = ns.scan();

	for (var i = 0; i < hosts.length; i++) {
		let host = hosts[i];

		if (ns.scriptRunning(file, host)) {
			ns.scriptKill(file, host);
		}

		ns.rm(file, host);
	}
}