const St = imports.gi.St;
const Lang = imports.lang;
const Pango = imports.gi.Pango;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const Utils = Extension.imports.libs.Utils;

const CategoryView = Extension.imports.widgets.CategoryView;
const IconGrid = Extension.imports.widgets.IconGrid;
const Waiting = Extension.imports.widgets.Waiting;

const CategoryViewStacked = new Lang.Class({
	Name: "CategoryViewStacked",
	Extends: CategoryView.CategoryView,

	_init: function(tabLabel) {
		this.parent(tabLabel);

		// remove xx
		this.appIconGrid.actor.destroy();

		// add xx
		this.appIconGridContainer = new St.BoxLayout({style_class: "appIconGridContainer"
			, vertical: true
			, visible: true
			, reactive: false
		});
		this.subPanelScroll.add_actor(this.appIconGridContainer);
	},

	render: function() {
		this.appIconGrids = [];

		for (let i = 0; i < this.categories.length; i++) {
			let tab = new St.Bin({style_class: "category"
				, x_fill: true
				, reactive: true
				, can_focus: true
				, track_hover: true
				, child: new St.Label({text: this.categories[i].name})
			});
			tab.get_child().clutter_text.set_ellipsize(Pango.EllipsizeMode.MIDDLE);
			Utils.addExtraCssSupport(tab);

			// the first item is always selected
			if (i === 0) {
				tab.add_style_pseudo_class("selected");
			}

			this.subTabs.add_actor(tab);

			let appIconGrid = new IconGrid.IconGrid({}, i === 0);
			this.appIconGridContainer.add_actor(appIconGrid.actor);

				this.waiting = new Waiting.Waiting("", true);
				this.waiting.actor.add_constraint(new Clutter.BindConstraint({source: this.subPanelScroll, coordinate: Clutter.BindCoordinate.SIZE}));
				appIconGrid.addItem(this.waiting.actor);

			global.focus_manager.add_group(appIconGrid.actor);

			this.appIconGrids.push(appIconGrid);
		}
	},

	selectCategory: function(subTab, force) {
		// check this tab isnt already selected
		if (subTab.has_style_pseudo_class("selected") && !force) return;

		// find the selected tab
		let i, subTabs, subTabIndex;

		for (i = 0, subTabs = this.subTabs.get_children(); i < subTabs.length; i++) {
			subTabs[i].remove_style_pseudo_class("selected");

			if (subTabs[i] === subTab) {
				subTabIndex = i;
			}

			this.appIconGrids[i].actor.hide();
		}

		subTabs[subTabIndex].add_style_pseudo_class("selected");
		subTabs[subTabIndex].grab_key_focus();

		this.appIconGrid = this.appIconGrids[subTabIndex];
		this.appIconGrid.actor.show();

		this.setApps(subTabIndex);
	},

	destroy: function() {
		for (let id in this.iconCache) {
			this.iconCache[id].destroy();
		}
		this.iconCache = {};

		for (let i = 0; i < this.appIconGrids.length; i++) {
			this.appIconGrids[i].removeAll();
		}

		this.tab.destroy();
		this.panel.destroy();
	}
});