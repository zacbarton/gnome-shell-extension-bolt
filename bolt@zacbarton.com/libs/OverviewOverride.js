const Lang = imports.lang;
const Main = imports.ui.main;
const Overview = imports.ui.overview;

const OverviewOverride = new Lang.Class({
	Name: "OverviewOverride",

	_init: function(bolt) {
		this.bolt = bolt;
		this.enabled = false;
		this.overrides = {};
	},

	enable: function(enable) {
		if (enable) {
			this.enabled = true;
			this.override();
		} else {
			this.enabled = false;
			this.restore();
		}
	},

	add: function(object, name, func) {
		let original = object[name];
		object[name + "_old"] = original;

		object[name] = function() {
			return func.apply(this.bolt, arguments);
		}

		return object[name];
	},

	remove: function(object, name) {
		object[name] = object[name + "_old"];
	},

	override: function() {
		this.overrides.show = this.add(Overview.Overview.prototype, "show", Lang.bind(this, function() {
			this.bolt.show();
			Main.overview._shown = this.bolt.actor.visible;
			Main.overview.visible = this.bolt.actor.visible;
		}));
		this.overrides.hide = this.add(Overview.Overview.prototype, "hide", Lang.bind(this, function() {
			this.bolt.hide();
			Main.overview._shown = this.bolt.actor.visible;
			Main.overview.visible = this.bolt.actor.visible;
		}));
		this.overrides.toggle = this.add(Overview.Overview.prototype, "toggle", Lang.bind(this, function() {
			this.bolt.toggle();
			Main.overview._shown = this.bolt.actor.visible;
			Main.overview.visible = this.bolt.actor.visible;
		}));
	},

	restore: function() {
		for (let i in this.overrides) {
			this.remove(Overview.Overview.prototype, i);
		}
		this.overrides = {};

		Main.overview._shown = false;
		Main.overview.visible = false;
	}
});