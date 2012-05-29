const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const IconGrid = imports.ui.iconGrid;

const Extension = imports.misc.extensionUtils.getBoltExtension();

const Animator = Extension.imports.libs.Animator;
const ThemeManager = Extension.imports.libs.ThemeManager;
const KeyboardManager = Extension.imports.libs.KeyboardManager;
const SettingsManager = Extension.imports.libs.SettingsManager;
const OverviewOverride = Extension.imports.libs.OverviewOverride;
const Utils = Extension.imports.libs.Utils;

const Blur = Extension.imports.widgets.Blur;
const Prefs = Extension.imports.widgets.Prefs;

const HomeView = Extension.imports.views.HomeView;
const ApplicationsView = Extension.imports.views.ApplicationsView;
const FilesView = Extension.imports.views.FilesView;
const ContactsView = Extension.imports.views.ContactsView;
const SystemView = Extension.imports.views.SystemView;
const SearchView = Extension.imports.views.SearchView;

const Bolt = new Lang.Class({
	Name: "Bolt",

	_init: function() {
		this.dir = Extension.dir;
		this.metadata = Extension.metadata;
		this.animator = new Animator.Animator(this);
		this.themeManager = new ThemeManager.ThemeManager(this);
		this.settingsManager = new SettingsManager.SettingsManager(this);
		this.keyboardManager = new KeyboardManager.KeyboardManager(this);
		this.overviewOverride = new OverviewOverride.OverviewOverride(this);

		this.activitiesText = Main.panel._activitiesButton._label.get_text();
	},

	setSizeAndPosition: function(size) {
		let primary = Main.layoutManager.primaryMonitor;
		let halfPrimaryWidth = primary.width / 2;

		let width = 0;
		let height = 0;
		let iconGridWidth = 150;
		let iconGridHeight = 130;

		// create a temp iconGrid so we can fetch the current styles size
		let iconGrid = new IconGrid.IconGrid();
		iconGrid.actor.hide();
		this.panels.add_actor(iconGrid.actor);

		// get the sizes from the theme
		let iconGridThemeNode = iconGrid.actor.get_theme_node();
		iconGridWidth = iconGridThemeNode.get_length("-shell-grid-horizontal-item-size");
		iconGridHeight = iconGridThemeNode.get_length("-shell-grid-vertical-item-size");

		// we remove temp icon grid as we have what we need
		this.panels.remove_actor(iconGrid.actor);
		iconGrid.actor.destroy();
		iconGrid = null;

		// add some safety
		iconGridWidth += 3;
		iconGridHeight -= 2;

		if (size === "auto") {
			while ((width += iconGridWidth) < halfPrimaryWidth){};
			width = Math.max(width, iconGridWidth * 7);
			height = iconGridHeight * 4;
		} else {
			width = iconGridWidth * size[0];
			height = iconGridHeight * size[1];
		}
	
		// FIXME doco the magic numbers
		width += 15;
		height += 110;
	
		this.iconsPerRow = Math.floor(width / iconGridWidth);

		// ive tried with partial success using BindConstraint and SnapConstraint on the coverPane, 
		// container and blur but kept seeing issues with mutli-monitor setups where the constraints
		// didnt seem to be updated or events we not captured. i also noticed that sometimes the height 
		// of the container would increase in height and then quickly revert. its a shame but manually 
		// setting the size and positions so that everything always matches seems to be the best solution :-(

		this.coverPane.x = 1; // allow the hot corner to work
		this.coverPane.y = 1;
		this.coverPane.width = global.stage.width;
		this.coverPane.height = global.stage.height;

		this.container.x = this.blur.actor.x = Main.layoutManager.panelBox.x;
		this.container.y = this.blur.actor.y = Main.layoutManager.panelBox.y + Main.layoutManager.panelBox.height;
		this.container.width = this.blur.actor.width = width;
		this.container.height = this.blur.actor.height = height;
	},

	selectTab: function(tab) {
		// check this tab isnt already selected
		if (tab.has_style_pseudo_class("selected")) return;

		this.searchView.clearText(false);

		let tabIndex;
		let tabs = tabs = this.tabs.get_children();
		let panels = this.panels.get_children();

		for (let i = 0, count = tabs.length; i < count; i++) {
			tabs[i].remove_style_pseudo_class("selected");

			if (tabs[i] === tab) {
				tabIndex = i;
				this.activeTab = tab;
			}
		}

		tabs[tabIndex].add_style_pseudo_class("selected");
		tabs[tabIndex].grab_key_focus();

		for (let i = 0, count = panels.length; i < count; i++) {
			panels[i].hide();
		}

		panels[tabIndex].show();
	},

	getSelectedTab: function() {
		for (let i = 0, tabs = this.tabs.get_children(); i < tabs.length; i++) {
			if (tabs[i].has_style_pseudo_class("selected")) {
				return tabs[i];
			}
		}

		return -1;
	},

	focusOnSelectedTab: function() {
		this.getSelectedTab().grab_key_focus();
	},

	show: function() {
		// hide the active application icon
		Main.panel._appMenu.actor.hide();

		this.animator.show();

		this.focusOnSelectedTab();
	},

	hide: function() {
		// re-show the active application icon
		Main.panel._appMenu.actor.show();

		this.animator.hide();
	},

	toggle: function() {
		if (this.container.visible) {
			this.hide();
		} else {
			this.show();
		}
	},

	// extension system entry points
	enable: function() {
		// core elements
		this.coverPane = new St.BoxLayout({name: "coverPane"
			, visible: false
			, reactive: true
			// , style: "background: red !important;"
		});
		
		this.container = new St.BoxLayout({name: "bolt"
			, vertical: true
			, visible: false
			, reactive: false
		});
		Utils.addExtraCssSupport(this.container);

			this.tabs = new St.BoxLayout({style_class: "tabs"
				, visible: true
				, reactive: true
			});
			this.tabs.connect("captured-event", Lang.bind(this, function(actor, event) {
				if (event.type() == Clutter.EventType.BUTTON_PRESS) {
					let sourceActor = event.get_source();

					if (sourceActor.has_style_class_name("tab")) {
						this.selectTab(sourceActor);
					}
				}
			}));
			Utils.addExtraCssSupport(this.tabs);
			this.container.add_actor(this.tabs);

			this.panels = new Shell.Stack({style_class: "panels"
				, reactive: true
			});
			this.panels.connect("captured-event", Lang.bind(this, function(actor, event) {
				if (event.type() == Clutter.EventType.BUTTON_PRESS) {
					let sourceActor = event.get_source();

					if (sourceActor.has_style_class_name("tab")) {
						this.activeTab.delegate.activate(sourceActor);
					}
				}
			}));
			Utils.addExtraCssSupport(this.panels);
			this.container.add(this.panels, {x_fill: true, y_fill: true, expand: true});

		global.focus_manager.add_group(this.tabs);

		// ui elements
		this.blur = new Blur.Blur(this);

		// data actors
		this.homeView = new HomeView.HomeView(this);
		this.tabs.add_actor(this.homeView.tab);
		this.panels.add_actor(this.homeView.panelScroll);

		this.applicationsView = new ApplicationsView.ApplicationsView(this);
		this.tabs.add_actor(this.applicationsView.tab);
		this.panels.add_actor(this.applicationsView.panel);

		this.filesView = new FilesView.FilesView();
		this.tabs.add_actor(this.filesView.tab);
		this.panels.add_actor(this.filesView.panel);

		this.contactsView = new ContactsView.ContactsView(this);
		this.tabs.add_actor(this.contactsView.tab);
		this.panels.add_actor(this.contactsView.panel);

		this.systemView = new SystemView.SystemView(this);
		this.tabs.add_actor(this.systemView.tab);
		this.panels.add_actor(this.systemView.panel);

		this.searchView = new SearchView.SearchView(this);
		this.tabs.add(this.searchView.tab, {x_align: St.Align.END, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true});
		this.panels.add_actor(this.searchView.panelScroll);

		this.prefs = new Prefs.Prefs();
		this.container.add(this.prefs.actor, {x_fill: false, y_fill: false, expand: false});
		this.prefs.actor.add_constraint(new Clutter.AlignConstraint({source: this.searchView.tab, align_axis: Clutter.AlignAxis.Y_AXIS, factor: 0.59}));
		this.prefs.actor.add_constraint(new Clutter.BindConstraint({source: this.searchView.tab, coordinate: Clutter.BindCoordinate.X, offset: -20}));

		// set default tab
		this.activeTab = this.homeView.tab;
		this.homeView.tab.add_style_pseudo_class("selected");
		this.homeView.panelScroll.show();

		// add to layout
		Main.layoutManager.addChrome(this.coverPane);
		Main.layoutManager.addChrome(this.blur.actor);
		Main.layoutManager.addChrome(this.container);

		// ensure we sit under the panel
		this.container.lower(Main.layoutManager.panelBox);
		this.blur.actor.lower(this.container);
		this.coverPane.lower(this.blur.actor);


		Main.panel._activitiesButton._label.set_text("Bolt");

		// setup libs
		this.themeManager.enable(true);
		this.settingsManager.enable(true);
		this.keyboardManager.enable(true);
		this.overviewOverride.enable(true);
	},
	
	disable: function() {
		this.themeManager.enable(false);
		this.settingsManager.enable(false);
		this.keyboardManager.enable(false);
		this.overviewOverride.enable(false);

		Main.panel._activitiesButton._label.set_text(this.activitiesText);

		// remove from layout
		Main.layoutManager.removeChrome(this.container);
		Main.layoutManager.removeChrome(this.blur.actor);
		Main.layoutManager.removeChrome(this.coverPane);

		// data actors
		this.searchView.destroy();
		this.systemView.destroy();
		this.contactsView.destroy();
		this.filesView.destroy();
		this.applicationsView.destroy();
		this.homeView.destroy();
		this.prefs.destroy();

		// xx
		this.blur.destroy();
		
		this.panels.destroy();
		this.tabs.destroy();

		this.container.destroy();
		this.coverPane.destroy();
	}
});
Signals.addSignalMethods(Bolt.prototype);