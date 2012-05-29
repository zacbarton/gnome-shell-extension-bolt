const St = imports.gi.St;
const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const IconGrid = imports.ui.iconGrid;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;
const Icon = Extension.imports.widgets.Icon;

const SCROLL_TIME = 0.1;
const MAX_RESULTS_PER_SECTION = 50;

const SEE_MORE = "see xx more results";
const SEE_LESS = "see fewer results";

const SectionView = new Lang.Class({
	Name: "SectionView",

	_init: function(tabLabel, sections, visible) {
		this.iconCache = {};
		
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

		this.panelScroll = new St.ScrollView({style_class: "panelScroll vfade"
			, x_fill: true
			, y_fill: true
			, visible: false
			, y_align: St.Align.START
			, hscrollbar_policy: Gtk.PolicyType.NEVER
			, vscrollbar_policy: Gtk.PolicyType.ALWAYS
		});
		this.panelScroll.vscroll.adjustment.connect("changed", Lang.bind(this, this.setScrollbarVisibility)); // FIXME dont update when just scrolling
		Utils.addExtraCssSupport(this.panelScroll);

			this.panel = new St.BoxLayout({name: "panel" // NEEDED!
				, style_class: "panel"
				, vertical: true
				, visible: true
				, reactive: false
			});
			Utils.addExtraCssSupport(this.panel);
			this.panelScroll.add_actor(this.panel);

				this.subTabs = [];
				this.appIconGrids = [];
				for (let i = 0; i < sections.length; i++) {
					let section = sections[i];

					let subTabs = new St.BoxLayout({style_class: "tabs"
						, visible: visible
						, reactive: false
					});
					Utils.addExtraCssSupport(subTabs);
					this.panel.add_actor(subTabs);

						let tab = new St.BoxLayout({style_class: "tab"
							, visible: true
							, reactive: true
							, can_focus: true
							, track_hover: true
						});
						tab.connect("key-focus-in", Lang.bind(this, this.ensureVisible)); // TODO event delegation?
						Utils.addExtraCssSupport(tab);
						subTabs.add_actor(tab);

							tab.textLeft = new St.Label({text: section, style_class: "left"});
							tab.add_actor(tab.textLeft);

							tab.textCenter = new St.Label({text: "", style_class: "center", visible: false});
							tab.add_actor(tab.textCenter);

							tab.textRight = new St.Label({text: "\u25B8", style_class: "right", visible: false});
							tab.textRight.rotation_center_z_gravity = Clutter.Gravity.NONE;
							tab.add_actor(tab.textRight);

					let appIconGrid = new IconGrid.IconGrid({rowLimit: 1});
					if (!visible) {
						appIconGrid.actor.hide();
					}
					this.panel.add_actor(appIconGrid.actor);
					Utils.addExtraCssSupport(appIconGrid.actor);

					global.focus_manager.add_group(subTabs);
					global.focus_manager.add_group(appIconGrid.actor);

					// assign to dynamic name
					this[Utils.camelCase(section.toLowerCase()) + "SubTab"] = subTabs;
					this[Utils.camelCase(section.toLowerCase()) + "AppIconGrid"] = appIconGrid;

					this.subTabs.push(subTabs);
					this.appIconGrids.push(appIconGrid);
				}
	},

	renderApps: function(subTab, appIconGrid, apps, useCache) {
		appIconGrid.actor.get_first_child().remove_all_children();

		for (let i = 0, count = apps.length; i < count; i++) {
			let id = apps[i].get_id();
			let appIcon;

		//	if (useCache && this.iconCache[id]) {
		//		appIcon = this.iconCache[id];
		//	} else {
				appIcon = new Icon.RegularIcon(apps[i]);
				appIcon.actor.connect("key-focus-in", Lang.bind(this, this.ensureVisible)); // TODO event delegation?
				this.iconCache[id] = appIcon;
		//	}

			if (appIcon) {
				appIconGrid.addItem(appIcon.actor);
			}
		}

		if (apps.length === 0) {
			subTab.hide();
			appIconGrid.actor.hide();
		} else {
			subTab.show();
			appIconGrid.actor.show();

			if (this.bolt.iconsPerRow < apps.length) {
				subTab.get_first_child().textCenter.text = SEE_MORE.replace("xx", apps.length - this.bolt.iconsPerRow);
				subTab.get_first_child().textCenter.show();

				subTab.get_first_child().textRight.text = "\u25B8";
				subTab.get_first_child().textRight.show();
			} else {
				subTab.get_first_child().textCenter.hide();
				subTab.get_first_child().textRight.hide();
			}
		}
	},

	ensureVisible: function(actor, event) {
		let parentActor = actor.get_parent();
		let adjustment = this.panelScroll.vscroll.adjustment;
		let offset = this.panelScroll.get_theme_node().get_length("-st-vfade-offset");
		let [value, lower, upper, stepIncrement, pageIncrement, pageSize] = adjustment.get_values();

		// if this gets called as part of a right-click, the actor
		// will be needs_allocation, and so "icon.y" would return 0
		let box = actor.get_allocation_box();

		if (parentActor.get_parent().has_style_class_name("icon-grid")) {
			box.y1 += parentActor.get_parent().get_allocation_box().y1;
			box.y2 += parentActor.get_parent().get_allocation_box().y1;
		} else {
			box.y1 += parentActor.get_allocation_box().y1;
			box.y2 += parentActor.get_allocation_box().y1;
		}

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
		let [value, lower, upper, stepIncrement, pageIncrement, pageSize] = adjustment.get_values();

		if (upper <= pageSize) {
			this.panelScroll.vscroll.set_opacity(0);
		} else {
			this.panelScroll.vscroll.set_opacity(255);
		}
	},

	activate: function(actor) {
		let parentActor = actor.get_parent();

		let subTabs = this.subTabs;
		let appIconGrids = this.appIconGrids;

		for (let i = 0, count = subTabs.length; i < count; i++) {
			if (parentActor == subTabs[i]) {
				let total = appIconGrids[i].actor.get_first_child().get_children().length;
				let visible = appIconGrids[i].childrenInRow(appIconGrids[i].actor.width);

				if (appIconGrids[i]._rowLimit == 1) {
					appIconGrids[i]._rowLimit = null;
					if (visible < total) {
						subTabs[i].get_first_child().textCenter.text = SEE_LESS;
						subTabs[i].get_first_child().textRight.text = "\u25BE";
						subTabs[i].get_first_child().textRight.add_style_class_name("rotated");
					}
				} else {
					appIconGrids[i]._rowLimit = 1;
					if (visible < total) {
						subTabs[i].get_first_child().textCenter.text = SEE_MORE.replace("xx", total - this.bolt.iconsPerRow);
						subTabs[i].get_first_child().textRight.text = "\u25B8";
						subTabs[i].get_first_child().textRight.remove_style_class_name("rotated");
					}
				}

				appIconGrids[i].actor.get_first_child().queue_relayout();
				break;
			}
		}
	},

	navigateFocus: function(actor, direction) {
		let parentActor = actor.get_parent();

		switch (direction) {
			case Gtk.DirectionType.UP:
				if (parentActor.get_parent().has_style_class_name("icon-grid")) {
					let previous = Utils.getPreviousSiblingVisible(parentActor.get_parent());
					previous.get_first_child().navigate_focus(actor, Gtk.DirectionType.UP, false);
				} else if (actor.has_style_class_name("tab")) {
					if (parentActor == Utils.getFirstChildVisible(this.panel)) {
						this.tab.grab_key_focus();
					} else {
						let previous = Utils.getPreviousSiblingVisible(parentActor);
						if (previous) {
							previous.navigate_focus(actor, Gtk.DirectionType.UP, false);
						}
					}
				}
				break;

			case Gtk.DirectionType.DOWN:
				if (parentActor == this.tab.get_parent()) { // get_parent() tests we are in the main tabs
					let child = Utils.getFirstChildVisible(this.panel);
					child.navigate_focus(actor, Gtk.DirectionType.DOWN, false);
				} else if (actor.has_style_class_name("tab")) {
					let next = Utils.getNextSiblingVisible(parentActor);
					next.navigate_focus(actor, Gtk.DirectionType.DOWN, false);
				} else if (parentActor.get_parent().has_style_class_name("icon-grid")) {
					let next = Utils.getNextSiblingVisible(parentActor.get_parent());
					if (next) {
						next.get_first_child().navigate_focus(actor, Gtk.DirectionType.DOWN, false);
					}
				}
				break;
		}
	}
});