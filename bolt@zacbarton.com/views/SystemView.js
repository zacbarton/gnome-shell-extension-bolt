const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getBoltExtension();
const System = Extension.imports.data.System;
const CategoryViewFiltered = Extension.imports.widgets.CategoryViewFiltered;

const SystemView = new Lang.Class({
	Name: "SystemView",
	Extends: CategoryViewFiltered.CategoryViewFiltered,

	_init: function(bolt) {
		this.parent("System");

		this.bolt = bolt;
		this.dataProvider = System.System.getInstance();

		this.render();
	}
});