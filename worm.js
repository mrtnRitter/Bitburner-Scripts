/** @param {NS} ns */
export async function main(ns) {

	function no_log() {
		ns.disableLog("ALL");
	}

	function deep_scan(root, arr) {
		if (arr.includes(root)) {
			return;
		} else {
			arr.push(root);
		}

		let bots = ns.scan(root);
		for (var i in bots) {
			deep_scan(bots[i], arr);
		}
	}

	function root_deploy(bot) {
		let payloads = ["weaken", "grow", "hack"];
		let openports = 0;

		ns.tprint("Found bot with NO ROOT access: " + bot);
		ns.tprint("Open ports ...");

		if (ns.fileExists("relaysmtp.exe")) {
			ns.relaysmtp(bot);
			openports += 1;
		}

		if (ns.fileExists("ftpcrack.exe")) {
			ns.ftpcrack(bot);
			openports += 1;
		}

		if (ns.fileExists("brutessh.exe")) {
			ns.brutessh(bot);
			openports += 1;
		}

		if (ns.fileExists("httpworm.exe")) {
			ns.httpworm(bot);
			openports += 1;
		}

		if (ns.fileExists("sqlinject.exe")) {
			ns.sqlinject(bot);
			openports += 1;
		}

		if (ns.getServerNumPortsRequired(bot) <= openports) {
			ns.tprint("Nuke ...");
			ns.nuke(bot);
		}

		if (ns.hasRootAccess(bot)) {
			ns.tprint("Root access GRANTED!");
			for (var i in payloads) {
				let payload = payloads[i] + ".js";
				ns.scp(payload, bot);
			}
		} else {
			ns.tprint("Root failed :( ");
		}
	}

	// ----------------------------------------------------------------------------------------------------

	ns.ui.clearTerminal();

	no_log();

	ns.tprint("Worming around ...");

	let net = [];
	let host = ns.getHostname();
	deep_scan(host, net);

	for (var i in net) {
		let bot = net[i];
		if (!ns.hasRootAccess(bot)) {
			root_deploy(bot);
		}

	}
}