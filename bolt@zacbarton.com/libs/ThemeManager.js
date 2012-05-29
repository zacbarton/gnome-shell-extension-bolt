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
		this.style = "bolt";
		this.enabled = false;
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

			// it looks like actors needs to be visible to receive the style-changed event and as bolt is most likey hidden
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
			this.override();

			// FIXME not 100% bullet-proof
			// give the theme some time to be applied before updating our size as its dependant on the icon grid style
			let delayTimeout = Mainloop.timeout_add(1500, Lang.bind(this, function() {
				this.bolt.settingsManager.setSize();

				Mainloop.source_remove(delayTimeout);
			}));
			
			this.reloading = false;
		}
	},

	override: function() {
		this.defaultStylesheet = Main._cssStylesheet || Main._defaultCssStylesheet;

		let stylesheet = Gio.file_new_for_path(this.defaultStylesheet);
		let stylesheetContent = Shell.get_file_contents_utf8_sync(stylesheet.get_path());

		// check to see if the theme has support for bolt otherwise use the built-in theme
		if (stylesheetContent.indexOf("bolt.css") === -1 && stylesheetContent.indexOf("#bolt") === -1) {
			// as we re-use some of the core components from GS like the icon-grid
			// our stylesheet.css cant override the styling for those components so
			// we are forced here to patch the default global stylesheet so that our
			// styling takes preference over the default
			let theme = new St.Theme({application_stylesheet: this.boltStylesheet
				, default_stylesheet: this.defaultStylesheet
			});

			try {
				// global.log("overide theme " + this.defaultStylesheet);
				this.style = "bolt";
			  	this.themeContext.set_theme(theme);
			} catch (e) {
				global.logError("Stylesheet parse error: " + e);
			}
		}
		else {
			// theme supports bolt styling
			this.style = "user-theme";
			this.defaultStylesheet = null;
		}
	},

	restore: function() {
		if (this.defaultStylesheet) {
			let theme = new St.Theme({theme_stylesheet: this.defaultStylesheet});

			try {
				// global.log("restoring theme " + this.defaultStylesheet)
				this.themeContext.set_theme(theme);
			} catch (e) {
				global.logError("Stylesheet parse error: " + e);
			}
		}
	},

	setBackgroundColor: function(backgroundColor) {
		// FIXME if the opacity = 1 then auto disable the blur
		if (this.style === "bolt") {
			this.bolt.container.set_style("background-color: " + backgroundColor);

			let tabColor = new Clutter.Color();
			tabColor.from_string(backgroundColor);
			tabColor = tabColor.darken();

			// create a gradient
			let startColor = tabColor.shade(0.65);
			let endColor = tabColor.shade(1.05);

			startColor = "rgba(" + startColor.red + "," + startColor.green + "," + startColor.blue + "," + ((startColor.alpha / 255) + .13) + ")";
			endColor = "rgba(" + endColor.red + "," + endColor.green + "," + endColor.blue + "," + ((endColor.alpha / 255) + .13) + ")";
		
			this.bolt.tabs.set_style("background-gradient-start: " + startColor + "; background-gradient-end: " + endColor);
		} else {
			// let users theme set colors
			this.bolt.container.set_style("background-color: none;"); 
			this.bolt.tabs.set_style("background-gradient-start: none; background-gradient-end: none;");
		}
	}
});