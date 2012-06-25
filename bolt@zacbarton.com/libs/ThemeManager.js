const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const BackgroundMatcher = Extension.imports.libs.BackgroundMatcher;

const ThemeManager = new Lang.Class({
	Name: "ThemeManager",

	_init: function(bolt) {
		this.bolt = bolt;
		this.theme = "bolt";
		this.enabled = false; // managed by settingsManager
		this.reloading = false;
		this.styleChangedId = 0;

		this.boltStylesheet = this.bolt.dir.get_path() + "/themes/default.css";
		this.themeContext = St.ThemeContext.get_for_stage(global.stage);

		this.backgroundMatcher = new BackgroundMatcher.BackgroundMatcher();
		this.backgroundMatcher.connect("background-color-changed", Lang.bind(this, function(backgroundMatcher, color) {
			this.setBackgroundColor(color);
		}));
	},

	enable: function(enabled) {
		this.enabled = enabled;

		if (this.enabled) {
			this.override();

			// it looks like actors needs to be visible to receive the style-changed event and as bolt is most likely hidden
			// we wont pick up on the theme change so as a workaround we watch the panel for changes
			this.styleChangedConnection = Main.layoutManager.panelBox.connect("style-changed", Lang.bind(this, this.reload));
		} else {
			if (this.styleChangedConnection) {
				Main.layoutManager.panelBox.disconnect(this.styleChangedConnection);
				this.styleChangedConnection = 0;
			}

			this.restore();
		}
	},

	reload: function() {
		if (!this.reloading) {
			this.reloading = true;

			// reset
			this.bolt.isPopup = null;

			this.bolt.boxPointer.tabsBackgroundColor = null;
			this.bolt.boxPointer.contentBackgroundColor = null;
			this.bolt.boxPointer.actor.set_style("-arrow-background-color: none;");

			this.bolt.content.set_style("background-color: none;"); 
			this.bolt.tabs.set_style("background-gradient-start: none; background-gradient-end: none;");

			this.override();

			// FIXME not 100% bullet-proof
			// give the theme some time to be applied before updating our size as its dependant on the icon grid style
			let delayTimeout = Mainloop.timeout_add(3000, Lang.bind(this, function() {
				this.bolt.settingsManager.setSize();
				this.bolt.settingsManager.setBackgroundColor();
				this.reloading = false;

				Mainloop.source_remove(delayTimeout);
			}));
		}
	},

	override: function() {
		this.defaultStylesheet = Main._cssStylesheet || Main._defaultCssStylesheet;

		let stylesheet = Gio.file_new_for_path(this.defaultStylesheet);
		let stylesheetContent = Shell.get_file_contents_utf8_sync(stylesheet.get_path());

		// check to see if the theme has support for bolt otherwise use the built-in theme
		if (stylesheetContent.indexOf("bolt.css") === -1 && stylesheetContent.indexOf("#bolt") === -1) {
			// see stylesheet.css for info why we do this
			let theme = new St.Theme({application_stylesheet: this.boltStylesheet
				, default_stylesheet: this.defaultStylesheet
			});

			let customStylesheets = this.themeContext.get_theme().get_custom_stylesheets();
			for (let i = 0; i < customStylesheets.length; i++) {
				theme.load_stylesheet(customStylesheets[i]);
			}

			try {
				// global.log("overide theme " + this.defaultStylesheet);

				this.theme = "bolt";
				this.themeContext.set_theme(theme);
			} catch (e) {
				global.logError("Stylesheet parse error: " + e);
			}
		}
		else {
			// global.log("theme supports bolt");

			this.theme = "user-theme";
			this.defaultStylesheet = null;
		}
	},

	restore: function() {
		if (this.defaultStylesheet) {
			let theme = new St.Theme({theme_stylesheet: this.defaultStylesheet});

			let customStylesheets = this.themeContext.get_theme().get_custom_stylesheets();
			for (let i = 0; i < customStylesheets.length; i++) {
				theme.load_stylesheet(customStylesheets[i]);
			}

			try {
				// global.log("restoring theme " + this.defaultStylesheet)

				this.theme = null;
				this.themeContext.set_theme(theme);
			} catch (e) {
				global.logError("Stylesheet parse error: " + e);
			}
		}
	},

	setSize: function(size) {
		this.bolt.actor.style_class = size;

		// FIXME not 100% bullet-proof
		// give the theme some time to be applied before updating our size as its dependant on the icon grid style
		let delayTimeout = Mainloop.timeout_add(3000, Lang.bind(this, function() {
			this.bolt.settingsManager.setSize();

			Mainloop.source_remove(delayTimeout);
		}));
	},

	setBackgroundColor: function(backgroundColor) {
		// FIXME if the opacity = 1 then auto disable the blur
		if (this.theme === "bolt") {
			let tabsColor = new Clutter.Color();
			tabsColor.from_string(backgroundColor);
			tabsColor = tabsColor.darken();

			// create a gradient
			let tabsStartColor = tabsColor.shade(0.65);
			let tabsEndColor = tabsColor.shade(1.05);

			tabsStartColor = "rgba(" + tabsStartColor.red + "," + tabsStartColor.green + "," + tabsStartColor.blue + "," + ((tabsStartColor.alpha / 255) + .13) + ")";
			tabsEndColor = "rgba(" + tabsEndColor.red + "," + tabsEndColor.green + "," + tabsEndColor.blue + "," + ((tabsEndColor.alpha / 255) + .13) + ")";

			this.bolt.boxPointer.tabsBackgroundColor = tabsStartColor;
			this.bolt.boxPointer.contentBackgroundColor = backgroundColor;
			this.bolt.boxPointer.actor.set_style("-arrow-background-color: " + tabsStartColor);

			this.bolt.tabs.set_style("background-gradient-start: " + tabsStartColor + "; background-gradient-end: " + tabsEndColor);
			this.bolt.content.set_style("background-color: " + backgroundColor);
		}
	}
});