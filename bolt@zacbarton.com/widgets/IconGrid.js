const Lang = imports.lang;
const IconGrid2 = imports.ui.iconGrid;

const IconGrid = new Lang.Class({
	Name: "IconGrid",
	Extends: IconGrid2.IconGrid,

	_init: function(params, visible) {
		this.parent(params);

		this.actor.reactive = true;
		this.actor.style_class = "iconGrid"; // note this is different that the GS style_class of icon-grid

		if (visible === false) {
			this.actor.visible = false;
		}
	}
});