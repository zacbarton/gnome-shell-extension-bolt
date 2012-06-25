const Lang = imports.lang;
const Main = imports.ui.main;

const Activities = new Lang.Class({
	Name: "Activities",

	_init: function(bolt) {
		this.bolt = bolt;
		this.changed = false;
		this.enabled = false; // managed by settingsManager
		this.originalText = Main.panel._activitiesButton._label.get_text();
	},

	enable: function(enabled) {
		this.enabled = enabled;

		if (this.enabled) {
			this.changed = true;
			Main.panel._activitiesButton._label.set_text("Bolt");
		} else {
			if (this.changed) {
				Main.panel._activitiesButton._label.set_text(this.originalText);
				this.changed = false;
			}
		}
	}
});