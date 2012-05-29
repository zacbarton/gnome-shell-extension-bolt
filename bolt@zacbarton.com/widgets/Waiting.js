const St = imports.gi.St;
const Lang = imports.lang;
const Panel = imports.ui.panel;

const Waiting = new Lang.Class({
	Name: "Waiting",

	_init: function(label, visible) {
		this.actor = new St.BoxLayout({style_class: "notice waiting"
			, visible: (visible || false)
			, reactive: false
		});
		this.actor.delegate = this;
		this.actor.connect("destroy", Lang.bind(this, this.destroy));
		this.startSpinnerTimeout = this.actor.connect("notify::mapped", Lang.bind(this, this.startSpinner));

			this.container = new St.BoxLayout({visible: true
				, reactive: false
			});
			this.actor.add(this.container, {x_align: St.Align.MIDDLE, x_fill: false, y_align: St.Align.MIDDLE, y_fill: false, expand: true});

				this.text = new St.Label({text: label});
				this.container.add(this.text, {y_align: St.Align.MIDDLE, y_fill: false, expand: true});

				this.spinner = new Panel.AnimatedIcon("process-working.svg", 24);
				this.container.add(this.spinner.actor);
	},

	startSpinner: function() {
		this.spinner.actor.show();
		this.actor.disconnect(this.startSpinnerTimeout); // we only do this once
	},

	show: function() {
		this.actor.raise_top();
		this.actor.show();
	},

	hide: function() {
		this.actor.hide();
		this.spinner.actor.destroy();
	},

	visible: function() {
		return this.actor.visible;
	},

	destroy: function() {
		if (this.startSpinnerTimeout) {
			this.actor.disconnect(this.startSpinnerTimeout);
		}

		this.spinner.actor.destroy();
		this.actor.destroy();
	}
});