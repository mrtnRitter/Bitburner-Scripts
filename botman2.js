/** @param {NS} ns */
export async function main(ns) {

	function no_log() {
		ns.disableLog("ALL");
	}

	function get_mySrv() {
		let mySrv = ns.getPurchasedServers();
		mySrv.push("home");
		return mySrv;
	}

	function get_network() {
		ns.tprint("Scanning network ...");
		let node = ns.getHostname();
		let net = [];
		rec_scan(node, net);
		ns.tprint(net.length + " bots found!");
		return net;
	}

	function rec_scan(node, net) {
		if (net.includes(node)) {
			return;
		} else {
			net.push(node);
		}
		let subnet = ns.scan(node);
		for (var i in subnet) {
			rec_scan(subnet[i], net);
		}
	}

	function treat_node(node) {
		let result = [];
		let status = "";
		let msg = "";
		let thread = 0;
		let countdown = 0;


		if (mySrv.includes(node)) {
			status = "INFO";
			msg = "own server";
			thread = 0;
			countdown = -1;

		} else if (!ns.hasRootAccess(node)) {
			result = root_(node);
			status = result[0];
			msg = result[1];
			thread = result[2]
			countdown = result[3];

		} else if (is_hackable(node)) {

			if (get_secLvl(node) > 0) {
				result = weaken_(node);
				status = result[0];
				msg = result[1];
				thread = result[2]
				countdown = result[3];

			} else if (is_growable(node) && get_growPercent(node) < 100) {
				result = grow_(node);
				status = result[0];
				msg = result[1];
				thread = result[2]
				countdown = result[3];

			} else if (ns.getServerMoneyAvailable(node) > 0) {
				result = hack_(node);
				status = result[0];
				msg = result[1];
				thread = result[2]
				countdown = result[3];

			} else {
				status = "INFO";
				msg = "no more money";
				thread = 0;
				countdown = -1;
			}

		} else {
			status = "INFO";
			msg = "need hack lvl " + ns.getServerRequiredHackingLevel(node);
			thread = 0;
			countdown = 1 * 60 * 60;
		}

		return [node, status, msg, thread, countdown];
	}

	function get_secLvl(node) {
		let seclvl = ns.getServerSecurityLevel(node) - ns.getServerMinSecurityLevel(node);
		return seclvl;
	}

	function get_growPercent(node) {
		let curMon = ns.getServerMoneyAvailable(node);
		let maxMon = ns.getServerMaxMoney(node);
		let percent = (curMon * 100) / maxMon;
		return percent;
	}

	function is_hackable(node) {
		if (ns.getHackingLevel() - ns.getServerRequiredHackingLevel(node) > -1) {
			return true;
		}
		return false;
	}

	function is_growable(node) {
		if (ns.getServerMaxMoney(node) > 0) {
			return true;
		}
		return false;
	}

	function root_(node) {
		let tools = [["relaysmtp", ns.relaysmtp], ["ftpcrack", ns.ftpcrack], ["brutessh", ns.brutessh], ["httpworm", ns.httpworm], ["sqlinject", ns.sqlinject]];
		let openports = 0;

		for (var i in tools) {
			let file = tools[i][0] + ".exe";
			let fn = tools[i][1];

			if (ns.fileExists(file)) {
				fn(node);
				openports += 1;
			}
		}

		if (ns.getServerNumPortsRequired(node) <= openports) {
			ns.nuke(node);
			return ["ROOT", "SUCCESS", 0, 5];
		} else {
			let ports_needed = ns.getServerNumPortsRequired(node) - openports;
			let grammar = " ports";
			if (ports_needed == 1) {
				grammar = " port ";
			}
			return ["INFO", ports_needed + grammar + " left", 0, -1]
		}
	}

	function weaken_(node) {
		let seclvl = get_secLvl(node);
		let threads_needed = Math.ceil(seclvl / 0.05);
		let countdown = Math.ceil(ns.getWeakenTime(node) / 1000);
		let check = check_res("weaken.js", threads_needed);
		ns.exec("weaken.js", attacker, check[1], node);
		return ["WEAKEN", check[0], check[1], countdown];
	}

	function grow_(node) {
		let growth = ns.getServerMaxMoney(node) / (ns.getServerMoneyAvailable(node) + 1);
		let threads_needed = Math.ceil(ns.growthAnalyze(node, growth));
		let countdown = Math.ceil(ns.getGrowTime(node) / 1000);
		let check = check_res("grow.js", threads_needed);
		ns.exec("grow.js", attacker, check[1], node);
		return ["GROW", check[0], check[1], countdown];
	}

	function hack_(node) {
		let threads_needed = Math.floor(0.5 / ns.hackAnalyze(node));
		let countdown = Math.ceil(ns.getHackTime(node) / 1000);
		let check = check_res("hack.js", threads_needed);
		ns.exec("hack.js", attacker, check[1], node);
		return ["HACK", check[0], check[1], countdown];
	}

	function check_res(script, threads_needed) {
		let ram_free = ns.getServerMaxRam(attacker) - ns.getServerUsedRam(attacker);
		let ram_needed = ns.getScriptRam(script) * threads_needed;
		let threads_checked = threads_needed;

		if (ram_needed <= 0) {
			threads_checked = 1;
			return ["ERROR: 0 threads ", threads_checked];
		}

		if (ram_needed > ram_free) {
			for (var i = 0; ram_needed > ram_free; i++) {
				threads_checked = Math.ceil(threads_needed / 4);
				ram_needed = ns.getScriptRam(script) * threads_checked;
			}
			return ["WARN lowered " + i + "x ", threads_checked];
		}
		return ["", threads_checked];
	}

	// ----------------------------------------------------------------------------------------------------

	no_log();

	let attacker = "srv-01";
	ns.killall(attacker);
	let attack_scripts = ["weaken.js", "grow.js", "hack.js"];
	for (var i in attack_scripts) {
		if (!ns.fileExists(attack_scripts[i], attacker)) {
			ns.scp(attack_scripts[i], attacker)
		}
	}

	let mySrv = get_mySrv();
	let net = get_network();
	let nodes = [];

	for (var i in net) {
		let node = net[i];
		nodes.push(treat_node(node));
	}

	let tick = 1;
	let s = " | ";

	while (true) {
		await ns.sleep(tick * 1000);
		ns.clearLog();
		for (var i in nodes) {
			let node = nodes[i][0];
			let status = nodes[i][1];
			let msg = nodes[i][2];
			let thread = "Threads: " + String(nodes[i][3]);
			let countdown = nodes[i][4];

			if (status != "INFO"){
				msg += "Sec: " + get_secLvl(node).toFixed(2) + " Fill: " + get_growPercent(node).toFixed(0);
			}

			if (countdown > 0) {
				countdown = nodes[i][4] -= tick;
			} 
			
			if (countdown == 0) {
				nodes.splice(i, 1, treat_node(node));
			}

			while (node.length < 18) {
				node += " ";
			}
			while (status.length < 6) {
				status += " ";
			}
			while (msg.length < 20) {
				msg += " ";
			}
			while (thread.length < 15) {
				thread += " ";
			}
			while (countdown.length < 20) {
				countdown += " ";
			}
			ns.print(node + s + status + s + msg + s + thread + s + ns.tFormat(countdown * 1000));
		}
	}
}