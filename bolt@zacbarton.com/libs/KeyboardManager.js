const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;

const KeyboardManager = new Lang.Class({
	Name: "KeyboardManager",

	_init: function(bolt) {
		this.bolt = bolt;
		this.keyPressId = 0;
		this.enabled = false; // managed by displayManager
		this.capture = false;
	},

	enable: function(enabled) {
		if (enabled) {
			this.keyPressId = global.stage.connect("key-press-event", Lang.bind(this, this.keyPress));

			this.enabled = true;
		} else {
			if (this.keyPressId) {
				global.stage.disconnect(this.keyPressId);
				this.keyPressId = 0;
			}

			this.enabled = false;
		}
	},

	captureKeys: function(capture) {
		this.capture = capture;
	},

	keyPress: function(actor, event) {
		if (this.capture) {
			let symbol = event.get_key_symbol();

			if (this.bolt.searchView.text.has_key_focus() && this.bolt.searchView.entry.get_text() !== "") {
				if (symbol == Clutter.Escape) {
					this.bolt.searchView.clearText(false);
					return true;
				} else if (symbol == Clutter.Down || symbol == Clutter.Right) {
					let firstIcon = this.bolt.searchView.getFirstSearchResult();

					if (firstIcon) {
						firstIcon.navigate_focus(null, Gtk.DirectionType.DOWN, false);
					}
					return true;
				}
			} else {
				let currentFocus = global.stage.get_key_focus();

				if (symbol == Clutter.Escape) {
					if (this.bolt.searchView.entry.get_text() !== "") {
						this.bolt.searchView.clearText(false);
						this.bolt.focusOnSelectedTab();
					} else {
						this.bolt.hide();
					}
					return true;
				} else if (symbol == Clutter.Super_L) {
					this.bolt.hide();
					return true;
				} else if (symbol == Clutter.Return) {
					if (currentFocus.get_parent() == this.bolt.tabs) {
						this.bolt.selectTab(currentFocus);
					} else {
						this.bolt.activeTab.delegate.activate(currentFocus);
					}
				} else if (symbol == Clutter.Up) {
						this.bolt.activeTab.delegate.navigateFocus(currentFocus, Gtk.DirectionType.UP);
					return true;
				} else if (symbol == Clutter.Down) {
						this.bolt.activeTab.delegate.navigateFocus(currentFocus, Gtk.DirectionType.DOWN);
					return true;
				} else if (Clutter.keysym_to_unicode(symbol) || symbol == Clutter.BackSpace) {
					global.stage.set_key_focus(this.bolt.searchView.text);
					this.bolt.searchView.text.event(event, false); // repeat event
					return true;
				}
			}
		}

		return false;
	}
});