const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Search = imports.ui.search;
const PlaceDisplay = imports.ui.placeDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const MockShellApp = Extension.imports.libs.MockShellApp;
const Zeitgeist = Extension.imports.libs.Zeitgeist;

const FilesSearch = new Lang.Class({
	Name: "FilesSearch",
	Extends: Search.SearchProvider,

	_init: function() {
		this.parent("Files");
		this.async = true;

		this.maxResults = 35;
		this.placeSearchProvider = new PlaceDisplay.PlaceSearchProvider();
	},

	getInitialResultSetAsync: function(terms) {
		this.terms = terms;

		// fire the async search first so that the sync search doesnt hold up calling the async one
		let subject = new Zeitgeist.Subject("file://*", "", "", "", "", "", "");
		let template = new Zeitgeist.Event("!http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#DeleteEvent", "http://www.zeitgeist-project.com/ontologies/2010/01/27/zg#UserActivity", "", [subject], []);

		// xx
		let places = "";
		let placesResults = [];

		Zeitgeist.fullTextSearch("*" + terms + "*"
			, [template]
			, this.maxResults
			, Zeitgeist.ResultType.MOST_RECENT_CURRENT_URI
			, Lang.bind(this, function(events, error) {
				if (terms === this.terms) {
					let apps = [];

					for (let i = 0; i < placesResults.length; i++) {
						let id = placesResults[i].id;

						let mockShellApp = new MockShellApp.MockShellApp(
							id
							, placesResults[i].name
							, placesResults[i].createIcon
							, function(params) {
								Main.placesManager.lookupPlaceById(id).launch(params);
							});
						apps.push(mockShellApp);
					}

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

					if (terms === this.terms) {
						this.searchSystem.pushResults(this, apps);
					}
				}
			})
		);

		// search places
		places = this.placeSearchProvider.getInitialResultSet(terms);
		placesResults = this.placeSearchProvider.getResultMetas(places);
	},

	getSubsearchResultSetAsync: function(previousResults, terms) {
		return this.getInitialResultSetAsync(terms);
	}
});