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

const RegularIcon = new Lang.Class({
	Name: "RegularIcon",
	Extends: AppDisplay.AppWellIcon,

	_init: function(app, ellipsizeNow) {
		this.parent(app);
		this.actor.style_class = "iconContainer";
		this.icon.actor.style_class = "regularIcon";

		// add a hover effect that we cant do in css :-(
		this.actor.enterConnection = this.actor.connect("enter-event", Lang.bind(this, function() {
			this.actor.add_effect_with_name("enhance", enhanceEffect);
		}));

		this.actor.leaveConnection = this.actor.connect("leave-event", Lang.bind(this, function() {
			this.actor.remove_effect_by_name("enhance");
		}));

		// disable popups for now
		if (app instanceof MockShellApp.MockShellApp) {
			this.popupMenu = function(){}
		}

		// allow the labels to be 2 lines but only when required
		this.improveLabel();
	},

	improveLabel: function() {
		this.text = this.icon.label.get_clutter_text();

		// set to wrap
		this.text.set_line_wrap(true);
		this.text.set_ellipsize(Pango.EllipsizeMode.MIDDLE);
		this.text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);

		// increase height so text wraps over 2 lines if needed
		this.icon.label.set_height(40);

		// xx
		this.icon.keyFocusConnection = this.actor.connect("key-focus-in", Lang.bind(this, function() {
			// store dimensions before we change things
			let width = this.icon.label.width;
			let height = this.icon.label.height;

			let size = this.text.get_layout().get_pixel_size();
			size[0] += 15;
			size[1] += 4;

			this.icon.label.set_width(Math.min(size[0], width));
			this.icon.label.margin_left = this.icon.label.margin_right = parseInt((width - Math.min(size[0], width)) / 2);

			this.icon.label.set_height(Math.min(size[1], height));
			this.icon.label.margin_bottom = height - Math.min(size[1], height);

			this.actor.disconnect(this.icon.keyFocusConnection);
		}));
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