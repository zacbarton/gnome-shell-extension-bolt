const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Search = imports.ui.search;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getBoltExtension();

const ApplicationsAndSystemSearch = Extension.imports.data.ApplicationsAndSystemSearch;
const ContactsSearch = Extension.imports.data.ContactsSearch;
const FilesSearch = Extension.imports.data.FilesSearch;

const Utils = Extension.imports.libs.Utils;

const SectionView = Extension.imports.widgets.SectionView;

const SearchView = new Lang.Class({
	Name: "SearchView",
	Extends: SectionView.SectionView,

	_init: function(bolt) {
		let tabLabel = "Search";
		let sections = "Applications and System,Files and Folders,Contacts".split(",");

		this.parent(tabLabel, sections, false);
		this.tab.destroy(); // reset to entry below

		this.bolt = bolt;
		this.searchTerms = "";
		this.searchIcon = null;
		this.searchTimeout = 0;
		this.blockTextChangeEvents = false;

		this.contactsEnabled = true; // managed by settingsManager
		this.filesAndFoldersEnabled = true; // managed by settingsManager

		// elements
		this.entry = new St.Entry({style_class: "search"
			, hint_text: "Type to search..."
			, track_hover: true
			, can_focus: true
		});
		Utils.addExtraCssSupport(this.entry);
		this.tab = this.entry;
		this.tab.delegate = this;

			this.text = this.entry.clutter_text;
			this.text.connect("key-press-event", Lang.bind(this, this.keyPress))
			this.text.connect("text-changed", Lang.bind(this, this.textChanged))
			this.text.connect("activate", Lang.bind(this, this.activate))

			 this.text.has_style_class_name = Lang.bind(this, function(className){ return this.entry.has_style_class_name(className); }); // required as you can sometimes click on the text and a Bolt::selectTab event occurs

			this.searchIcon = new St.Icon({style_class: "search-entry-icon"
				, icon_name: "edit-find"
				, icon_type: St.IconType.SYMBOLIC
			});
			this.entry.set_secondary_icon(this.searchIcon);

		this.noResults = new St.BoxLayout({style_class: "notice"
			, vertical: true
			, visible: false
			, reactive: false
		});
		this.noResults.add(new St.Label({text: "Sorry, there is nothing that matches your search."}), {x_align: St.Align.MIDDLE, x_fill: false, y_align: St.Align.MIDDLE, y_fill: false, expand: true});
		this.noResults.add_constraint(new Clutter.BindConstraint({source: this.panel, coordinate: Clutter.BindCoordinate.SIZE}));
		this.panel.add_actor(this.noResults);

		this.searchSystem = new Search.SearchSystem();
		this.searchSystem.connect("search-completed", Lang.bind(this, this.updateResults));
		this.searchSystem.connect("search-updated", Lang.bind(this, this.updateCurrentResults));

		this.setProviders();
	},

	filesAndFoldersEnable: function(enabled) {
		this.filesAndFoldersEnabled = enabled;

		if (enabled) {
			this.searchSystem.registerProvider(this.filesAndFolderProvider);
		} else {
			this.searchSystem.unregisterProvider(this.filesAndFolderProvider);
		}
	},

	contactsEnable: function(enabled) {
		this.contactsEnabled = enabled;

		if (enabled) {
			this.searchSystem.registerProvider(this.contactsProvider);
		} else {
			this.searchSystem.unregisterProvider(this.contactsProvider);
		}
	},

	setProviders: function() {
		this.applicationsAndSystemProvider = new ApplicationsAndSystemSearch.ApplicationsAndSystemSearch();
		this.applicationsAndSystemProvider.tab = this.applicationsAndSystemSubTab;
		this.applicationsAndSystemProvider.grid = this.applicationsAndSystemAppIconGrid;
		this.searchSystem.registerProvider(this.applicationsAndSystemProvider);

		this.filesAndFolderProvider = new FilesSearch.FilesSearch();
		this.filesAndFolderProvider.tab = this.filesAndFoldersSubTab;
		this.filesAndFolderProvider.grid = this.filesAndFoldersAppIconGrid;

		this.contactsProvider = new ContactsSearch.ContactsSearch();
		this.contactsProvider.tab = this.contactsSubTab;
		this.contactsProvider.grid = this.contactsAppIconGrid;
	},

	clearText: function(block) {
		this.blockTextChangeEvents = block;
		this.entry.set_text("");
		this.blockTextChangeEvents = false;
	},

	keyPress: function(actor, event) {
		let symbol = event.get_key_symbol();

		// left and right key press are not captured by our keyboardManager so relay them here if appropriate
		if (symbol == Clutter.Right && this.text.get_cursor_position() === -1) {
			this.bolt.keyboardManager.keyPress(this, event);
			return true;
		}

		return false;
	},

	textChanged: function() {
		if (this.blockTextChangeEvents) {
			return;
		} else {
			let text = this.entry.get_text();

			if (this.searchTimeout > 0) {
				Mainloop.source_remove(this.searchTimeout);
			}

			if (text !== "") {
				if (text.length === 1 && !this.oldActiveTab) {
					this.startSearch();
				}
				this.searchTimeout = Mainloop.timeout_add(150, Lang.bind(this, this.doSearch));
			} else {
				this.stopSearch();
			}
		}
	},
	
	startSearch: function() {
		this.searchSystem.reset();

		this.bolt.activeTab.delegate.panel.hide();
		this.bolt.activeTab.delegate.tab.remove_style_pseudo_class("selected");
		this.oldActiveTab = this.bolt.activeTab;

		this.bolt.activeTab = this.tab;
		this.panelScroll.show();

		this.emit("search-started");
	},

	stopSearch: function() {
		if (this.oldActiveTab) {
			this.panelScroll.hide();

			this.bolt.activeTab = this.oldActiveTab;
			this.bolt.activeTab.delegate.tab.add_style_pseudo_class("selected");
			this.bolt.activeTab.delegate.panel.show();
			this.oldActiveTab = null;

			for (let i = 0, count = this.subTabs.length; i < count; i++) {
				this.subTabs[i].hide();
				this.appIconGrids[i].actor.hide();
			}

			this.emit("search-stopped");
		}
	},

	doSearch: function() {
		this.searchTerms = this.entry.get_text().replace(/^\s+|\s+$/g, "");
		this.searches = this.searchSystem._providers.length;

		this.searchSystem.updateSearch(this.searchTerms);
	},

	updateResults: function(searchSystem, results, fromUpdateCurrentResults) {
		if (this.searchTerms !== searchSystem.getTerms()[0]) {
			return;
		}

		for (let i = 0; i < results.length; i++) {
			let [provider, providerResults] = results[i];

			if (providerResults.length === 0) {
				if (!provider.async || (provider.async && fromUpdateCurrentResults)) { // initial results. async also calls this
					provider.tab.hide();
					provider.grid.actor.hide();

					this.searches--;
					this.finishedSearch();
				 }
			} else {
				let apps = providerResults.slice(0, SectionView.MAX_RESULTS_PER_SECTION / 2);

				this.renderApps(provider.tab, provider.grid, apps);

				this.searches--;
				this.finishedSearch();
			} // > 0
		}
	},

	updateCurrentResults: function(searchSystem, results) {
		this.updateResults(searchSystem, [results], true);
	},

	finishedSearch: function() {
		if (this.searches < this.searchSystem._providers.length) {
			let firstSection = this.getFirstSection();

			if (firstSection && firstSection !== this.noResults) {
				this.noResults.hide();

				if (this.searchIcon) {
					this.searchIcon.remove_style_pseudo_class("focus");
				}

				this.searchIcon = this.getFirstSearchResult();
				this.searchIcon.add_style_pseudo_class("focus");
			} else if (this.searches === 0) {
				this.noResults.show();
			}
		}
	},

	activate: function(actor) {
		if (actor === this.text) {
			let icon = this.getFirstSearchResult();

			if (icon) {
				icon._delegate.icon.app.activate();
				this.bolt.hide();
			}
		} else {
			this.parent(actor);
		}
	},

	getFirstSection: function() {
		return Utils.getFirstChildVisible(this.panel);
	},

	getFirstSearchResult: function() {
		let section = this.getFirstSection();
		let iconGrid = section.get_next_sibling();
		return iconGrid.get_first_child().get_first_child();
	},

	getNorthSearchResult: function() {
		let section = this.getFirstSection();
		return section.get_first_child();
	},

	getEastSearchResult: function() {
		let section = this.getFirstSection();
		let iconGrid = section.get_next_sibling();
		return iconGrid.get_first_child().get_children()[1];
	},

	getSouthSearchResult: function() {
		let section = this.getFirstSection();
		let iconGrid = section.get_next_sibling();
		let icon = iconGrid.get_first_child().get_children()[this.bolt.iconsPerRow];

		if (icon && (icon.height * 2) < iconGrid.height) {
			return icon;
		} else {
			section = Utils.getNextSiblingVisible(iconGrid);
			return section.get_first_child();
		}
	},
	
	destroy: function() {
		if (this.searchTimeout) {
			Mainloop.source_remove(this.searchTimeout);
		}

		for (let id in this.iconCache) {
			this.iconCache[id].destroy();
		}
		this.iconCache = {};

		for (let i = 0; i < this.appIconGrids.length; i++) {
			this.appIconGrids[i].removeAll();
		}

		this.tab.destroy();
		this.panelScroll.destroy();
	}
});
Signals.addSignalMethods(SearchView.prototype);