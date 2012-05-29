const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Signals = imports.signals;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Applications = Extension.imports.data.Applications;
const GMenuReader = Extension.imports.libs.GMenuReader;
const Utils = Extension.imports.libs.Utils;

const System = (function() {
	let instance;

	let SystemInstance = new Lang.Class({
		Name: "SystemInstance",

		_init: function() {
			this.uuid = Math.random();
			this.appSystem = Shell.AppSystem.get_default();
			this.usageSystem = Shell.AppUsage.get_default();
			this.menuReader = new GMenuReader.GMenuReader("sys");
			this.applications = Applications.Applications.getInstance();
			this.applicationsBlacklistedApps = this.applications.getBlackListedApps();

			this.setCategories();
			this.setApps();
		},
		
		getApps: function() {
			// return all the apps
			return this.categories[0].apps;
		},

		getCategories: function() {
			return this.categories;
		},

		setCategories: function() {
			this.categories = this.menuReader.getCategories(this.appSystem.get_settings_tree());

			this.categories.splice(0, 0, {name: "All", apps: []}); // insert an All

			// add in System Tools from applications.menu
			this.categories.push({name: "Tools", apps: this.applicationsBlacklistedApps});
		},

		setApps: function() {
			// insert all the apps into the All category
			for (let i = 0; i < this.categories.length; i++) {
				this.categories[0].apps.push.apply(this.categories[0].apps, this.categories[i].apps);
			}

			// because we combine apps across categories we need to remove dupes as some apps can appear in more than one category
			this.categories[0].apps = Utils.unique(this.categories[0].apps);

			this.categories[0].apps.sort(function(a, b) {
				return a.compare_by_name(b);
			});
		},

		destroy: function() {
			instance = null;
		}
	});
	Signals.addSignalMethods(SystemInstance.prototype);

	return new function() {
		this.getInstance = function() {
			if (!instance) {
				instance = new SystemInstance();
			}

			return instance;
		}
	}
})();