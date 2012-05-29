const St = imports.gi.St;
const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const Signals = imports.signals;
const Tweener = imports.ui.tweener;
const IconGrid = imports.ui.iconGrid;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;

const Icon = Extension.imports.widgets.Icon;

const SCROLL_TIME = 0.1;

const CategoryView = new Lang.Class({
	Name: "CategoryView",

	_init: function(tabLabel) {
		this.iconCache = {};
		this.contentsChanged = false;

		this.tab = new St.Bin({style_class: "tab"
			, x_fill: true
			, reactive: true
			, can_focus: true
			, track_hover: true
			, child: new St.Label({text: tabLabel})
		});
		this.tab.get_child().clutter_text.set_ellipsize(Pango.EllipsizeMode.MIDDLE);
		Utils.addExtraCssSupport(this.tab);
		this.tab.delegate = this;

		this.panel = new St.BoxLayout({style_class: "panel"
			, vertical: true
			, visible: false
			, reactive: false
		});

			this.subTabs = new St.BoxLayout({style_class: "tabs"
				, visible: true
				, reactive: true
			});
			this.panel.add_actor(this.subTabs);

			this.subPanelScroll = new St.ScrollView({style_class: "panelScroll vfade"
				, x_fill: true
				, y_fill: true
				, y_align: St.Align.START
				, hscrollbar_policy: Gtk.PolicyType.NEVER
				, vscrollbar_policy: Gtk.PolicyType.ALWAYS
			});
			this.subPanelScroll.vscroll.adjustment.connect("changed", Lang.bind(this, this.setScrollbarVisibility));
			Utils.addExtraCssSupport(this.subPanelScroll);
			this.panel.add(this.subPanelScroll, {expand: true, y_fill: true}); // only add with options!

				this.appIconGrid = new IconGrid.IconGrid();
				this.subPanelScroll.add_actor(this.appIconGrid.actor);

		global.focus_manager.add_group(this.subTabs);
		global.focus_manager.add_group(this.appIconGrid.actor);

		this.connect("contents-changed", Lang.bind(this, function() {
			this.contentsChanged = true;
		}));
	},

	renderApps: function(appIconGrid, apps) {
		appIconGrid.actor.get_first_child().remove_all_children();
		
		for (let i = 0, count = apps.length; i < count; i++) {
			let id = apps[i].get_id();

			let appIcon = new Icon.RegularIcon(apps[i]);
			appIcon.actor.connect("key-focus-in", Lang.bind(this, this.ensureVisible)); // TODO event delegation?
			appIconGrid.addItem(appIcon.actor);

			this.iconCache[id] = appIcon;
		}
	},

	getSelectedTab: function() {
		for (let i = 0, subTabs = this.subTabs.get_children(); i < subTabs.length; i++) {
			if (subTabs[i].visible && subTabs[i].has_style_pseudo_class("selected")) {
				return subTabs[i];
			}
		}

		return -1;
	},

	focusOnSelectedSubTab: function() {
		this.getSelectedTab().grab_key_focus();
	},

	activate: function(actor) {
		this.selectCategory(actor);
	},

	navigateFocus: function(actor, direction) {
		let parentActor = actor.get_parent();

		switch (direction) {
			case Gtk.DirectionType.UP:
				if (parentActor.get_parent().has_style_class_name("icon-grid")) {
					this.focusOnSelectedSubTab();
				} else if (parentActor == this.subTabs) {
					this.tab.grab_key_focus();
				}
				break;

			case Gtk.DirectionType.DOWN:
				if (parentActor == this.tab.get_parent()) { // get_parent() tests we are in the main tabs
					this.focusOnSelectedSubTab();
				} else {
					this.appIconGrid.actor.navigate_focus(actor, Gtk.DirectionType.DOWN, false);
				}
				break;
		}
	},

	ensureVisible: function(actor, event) {
		let adjustment = this.subPanelScroll.vscroll.adjustment;
		let offset = this.subPanelScroll.get_theme_node().get_length("-st-vfade-offset");
		let [value, lower, upper, stepIncrement, pageIncrement, pageSize] = adjustment.get_values();

		// if this gets called as part of a right-click, the actor
		// will be needs_allocation, and so "icon.y" would return 0
		let box = actor.get_allocation_box();

		if (box.y1 < value + offset) {
			value = Math.max(0, box.y1 - offset);
		} else if (box.y2 > value + pageSize - offset) {
			value = Math.min(upper, box.y2 + offset - pageSize);
		} else {
			return;
		}

		Tweener.addTween(adjustment, {value: value
			, time: SCROLL_TIME
			, transition: "easeOutQuad"
		});
	},
	
	setScrollbarVisibility: function(adjustment) {
		if (this.contentsChanged) {
			let [value, lower, upper, stepIncrement, pageIncrement, pageSize] = adjustment.get_values();

			if (upper <= pageSize) {
				this.subPanelScroll.vscroll.set_opacity(0);
			} else {
				this.subPanelScroll.vscroll.set_opacity(255);
			}

			this.contentsChanged = false;
		}
	}
});
Signals.addSignalMethods(CategoryView.prototype);