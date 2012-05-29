const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Util = imports.misc.util;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;

let thumbnail_factory = false;
try {
	const GnomeDesktop = imports.gi.GnomeDesktop;

	// in Ubuntu package is named gir1.2-gnomedesktop-3.0
	thumbnail_factory = new GnomeDesktop.DesktopThumbnailFactory();
} catch(e) {
	thumbnail_factory = false;
}

const MockShellApp = function(id, name, icon, exec, uri, mimetype) {
	this.init(id, name, icon, exec, uri, mimetype);
}

MockShellApp.prototype = {
	Name: "MockShellApp",

	init: function(id, name, icon, exec, uri, mimetype) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.exec = exec;
		this.state = Shell.AppState.STOPPED;

		this.uri = uri;
		this.mimetype = mimetype;
	},

	connect: function() {
	},

	disconnect: function() {
	},

	get_id: function() {
		return this.id;
	},

	get_name: function() {
		return this.name;
	},

	create_icon_texture: function(size) {
		// debugging
		/*
		return new St.Icon({icon_name: 'gtk-color-picker'
				, icon_type: St.IconType.FULLCOLOR
				, icon_size: 64
			});
		*/

		if (this.uri && this.mimetype) {
			if (thumbnail_factory) {
				return this.createThumb(size);
			} else {
				return St.TextureCache.get_default().load_gicon(null, Shell.util_get_icon_for_uri(this.uri), size);
			}
		}

		switch (typeof this.icon) {
			case "function":
				return this.icon(size);
				break;

			case "string":
				return St.TextureCache.get_default().load_icon_name(null, this.icon, St.IconType.FULLCOLOR, size);
				break;
		}

		return this.icon;
	},

	activate: function() {
		this.open_new_window();
		this.state = Shell.AppState.RUNNING;
	},

	open_new_window: function() {
		if ((typeof this.exec).toLowerCase() === "string") {
			Util.spawnCommandLine(this.exec);
		} else {
			this.exec();
		}
	},

	/* FIXME copied from https://raw.github.com/seiflotfy/gnome-shell-zeitgeist-extension/master/zeitgeist-search@gnome-shell-extensions.gnome.org/docInfo.js */
	createThumb: function(size) {
		let icon = null;
		let pixbuf = null;
		let mtimeval = new GLib.TimeVal();
		Gio.file_new_for_uri(this.uri).query_info("time::modified", Gio.FileQueryInfoFlags.NONE, null).get_modification_time(mtimeval);
		let mtime = mtimeval.tv_sec;

		// check whether a thumb has been made
		let existing_thumb = thumbnail_factory.lookup(this.uri, mtime);

		// if not, make one
		if (existing_thumb === null) {
			// can we make one?
			if (thumbnail_factory.can_thumbnail(this.uri, this.mimetype, null))
			{
				// allegedly. let's try.
				pixbuf = thumbnail_factory.generate_thumbnail(this.uri, this.mimetype, mtime);
				if (pixbuf !== null)
				{
					thumbnail_factory.save_thumbnail(pixbuf, this.uri, mtime);
					// this may be excessive, reloading a newly created pixbuf, but it seems cleaner and more succinct to let ClutterTexture
					// handle it as a new file instead of writing our own routine to convert a pixbuf
					existing_thumb = thumbnail_factory.lookup(this.uri, mtime);
				}
			}
		}

		// if we can't make a thumbnail, choose a generic example
		if (existing_thumb === null) {
			icon = St.TextureCache.get_default().load_gicon(null, Shell.util_get_icon_for_uri(this.uri), size);
		} else {
			// don't need to bother with this pixbuf malarky if we've got the filename
			icon = new Clutter.Texture({filename: existing_thumb});
			icon.set_keep_aspect_ratio(true);
		}

		return icon;
	}
}