const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;
const AppFavorites = imports.ui.appFavorites;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Downloads = Extension.imports.data.Downloads;

const MockShellApp = Extension.imports.libs.MockShellApp;
const Zeitgeist = Extension.imports.libs.Zeitgeist;
const Utils = Extension.imports.libs.Utils;

const SectionView = Extension.imports.widgets.SectionView;
const Icon = Extension.imports.widgets.Icon;

// FIXME move data retrieval into own lib
const HomeView = new Lang.Class({
	Name: "HomeView",
	Extends: SectionView.SectionView,

	_init: function(bolt) {
		let tabLabel = "Home";
		let sections = "Recent Applications,Recent Files,Downloads".split(",");

		this.parent(tabLabel, sections, true);

		this.bolt = bolt;
		this.appSystem = Shell.AppSystem.get_default();
		this.usageSystem = Shell.AppUsage.get_default();

		this.appFavorites = AppFavorites.getAppFavorites();
		this.appFavorites.connect("changed", Lang.bind(this, function() {
			if (this.applicationsType === "favorite") {
				this.recentApplicationsCache = null;
				this.getApplications();
			}
		}));

		this.downloads = new Downloads.Downloads();
		this.downloads.connect("updated", Lang.bind(this, function(downloads, files) {
			// global.log("downloads fetched");
			this.getDownloads(files);
		}));

		// vars
		this.applicationsType = "recent"; // managed by settingsManager
		this.recentFilesEnabled = true; // managed by settingsManager
		this.downloadsEnabled = true; // managed by settingsManager
		this.recentApplicationsCache = null;
		this.recentFilesCache = null;

		// elements
		this.recentApplicationsWaiting = new Icon.WaitingIcon();
		this.recentApplicationsWaiting.actor.width = 147 - 12; // FIXME
		this.recentApplicationsWaiting.actor.add_constraint(new Clutter.BindConstraint({source: this.recentApplicationsAppIconGrid.actor, coordinate: Clutter.BindCoordinate.HEIGHT, offset: - 12}));
		this.recentApplicationsAppIconGrid.addItem(this.recentApplicationsWaiting.actor);

		this.recentFilesWaiting = new Icon.WaitingIcon();
		this.recentFilesWaiting.actor.width = 147 - 12; // FIXME
		this.recentFilesWaiting.actor.add_constraint(new Clutter.BindConstraint({source: this.recentFilesAppIconGrid.actor, coordinate: Clutter.BindCoordinate.HEIGHT, offset: - 12}));
		this.recentFilesAppIconGrid.addItem(this.recentFilesWaiting.actor);

		// FIXME available test
		if (Zeitgeist.ready) {
			// global.log("zeitgeist ready");

			this.updateSections();
			this.downloads.getDownloads();

			this.tab.connect("notify::mapped", Lang.bind(this, this.updateSections));
		} else {
			// global.log("zeitgeist NOT ready");

			Utils.onFirstMap(this.panelScroll, Lang.bind(this, function() {
				this.recentApplicationsWaiting.actor.show();
				this.recentFilesWaiting.actor.show();
			}));

			Zeitgeist.connect("ready", Lang.bind(this, function() {
				// global.log("zeitgeist NOW ready");

				this.updateSections();
				this.downloads.getDownloads();

				this.tab.connect("notify::mapped", Lang.bind(this, this.updateSections));
			}));
		}
	},

	recentFilesEnable: function(enabled) {
		this.recentFilesEnabled = enabled;

		if (enabled) {
			this.getRecentFiles();
		} else {
			this.recentFilesCache = null;
			this.recentFilesSubTab.hide();
			this.recentFilesAppIconGrid.actor.hide();
		}
	},

	downloadsEnable: function(enabled) {
		this.downloadsEnabled = enabled;

		if (enabled) {
			this.downloads.getDownloads();
		} else {
			this.downloadsSubTab.hide();
			this.downloadsAppIconGrid.actor.hide();
		}
	},

	updateSections: function() {
		this.getApplications();
		this.getRecentFiles();
	},

	getApplications: function() {
		let subTab = this.recentApplicationsSubTab;
		let appIconGrid = this.recentApplicationsAppIconGrid;

		subTab.get_first_child().textLeft.text = this.applicationsType[0].toUpperCase() + this.applicationsType.substring(1) + " Applications";

		if (this.applicationsType === "popular") {
			if (this.recentApplicationsCache === null) {
				let apps = (this.usageSystem.get_most_used("", SectionView.MAX_RESULTS_PER_SECTION));
				apps = apps.slice(0, SectionView.MAX_RESULTS_PER_SECTION); // restricting above doesnt work?

				let cacheTest = this.bolt.iconsPerRow; // icon size dependant
				cacheTest += apps.map(function(app){
					return app.get_id();
				}).join(",");

				if (this.recentApplicationsCache === cacheTest) {
					// global.log("popular apps cached so ignoring");
					return;
				} else {
					// global.log("popular apps caching");
					this.recentApplicationsCache = cacheTest;
					this.renderApps(subTab, appIconGrid, apps);
				}
			}
		} else if (this.applicationsType === "favorite") {
			if (this.recentApplicationsCache === null) {
				let apps = this.appFavorites.getFavorites();

				let cacheTest = this.bolt.iconsPerRow; // icon size dependant
				cacheTest += apps.map(function(app){
					return app.get_id();
				}).join(",");

				if (this.recentApplicationsCache === cacheTest) {
					// global.log("favorite apps cached so ignoring");
					return;
				} else {
					// global.log("favorite apps caching");
					this.recentApplicationsCache = cacheTest;
					this.renderApps(subTab, appIconGrid, apps);
				}
			}
		} else {
			let subject = new Zeitgeist.Subject("application://*", "", "", "", "", "", "");
			let template = new Zeitgeist.Event("http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#AccessEvent", "http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#UserActivity", "", [subject], []);

			Zeitgeist.findEvents([-1, 0]
				, [template]
				, Zeitgeist.StorageState.ANY
				, SectionView.MAX_RESULTS_PER_SECTION
				, Zeitgeist.ResultType.MOST_RECENT_CURRENT_URI
				, Lang.bind(this, function(events, error) {
					let cacheTest = this.bolt.iconsPerRow; // icon size dependant

					// get the ids of all running apps
					let runningApps = this.appSystem.get_running();
					runningApps = runningApps.map(function(app) {
						return app.get_id();
					});

					// filter running apps from the results
					let apps = [];
					for (let i = 0, count = events.length; i < count; i++) {
						let event = events[i];
						let subject = event.subjects[0];
						let id = subject.uri.replace("application://", "");

						if (runningApps.indexOf(id) === -1) {
							let app = this.appSystem.lookup_app(id) || this.appSystem.lookup_setting(id);
							if (app) {
								cacheTest += app.get_id();
								apps.push(app);
							}
						}
					}

					if (this.applicationsType === "recent") {
						if (this.recentApplicationsCache === cacheTest) {
							// global.log("recent apps cached so ignoring");
							return;
						} else {
							// global.log("recent apps caching");
							this.recentApplicationsCache = cacheTest;
							this.renderApps(subTab, appIconGrid, apps);
						}
					}
				})
			);
		}
	},

	getRecentFiles: function() {
		if (this.recentFilesEnabled) {
			let subTab = this.recentFilesSubTab;
			let appIconGrid = this.recentFilesAppIconGrid;

			let subject = new Zeitgeist.Subject("file://*", "", "", "", "!inode/directory", "", "");
			let template = new Zeitgeist.Event("!http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#DeleteEvent", "http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#UserActivity", "", [subject], []);

			Zeitgeist.findEvents([-1, 0]
				, [template]
				, Zeitgeist.StorageState.ANY
				, SectionView.MAX_RESULTS_PER_SECTION
				, Zeitgeist.ResultType.MOST_RECENT_CURRENT_URI
				, Lang.bind(this, function(events, error) {
					let cacheTest = this.bolt.iconsPerRow; // icon size dependant

					let apps = [];
					for (let i = 0, count = events.length; i < count; i++) {
						let event = events[i];
						let subject = event.subjects[0];
						let uri = GLib.uri_unescape_string(subject.uri, "");

						if (GLib.file_test(uri.replace("file://", ""), GLib.FileTest.EXISTS)) {
							cacheTest += uri;
							let name = subject.text;
							let icon = null; // let the thumbnail generator decide based on the mimetype
							let mimeType = subject.mimetype;
							let launch = function() {
								Gio.app_info_launch_default_for_uri(uri, global.create_app_launch_context());
							}

							let app = new MockShellApp.MockShellApp(uri, name, icon, launch, uri, mimeType);
							apps.push(app);
						}
					}

					if (this.recentFilesCache === cacheTest) {
						// global.log("recent docs cached so ignoring");
						return;
					} else {
						// global.log("recent docs caching");
						this.recentFilesCache = cacheTest;
						this.renderApps(subTab, appIconGrid, apps);
					}
				})
			);
		} // enabled
	},

	getDownloads: function(files) {
		if (this.downloadsEnabled) {
			let subTab = this.downloadsSubTab;
			let appIconGrid = this.downloadsAppIconGrid;

			let resultsToShow = Math.min(SectionView.MAX_RESULTS_PER_SECTION, files.length);

			let downloads = [];
			for (let i = 0; i < resultsToShow; i++) {
				if (!files[i].get_is_hidden()) {
					let name = files[i].get_display_name();
					let uri = GLib.uri_unescape_string("file://" + this.downloads.path + "/" + name, "");

					let icon = null; // let the thumbnail generator decide based on the mimetype
					let mimeType = files[i].get_attribute_string("standard::fast-content-type");
					let launch = function() {
						Gio.app_info_launch_default_for_uri(uri, global.create_app_launch_context());
					}

					let mockShellApp = new MockShellApp.MockShellApp(uri, name, icon, launch, uri, mimeType);
					downloads.push(mockShellApp);
				}
			}
			this.renderApps(subTab, appIconGrid, downloads);
		} // enabled
	},

	destroy: function() {
		for (let id in this.iconCache) {
			this.iconCache[id].destroy();
		}
		this.iconCache = {};

		this.downloads.destroy();

		for (let i = 0; i < this.appIconGrids.length; i++) {
			this.appIconGrids[i].removeAll();
		}

		this.tab.destroy();
		this.panelScroll.destroy();
	}
});