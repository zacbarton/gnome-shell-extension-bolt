const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

// getCurrentExtension() doesnt work in sub directories
// so monkey patch in a function to work around that
ExtensionUtils.getBoltExtension = function() {
	return Extension;
}

const Extension = ExtensionUtils.getCurrentExtension();
const Bolt = Extension.imports.Bolt;

function init() {
	Main.bolt = new Bolt.Bolt();
}

function enable() {
	Main.bolt.enable();
}

function disable() {
	Main.bolt.disable();
}