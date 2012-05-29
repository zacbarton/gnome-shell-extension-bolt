const Lang = imports.lang;
const Shell = imports.gi.Shell;
const AppDisplay = imports.ui.appDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;

const ApplicationsAndSystemSearch = new Lang.Class({
	Name: "ApplicationsAndSystemSearch",
	Extends: AppDisplay.AppSearchProvider,

	_init: function(maxResults) {
		this.parent();
		this.usageSystem = Shell.AppUsage.get_default();
	},

	getInitialResultSet: function(terms) {
		let applicationApps = this._appSys.initial_search(terms);
		let systemApps = this._appSys.search_settings(terms);

		return this.combineResultSets(applicationApps, systemApps);
	},

	getSubsearchResultSet: function(previousResults, terms) {
		let applicationApps = this._appSys.subsearch(previousResults, terms);
		let systemApps = this._appSys.search_settings(terms);

		return this.combineResultSets(applicationApps, systemApps);
	},

	combineResultSets: function(applicationApps, systemApps) {
		let combinedApps = applicationApps.concat(systemApps);
		
		// because we combine apps from apps and system we need to remove dupes as some apps can appear in both results
		// Advanced Settings (gnome-tweak-tool) is a good example
		combinedApps = Utils.unique(combinedApps, "get_name");

		// sort our combined apps by usage
		// Advanced Settings (gnome-tweak-tool) is a good example as without this Ubuntu Tweak always comes first?!?
		combinedApps.sort(Lang.bind(this, function(a, b) {
			return this.usageSystem.compare("", a, b);
		}));

		return combinedApps;
	}
});