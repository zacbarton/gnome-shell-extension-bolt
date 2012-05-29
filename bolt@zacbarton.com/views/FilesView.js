const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const PlaceDisplay = imports.ui.placeDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();

const MockShellApp = Extension.imports.libs.MockShellApp;
const Zeitgeist = Extension.imports.libs.Zeitgeist;
const Utils = Extension.imports.libs.Utils;

const CategoryViewStacked = Extension.imports.widgets.CategoryViewStacked;
const Icon = Extension.imports.widgets.Icon;

const MAX_ITEMS = 50;

// FIXME move data retrieval into own lib
const FilesView = new Lang.Class({
	Name: "FilesView",
	Extends: CategoryViewStacked.CategoryViewStacked,

	_init: function(bolt) {
		this.parent("Files");
		
		this.bolt = bolt;
		this.iconCache = {};
		this.placesManager = new PlaceDisplay.PlacesManager();
		this.placesUpdatedConnection = this.placesManager.connect("places-updated", Lang.bind(this, function() {
			this.categories[2].apps = [];
			this.selectCategory(this.subTabs.get_children()[2], true);
		}));

		this.categories = [{name: "New", apps: []}
			, {name: "Popular", apps: []}
			// , {name: "Downloads", apps: []}
			, {name: "Places", apps: []}
		];

		this.render();
		this.selectCategory(this.subTabs.get_first_child(), true);
	},

	setApps: function(subTabIndex) {
		if (this.categories[subTabIndex].apps.length === 0) {
			switch (subTabIndex) {
				case 0:
					this.getNew(subTabIndex);
					
					let invalidateTimeout = Mainloop.timeout_add(1000 * 60 * 2, Lang.bind(this, function() {
						this.categories[0].apps = [];

						if (this.getSelectedTab() === this.subTabs.get_first_child()) {
							this.selectCategory(this.subTabs.get_first_child());
						}

						Mainloop.source_remove(invalidateTimeout);
					}));
					break;

				case 1:
					this.getPopular(subTabIndex);
					break;

				case 2:
					this.getPlaces(subTabIndex);
					break;
			}
		}

		this.emit("contents-changed");
	},

	getNew: function(subTabIndex) {
		let subject = new Zeitgeist.Subject("file://*", "", "", "", "", "", "");
		let template = new Zeitgeist.Event("http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#CreateEvent", "http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#UserActivity", "", [subject], []);

		let end = new Date().getTime();
		let start = end - 86400000 * 365; // 1 year

		Zeitgeist.findEvents([start, end]
			, [template]
			, Zeitgeist.StorageState.ANY
			, MAX_ITEMS
			, Zeitgeist.ResultType.MOST_RECENT_SUBJECTS
			, Lang.bind(this, function(events, error) {
				let apps = [];

				for (let i = 0, count = events.length; i < count; i++) {
					let event = events[i];
					let subject = event.subjects[0];
					let uri = GLib.uri_unescape_string(subject.uri, "");

					if (GLib.file_test(uri.replace("file://", ""), GLib.FileTest.EXISTS)) {
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

				this.categories[subTabIndex].apps = apps;
				this.renderApps(this.appIconGrids[subTabIndex], apps);

				this.emit("contents-changed");
			})
		);
	},

	getPopular: function(subTabIndex) {
		let subject = new Zeitgeist.Subject("file://*", "", "", "", "", "", "");
		let template = new Zeitgeist.Event("!http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#DeleteEvent", "http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#UserActivity", "", [subject], []);

		let end = new Date().getTime();
		let start = end - 86400000 * 365; // 1 year

		Zeitgeist.findEvents([start, end]
			, [template]
			, Zeitgeist.StorageState.ANY
			, MAX_ITEMS
			, Zeitgeist.ResultType.MOST_POPULAR_SUBJECTS
			, Lang.bind(this, function(events, error) {
				let apps = [];

				for (let i = 0, count = events.length; i < count; i++) {
					let event = events[i];
					let subject = event.subjects[0];
					let uri = GLib.uri_unescape_string(subject.uri, "");

					if (GLib.file_test(uri.replace("file://", ""), GLib.FileTest.EXISTS)) {
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

				this.categories[subTabIndex].apps = apps;
				this.renderApps(this.appIconGrids[subTabIndex], apps);

				this.emit("contents-changed");
			})
		);
	},

	getPlaces: function(subTabIndex) {
		let places = this.placesManager.getAllPlaces();
		let apps = [];

		// FIXME show computer, rubbish and network?
		for (let i = 0, count = places.length; i < count; i++) {
			let id = places[i].id;
			let name = places[i].name;
			let icon;
			let launch;

			if (places[i]._mount) {
				let mountUri = places[i]._mount.get_root().get_uri();
				let mountIcon = places[i]._mount.get_icon();

				icon = function(size) {
        			return St.TextureCache.get_default().load_gicon(null, mountIcon, size);
				}
				launch = function(params) {
					Gio.app_info_launch_default_for_uri(mountUri, global.create_app_launch_context());
				}
			} else {
				icon = places[i].iconFactory;
				launch = places[i].launch;
			}

			let app = new MockShellApp.MockShellApp(id, name, icon, launch);
			apps.push(app);
		}

		this.categories[subTabIndex].apps = apps;
		this.renderApps(this.appIconGrids[subTabIndex], apps);

		this.emit("contents-changed");
	},

	destroy: function() {
		this.placesManager.disconnect(this.placesUpdatedConnection);
		this.parent();
	}
});
Signals.addSignalMethods(FilesView.prototype);