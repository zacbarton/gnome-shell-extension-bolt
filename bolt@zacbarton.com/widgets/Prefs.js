const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Util = imports.misc.util;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;

const Prefs = new Lang.Class({
	Name: "Prefs",

	_init: function() {
		this.actor = new St.Button({style_class: "prefs"
			, reactive: true
			, can_focus: false
			, x_fill: false
			, y_fill: false
		});
		this.actor.delegate = this;
		this.actor.connect("clicked", Lang.bind(this, this.activate));
		Utils.addExtraCssSupport(this.actor);
	},

	activate: function() {
		Main.bolt.hide();
		Util.spawnCommandLine("gnome-shell-extension-prefs " + Extension.metadata.uuid);
	},

	destroy: function() {
		this.actor.destroy();
	}
});