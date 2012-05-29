const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Signals = imports.signals;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const GMenuReader = Extension.imports.libs.GMenuReader;
const Utils = Extension.imports.libs.Utils;

const Applications = (function() {
	let instance;

	let ApplicationsInstance = new Lang.Class({
		Name: "Applications",

		_init: function() {
			this.uuid = Math.random();
			this.appSystem = Shell.AppSystem.get_default();
			this.menuReader = new GMenuReader.GMenuReader("apps");

			this.setCategories();
			this.setApps();
			this.setNewApps();

			this.appSystemConnection = this.appSystem.connect("installed-changed", Lang.bind(this, function() {
				this.oldApps = this.getApps().slice(0);

				this.setCategories();
				this.setApps();
				this.setNewApps();

				this.oldApps = null;

				this.emit("updated");
			}));
		},
		
		getApps: function() {
			// return all the apps
			return this.categories[0].apps;
		},

		// FIXME rename
		getBlackListedApps: function() {
			return this.blackListedApps;
		},
		
		getCategories: function() {
			return this.categories;
		},
		
		setCategories: function() {
			this.blackListedApps = [];
			this.categories = this.menuReader.getCategories(this.appSystem.get_tree());

			// remove empty categories and "System Tools"
			for (let i = this.categories.length - 1; i !== 0; i--) {
				if (this.categories[i].apps.length === 0 || this.categories[i].name === "System Tools") { // FIXME do we need to take the locale into account
					for (let j = 0; j < this.categories[i].apps.length; j++) {
						this.blackListedApps.push(this.categories[i].apps[j]);
					}
					this.categories.splice(i, 1);
				}
			}

			this.categories.splice(0, 0, {name: "All", apps: []}); // insert an All
		},

		setApps: function() {
			// insert all the apps into the All category
			for (let i = 0; i < this.categories.length; i++) {
				this.categories[0].apps.push.apply(this.categories[0].apps, this.categories[i].apps);
			}

			// because we combine apps across categories we need to remove dupes as some apps can appear in more than one category
			// Document Viewer is a good example as it appears in Graphics and Internet
			this.categories[0].apps = Utils.unique(this.categories[0].apps);
			
			this.categories[0].apps.sort(function(a, b) {
				return a.compare_by_name(b);
			});
		},

		setNewApps: function() {
			// load
			let newAppsFile = Gio.file_new_for_path(Extension.dir.get_path() + "/data/newApps.json");
			let newAppsContent = "";

			if (GLib.file_test(newAppsFile.get_path(), GLib.FileTest.EXISTS)) {
				newAppsContent = Shell.get_file_contents_utf8_sync(newAppsFile.get_path());
				// file.load_contents_async
			}

			let newApps = [];
			let newAppsToDisplay = [];
			let newAppsToSave = [];

			try {
				newApps = JSON.parse(newAppsContent);
			} catch (e) {
				// boo :-(
				// global.log("newApps.json corrupt");
			}

			let thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			// check old
			for (let i = 0; i < newApps.length; i++) {
				if (newApps[i].timestamp >= thirtyDaysAgo) { // ignore apps older than 30 days
					let app = this.appSystem.lookup_app(newApps[i].id);
					if (app) { // make sure its still installed
						newAppsToDisplay.push(app);
						newAppsToSave.push(newApps[i]);
					}
				}
			}

			// add new
			if (this.oldApps) {
				for (let i = 0; i < this.categories[0].apps.length; i++) {
					let app = this.categories[0].apps[i];
					if (this.oldApps.indexOf(app) === -1 && newAppsToDisplay.indexOf(app) === -1) { // not in old apps and not in new apps
						newAppsToDisplay.push(app);
						newAppsToSave.push({id: app.get_id(), timestamp: new Date().getTime()});
					}
				}
			}

			// display
			if (newAppsToDisplay.length > 0) {
				this.categories.splice(1, 0, {name: "New", apps: newAppsToDisplay}); // insert after All
			}

			// save
			let raw = newAppsFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
			let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
			Shell.write_string_to_stream(out, JSON.stringify(newAppsToSave));
			out.close(null);
		},

		destroy: function() {
			this.appSystem.disconnect(this.appSystemConnection);
			instance = null;
		}
	});
	Signals.addSignalMethods(ApplicationsInstance.prototype);

	return new function() {
		this.getInstance = function() {
			if (!instance) {
				instance = new ApplicationsInstance();
			}

			return instance;
		}
	}
})();