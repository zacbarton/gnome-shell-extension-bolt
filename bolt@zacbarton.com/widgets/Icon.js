const St = imports.gi.St;
const Lang = imports.lang;
const Panel = imports.ui.panel;
const Pango = imports.gi.Pango;
const Clutter = imports.gi.Clutter;
const AppDisplay = imports.ui.appDisplay;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const MockShellApp = Extension.imports.libs.MockShellApp;

let enhanceEffect = new Clutter.BrightnessContrastEffect();
enhanceEffect.set_brightness(.19);
enhanceEffect.set_contrast(.19);

function improveLabel(label) {
	let text = label.get_clutter_text();
	text.set_line_wrap(true);
	text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
	text.set_ellipsize(Pango.EllipsizeMode.MIDDLE);

	label.ellipsizedTimeout = label.connect("notify::mapped", Lang.bind(this, function(){
		if (label.visible) {
			let [labelMinHeight, labelNatHeight] = label.get_preferred_height(110); // FIXME theme_node

			label.set_height(Math.min(labelNatHeight, 40));
			label.margin_bottom = 40 - Math.min(labelNatHeight, 40);

			label.disconnect(label.ellipsizedTimeout);
		}
	}));
}

const RegularIcon = new Lang.Class({
	Name: "RegularIcon",
	Extends: AppDisplay.AppWellIcon,

	_init: function(app, iconParams, onActivateOverride) {
		this.parent(app, iconParams, onActivateOverride);

		// add a hover effect that we cant do in css :-(
		this.actor.enterConnection = this.actor.connect("enter-event", Lang.bind(this, function(){
			this.actor.add_effect_with_name("enhance", enhanceEffect);
		}));

		this.actor.leaveConnection = this.actor.connect("leave-event", Lang.bind(this, function(){
			this.actor.remove_effect_by_name("enhance");
		}));

		// disable popups for now
		if (app instanceof MockShellApp.MockShellApp) {
			this.popupMenu = function(){}
		}

		// allow the labels to be 2 lines but only when required
		improveLabel(this.icon.label);
	},

	destroy: function() {
		this.actor.disconnect(this.actor.enterConnection);
		this.actor.disconnect(this.actor.leaveConnection);
		this.actor.destroy();
	}
});

const WaitingIcon = new Lang.Class({
	Name: "WaitingIcon",
	Extends: Panel.AnimatedIcon,

	_init: function() {
		this.parent("process-working.svg", 24);
	},

	destroy: function() {
		this.actor.destroy();
	}
});