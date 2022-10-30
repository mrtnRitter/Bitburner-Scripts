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

	function get_growPercent(bot) {
		let curMon = ns.getServerMoneyAvailable(bot);
		let maxMon = ns.getServerMaxMoney(bot);
		let percent = (curMon * 100) / maxMon;
		return percent.toFixed(3);
	}

	function get_dist(item, arr) {
		let dist = 0;
		for (var i = 0; i < arr.length - 1; i++) {
			dist += Math.abs(arr[i].indexOf(item) - arr[i + 1].indexOf(item));
		}
		return dist;
	}

	function search_highsecbot(bots) {
		let highsecbot = "";
		let highestseclvl = 0;
		for (var i in bots) {
			let bot = bots[i];
			let seclvl = get_secLvl(bot);

			ns.print("Sec Lvl: " + seclvl.toFixed(3) + " | Bot: " + bot + "\n");

			if (seclvl > highestseclvl) {
				highsecbot = bot;
				highestseclvl = seclvl;
			}
		}
		return highsecbot;
	}

	function bot_attack(attack, bots, target) {
		let attack_script = attack + ".js";
		for (var i in bots) {
			if (!ns.fileExists(attack_script)) {
				continue;
			} else {
				let bot = bots[i];
				let ram_free = ns.getServerMaxRam(bot);
				let ram_needed = ns.getScriptRam(attack_script);
				let threads = Math.floor(ram_free / ram_needed);

				if (threads > 0) {
					ns.killall(bot);
					ns.exec(attack_script, bot, threads, target);
				}
			}
		}
	}

	function sort_order(method, arr, fn, fn_args) {
		let val_arr = [];
		let item_arr = [];

		for (var i in arr) {
			let item = arr[i];
			let val = fn(item, fn_args);

			if (!val_arr.length) {
				val_arr.push(val);
				item_arr.push(item);
			} else {
				for (var j in val_arr) {
					if (val >= val_arr[j]) {
						val_arr.splice(j, 0, val);
						item_arr.splice(j, 0, item);
						break;
					} else if (j == val_arr.length - 1) {
						val_arr.push(val);
						item_arr.push(item);
					} else {
						continue;
					}
				}
			}
		}

		if (method == "LowToHigh") {
			val_arr.reverse();
			item_arr.reverse();
		}
		return item_arr;
	}

	async function attack_timer(bot, wave, attack_time) {
		let time_passed = 0;
		let time_left = attack_time;
		let tick = 10 * 1000;

		while (time_left > 0) {
			ns.print("Attacking " + bot + ": Wave " + wave + " finish in " + ns.tFormat(time_left));
			if (time_left < tick) {
				tick = time_left;
			}
			await ns.sleep(tick);
			time_passed += tick;
			time_left = attack_time - time_passed;
		}
	}

	async function weaken_(bots) {
		while (true) {
			ns.print("---------------------------------------")
			ns.print("Scan for high sec bot ...");
			let highsecbot = search_highsecbot(bots)

			if (highsecbot == "") {
				ns.print("All bots LOW SEC!");
				break;
			}

			ns.print("---------------------------------------")
			ns.print("Start WEAKEN attack on " + highsecbot + "\n");
			bot_attack("weaken", bots, highsecbot);
			let wave = 0;

			while (get_secLvl(highsecbot) > 0) {
				wave += 1;
				let attack_time = ns.getWeakenTime(highsecbot);
				await attack_timer(highsecbot, wave, attack_time);
			}
		}
	}

	async function grow_(bestbot, bots) {
		ns.print("---------------------------------------")
		ns.print("Start GROW attack on " + bestbot + "\n");
		bot_attack("grow", bots, bestbot);
		let wave = 0;

		while (get_growPercent(bestbot) < 100) {
			if (get_secLvl(bestbot) > 10) {
				ns.print("Stopping attack due to high sec condition!")
				break;
			}

			ns.print(bestbot + " filled to " + get_growPercent(bestbot) + "% | " + ns.nFormat(ns.getServerMoneyAvailable(bestbot), '($ 0.00 a)'));
			wave += 1;
			let attack_time = ns.getGrowTime(bestbot);
			await attack_timer(bestbot, wave, attack_time);
		}
	}

	async function hack_(bestbot, bots) {
		ns.print("---------------------------------------")
		ns.print("Start HACK attack on " + bestbot + "\n");
		bot_attack("hack", bots, bestbot);
		let wave = 0;

		while (get_growPercent(bestbot) > 50) {
			if (get_secLvl(bestbot) > 10) {
				ns.print("Stopping attack due to high sec condition!")
				break;
			}

			ns.print(bestbot + " filled to " + get_growPercent(bestbot) + "% | " + ns.nFormat(ns.getServerMoneyAvailable(bestbot), '($ 0.00 a)'));
			wave += 1;
			let attack_time = ns.getHackTime(bestbot);
			await attack_timer(bestbot, wave, attack_time);
		}
	}

	// ----------------------------------------------------------------------------------------------------

	while (true) {

		no_log();

		ns.ui.clearTerminal();

		let bots_ignore = ns.getPurchasedServers();
		bots_ignore.push("home");

		// search net from host
		ns.print("Scan network ...");
		let net = [];
		let host = ns.getHostname();
		deep_scan(host, net);

		// filter rooted bots, skip host
		ns.print("Collect rooted bots ...");
		let bots_rooted = [];
		for (var i in net) {
			let bot = net[i];
			if ((ns.hasRootAccess(bot)) && (!bots_ignore.includes(bot))) {
				bots_rooted.push(bot);
			}
		}

		// weaken all bots 
		await weaken_(bots_rooted);

		// get ranking
		ns.print("---------------------------------------")
		ns.print("Search for best bot ...");
		let growrate = sort_order("HighToLow", bots_rooted, ns.getServerGrowth, 0);
		let growtime = sort_order("LowToHigh", bots_rooted, ns.getGrowTime, 0);
		let maxmoney = sort_order("HighToLow", bots_rooted, ns.getServerMaxMoney, 0);
		let hackamnt = sort_order("HighToLow", bots_rooted, ns.hackAnalyze, 0);
		let hacktime = sort_order("LowToHigh", bots_rooted, ns.getHackTime, 0);
		let bestbots = sort_order("LowToHigh", bots_rooted, get_dist, [growrate, growtime, maxmoney, hackamnt, hacktime]);
		let bestbot = bestbots[0];
		ns.print("Best bot is now: " + bestbot);

		// grow best bot
		await grow_(bestbot, bots_rooted);

		// hack best bot
		await hack_(bestbot, bots_rooted);
	}
}