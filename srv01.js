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

	function get_secLvl(bot) {
		let seclvl = ns.getServerSecurityLevel(bot) - ns.getServerMinSecurityLevel(bot);
		return seclvl;
	}

	// ----------------------------------------------------------------------------------------------------
	
	no_log();
	ns.ui.clearTerminal();

	let bots_ignore = ns.getPurchasedServers();
	bots_ignore.push("home");

	ns.tprint("Scan network ...");
	let net = [];
	let host = ns.getHostname();
	deep_scan(host, net);

	ns.tprint("Collect rooted bots ...");
	let bots_rooted = [];
	for (var i in net) {
		let bot = net[i];
		if ((ns.hasRootAccess(bot)) && (!bots_ignore.includes(bot))) {
			bots_rooted.push(bot);
		}
	}

	ns.tprint("Weaken all high sec bots in collection ...");
	let weaken_const = 0.05;
	let maxThreads = Math.ceil(ns.getServerMaxRam("srv-01") / ns.getScriptRam("weaken.js"));

	for (var i in bots_rooted) {
		let bot = bots_rooted[i];
		let seclvl = get_secLvl(bot);
		
		if (seclvl > 0) {
			let threads_needed = Math.ceil(seclvl / weaken_const);
			let attacktime = ns.tFormat(ns.getWeakenTime(bot));
			maxThreads -= threads_needed;

			if (maxThreads > 0){
				ns.tprint(bot + " weaken with " + threads_needed + " threads in " + attacktime);
				ns.exec("weaken.js", "srv-01", threads_needed, bot);
			} else {
				ns.tprint("A B O R T E D - need more RAM!");
				break;
			}
		}
	}
}